# Fase 1 — Fundação de dados do sistema de efeitos (somente banco)

Novo export confirmado: **75 cartas**. Esta fase **não toca em engine, UI, PvP
nem faz backfill**. Só cria estrutura de dados nova e colunas opcionais em
`cards`. Nada abaixo altera o comportamento atual de JxIA ou JxJ.

## Garantias desta fase

- `cards.effect_code` permanece intacto (coluna, constraint e valores).
- Nenhuma linha existente é alterada, deletada ou reescrita.
- Todas as novas colunas em `cards` são `NULL`-áveis, sem default de valor
  semântico — logo `select *` do engine continua funcionando.
- Nenhum arquivo em `src/` é modificado. O engine (`src/lib/tcg/duel.ts`),
  o motor autoritativo PvP (`src/lib/tcg/pvp-engine.server.ts`), as RPCs
  `tcg_pvp_*` e `tcg_finish_match` **não são tocados**.
- `card_tokens` é criada agora porque `SUMMON_TOKEN` precisa de uma FK estável
  para referenciar fichas nos parâmetros; nenhuma lógica de token é implementada.
- Migration idempotente: `create table if not exists`, `add column if not
  exists`, `drop policy if exists` antes de `create policy`.

## Colunas adicionadas em `cards`

| Coluna | Tipo | Uso |
| --- | --- | --- |
| `race` | text NULL | condições `TARGET_HAS(race=…)` |
| `affiliation` | text NULL | Marinha, Pirata, Revolucionário… |
| `crew` | text NULL | Void Imperium, Shapes of The Night… |
| `card_type` | text NULL | Espadachim, Atirador, Lutador, Suporte… |
| `gender` | text NULL | `MALE` / `FEMALE` / `OTHER` (Vera, Lucky Wali) |
| `abilities_migrated` | boolean NOT NULL default false | marca cartas já convertidas para `card_abilities` (usado no backfill da Fase 5) |

## Estrutura e relacionamentos

```text
cards (existente)
  └─1:N─> card_abilities (card_id, on delete cascade)
card_tokens (independente; referenciada por id dentro de effects.params)
effect_definitions (catálogo; code referenciado por effects[].code no jsonb)
```

## SQL completo — `docs/migrations/0044_tcg_effect_engine.md`

```sql
-- ========== 1. TAXONOMIA EM CARDS (todas nullable, legado preservado) ==========
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS race text;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS affiliation text;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS crew text;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS card_type text;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS abilities_migrated boolean NOT NULL DEFAULT false;

ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_gender_valid;
ALTER TABLE public.cards ADD CONSTRAINT cards_gender_valid
  CHECK (gender IS NULL OR gender IN ('MALE','FEMALE','OTHER'));

CREATE INDEX IF NOT EXISTS cards_race_idx        ON public.cards(race);
CREATE INDEX IF NOT EXISTS cards_affiliation_idx ON public.cards(affiliation);
CREATE INDEX IF NOT EXISTS cards_crew_idx        ON public.cards(crew);
CREATE INDEX IF NOT EXISTS cards_type_idx        ON public.cards(card_type);

-- ========== 2. CATÁLOGO DE MECÂNICAS ==========
CREATE TABLE IF NOT EXISTS public.effect_definitions (
  code             text PRIMARY KEY,
  label            text NOT NULL,
  description      text,
  category         text NOT NULL DEFAULT 'OTHER',
  allowed_triggers text[] NOT NULL DEFAULT '{}',
  allowed_targets  text[] NOT NULL DEFAULT '{}',
  params_schema    jsonb  NOT NULL DEFAULT '{}'::jsonb,
  implemented      boolean NOT NULL DEFAULT false,
  active           boolean NOT NULL DEFAULT true,
  sort_order       integer NOT NULL DEFAULT 100,
  created_at       timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.effect_definitions TO anon, authenticated;
GRANT ALL    ON public.effect_definitions TO service_role;
ALTER TABLE public.effect_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "effect_definitions public read" ON public.effect_definitions;
DROP POLICY IF EXISTS "effect_definitions admin write" ON public.effect_definitions;
CREATE POLICY "effect_definitions public read" ON public.effect_definitions
  FOR SELECT USING (true);
CREATE POLICY "effect_definitions admin write" ON public.effect_definitions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ========== 3. FICHAS (estrutura apenas; sem lógica) ==========
CREATE TABLE IF NOT EXISTS public.card_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  atk         integer NOT NULL DEFAULT 0 CHECK (atk >= 0),
  hp          integer NOT NULL DEFAULT 1 CHECK (hp  >= 1),
  keywords    text[] NOT NULL DEFAULT '{}',
  race        text,
  affiliation text,
  card_type   text,
  image_url   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.card_tokens TO anon, authenticated;
GRANT ALL    ON public.card_tokens TO service_role;
ALTER TABLE public.card_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "card_tokens public read" ON public.card_tokens;
DROP POLICY IF EXISTS "card_tokens admin write" ON public.card_tokens;
CREATE POLICY "card_tokens public read" ON public.card_tokens
  FOR SELECT USING (true);
CREATE POLICY "card_tokens admin write" ON public.card_tokens
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ========== 4. HABILIDADES POR CARTA ==========
CREATE TABLE IF NOT EXISTS public.card_abilities (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  name       text,
  trigger    text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  effects    jsonb NOT NULL DEFAULT '[]'::jsonb,
  once       text,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.card_abilities DROP CONSTRAINT IF EXISTS card_abilities_trigger_valid;
ALTER TABLE public.card_abilities ADD CONSTRAINT card_abilities_trigger_valid
  CHECK (trigger IN (
    'ON_PLAY','ON_ATTACK_DECLARED','ON_DAMAGE_DEALT','ON_DAMAGE_TAKEN',
    'ON_TARGETED','ON_KILL','ON_DEATH','ON_ANY_DEATH','ON_ALLY_PLAYED',
    'ON_TURN_START','ON_TURN_END','ON_OPPONENT_TURN_END',
    'PASSIVE','AURA','ACTIVATED'
  ));

ALTER TABLE public.card_abilities DROP CONSTRAINT IF EXISTS card_abilities_once_valid;
ALTER TABLE public.card_abilities ADD CONSTRAINT card_abilities_once_valid
  CHECK (once IS NULL OR once IN ('PER_TURN','PER_MATCH'));

ALTER TABLE public.card_abilities DROP CONSTRAINT IF EXISTS card_abilities_shape_valid;
ALTER TABLE public.card_abilities ADD CONSTRAINT card_abilities_shape_valid
  CHECK (jsonb_typeof(conditions) = 'array' AND jsonb_typeof(effects) = 'array');

CREATE INDEX IF NOT EXISTS card_abilities_card_idx    ON public.card_abilities(card_id, sort_order);
CREATE INDEX IF NOT EXISTS card_abilities_trigger_idx ON public.card_abilities(trigger);
CREATE INDEX IF NOT EXISTS card_abilities_effects_gin ON public.card_abilities USING gin (effects);

GRANT SELECT ON public.card_abilities TO anon, authenticated;
GRANT ALL    ON public.card_abilities TO service_role;
ALTER TABLE public.card_abilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "card_abilities public read" ON public.card_abilities;
DROP POLICY IF EXISTS "card_abilities admin write" ON public.card_abilities;
CREATE POLICY "card_abilities public read" ON public.card_abilities
  FOR SELECT USING (true);
CREATE POLICY "card_abilities admin write" ON public.card_abilities
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- updated_at automático
CREATE OR REPLACE FUNCTION public.touch_card_abilities()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS card_abilities_touch ON public.card_abilities;
CREATE TRIGGER card_abilities_touch BEFORE UPDATE ON public.card_abilities
  FOR EACH ROW EXECUTE FUNCTION public.touch_card_abilities();

-- ========== 5. SEED DO CATÁLOGO (idempotente) ==========
INSERT INTO public.effect_definitions
  (code, label, category, allowed_triggers, allowed_targets, params_schema, implemented, sort_order)
VALUES
 ('DAMAGE','Causar dano','DAMAGE','{ON_PLAY,ON_ATTACK_DECLARED,ON_DAMAGE_TAKEN,ON_KILL,ON_DEATH,ON_TURN_START,ON_TURN_END,ACTIVATED}','{ENEMY_CHOSEN,ALL_ENEMIES,ALL_OTHERS,ATTACK_TARGET,ATTACKER,ADJACENT_TARGET,N_ENEMIES_CHOSEN}','{"amount":{"type":"int","min":1,"required":true},"shots":{"type":"int","default":1},"ignore_guard":{"type":"bool","default":false},"ignore_stealth":{"type":"bool","default":false},"irreducible":{"type":"bool","default":false}}',false,10),
 ('HEAL','Curar HP','HEAL','{ON_PLAY,ON_KILL,ON_ANY_DEATH,ON_TURN_START,ON_TURN_END,ACTIVATED}','{SELF,ALLY_CHOSEN,ALL_ALLIES,ADJACENT_SELF,LOWEST_HP_ALLY}','{"amount":{"type":"int","min":1,"required":true}}',false,20),
 ('BUFF_ATK','Aumentar DMG','BUFF','{ON_PLAY,ON_KILL,ON_TARGETED,ON_ATTACK_DECLARED,AURA,ACTIVATED}','{SELF,ALLY_CHOSEN,ALL_ALLIES,ADJACENT_SELF}','{"amount":{"type":"int","min":1,"required":true},"duration":{"type":"enum","values":["INSTANT","END_OF_TURN","UNTIL_YOUR_NEXT_TURN","PERMANENT"],"default":"END_OF_TURN"}}',false,30),
 ('DEBUFF_ATK','Reduzir DMG','DEBUFF','{ON_PLAY,ON_ATTACK_DECLARED,ON_ANY_DEATH,AURA}','{ENEMY_CHOSEN,ALL_ENEMIES,ATTACK_TARGET,ATTACKER}','{"amount":{"type":"int","min":1,"required":true},"duration":{"type":"enum","values":["END_OF_TURN","UNTIL_YOUR_NEXT_TURN","PERMANENT"],"default":"END_OF_TURN"}}',false,40),
 ('BUFF_MAX_HP','Aumentar HP máximo','BUFF','{ON_PLAY,AURA,ACTIVATED}','{SELF,ALLY_CHOSEN,ALL_ALLIES,ADJACENT_SELF}','{"amount":{"type":"int","min":1,"required":true},"duration":{"type":"enum","values":["END_OF_TURN","PERMANENT"],"default":"PERMANENT"}}',false,50),
 ('SET_ATK_FROM_TARGET','Copiar DMG do alvo','BUFF','{ON_PLAY}','{ANY_CHOSEN}','{"duration":{"type":"enum","values":["END_OF_TURN","PERMANENT"],"default":"PERMANENT"}}',false,60),
 ('SWAP_STATS','Inverter DMG/HP','BUFF','{ACTIVATED}','{SELF}','{"duration":{"type":"enum","values":["END_OF_TURN","PERMANENT"],"default":"END_OF_TURN"}}',false,70),
 ('DESTROY','Destruir carta(s)','REMOVAL','{ON_PLAY,ACTIVATED}','{ENEMY_CHOSEN,ALL_ENEMIES,ALL_OTHERS}','{"max_cost":{"type":"int"},"race":{"type":"text"},"affiliation":{"type":"text"}}',false,80),
 ('BOUNCE','Devolver à mão','REMOVAL','{ON_PLAY,ON_TURN_START,ACTIVATED}','{ENEMY_CHOSEN,ALLY_CHOSEN}','{}',false,90),
 ('DRAW','Comprar carta','RESOURCE','{ON_PLAY,ON_DEATH,ON_ANY_DEATH,ON_TURN_START,ACTIVATED}','{SELF}','{"count":{"type":"int","min":1,"default":1}}',true,100),
 ('SCRY','Olhar topo do baralho','RESOURCE','{ON_TURN_START,ON_PLAY,ACTIVATED}','{SELF}','{"count":{"type":"int","min":1,"default":1}}',false,110),
 ('GAIN_AP','Ganhar PA','RESOURCE','{ON_PLAY,ON_TURN_START,ACTIVATED}','{SELF}','{"amount":{"type":"int","min":1,"default":1}}',true,120),
 ('TAX_COST','Aumentar custo inimigo','RESOURCE','{AURA}','{ALL_ENEMIES}','{"amount":{"type":"int","min":1,"default":1},"scope":{"type":"enum","values":["FIRST_CARD_PER_TURN","ALL_CARDS"],"default":"FIRST_CARD_PER_TURN"}}',false,130),
 ('SUMMON_TOKEN','Invocar ficha','SUMMON','{ON_PLAY,ACTIVATED}','{ADJACENT_SELF,TOKEN_SLOT_LEFT,TOKEN_SLOT_RIGHT}','{"token_slug":{"type":"token","required":true},"count":{"type":"int","min":1,"default":1}}',false,140),
 ('GRANT_KEYWORD','Conceder palavra-chave','KEYWORD','{ON_PLAY,ON_KILL,ON_ATTACK_DECLARED,ON_ALLY_PLAYED,PASSIVE,AURA,ACTIVATED}','{SELF,ALLY_CHOSEN,ANY_CHOSEN,ALL_ALLIES,ADJACENT_SELF}','{"keyword":{"type":"enum","values":["GUARD","STEALTH","RUSH","FLYING","IGNORE_GUARD","CANNOT_ATTACK","UNTARGETABLE","IRREDUCIBLE","FIRST_STRIKE","TRAMPLE"],"required":true},"duration":{"type":"enum","values":["END_OF_TURN","UNTIL_YOUR_NEXT_TURN","WHILE_IN_PLAY","PERMANENT"],"default":"WHILE_IN_PLAY"}}',false,150),
 ('REMOVE_KEYWORD','Remover palavra-chave','KEYWORD','{ON_PLAY,ON_ATTACK_DECLARED,AURA,ACTIVATED}','{ENEMY_CHOSEN,ALL_ENEMIES,ATTACK_TARGET,SELF}','{"keyword":{"type":"text","required":true},"duration":{"type":"enum","values":["END_OF_TURN","UNTIL_YOUR_NEXT_TURN","PERMANENT"],"default":"END_OF_TURN"}}',false,160),
 ('APPLY_STATUS','Aplicar condição','STATUS','{ON_PLAY,ON_ATTACK_DECLARED,ON_DAMAGE_DEALT}','{SELF,ENEMY_CHOSEN,ALL_ENEMIES,ATTACK_TARGET}','{"status":{"type":"enum","values":["SLEEP","POISON","IMMOBILIZED","DISTRACTED","NO_COUNTERATTACK"],"required":true},"turns":{"type":"int","min":1,"default":1}}',false,170),
 ('CLEANSE','Remover condições negativas','STATUS','{ON_PLAY,ON_DAMAGE_TAKEN,ON_TURN_START}','{SELF,ALLY_CHOSEN,ALL_ALLIES}','{"scope":{"type":"enum","values":["STATUSES","DEBUFFS","ALL"],"default":"ALL"}}',false,180),
 ('EXTRA_ATTACK','Ataques adicionais','COMBAT','{PASSIVE}','{SELF}','{"count":{"type":"int","min":1,"default":1}}',true,190),
 ('LIFESTEAL','Roubo de vida','COMBAT','{PASSIVE,ON_DAMAGE_DEALT}','{SELF}','{"ratio":{"type":"number","default":1}}',false,200),
 ('DAMAGE_REDUCTION','Reduzir dano recebido','DEFENSE','{PASSIVE,AURA}','{SELF,ALL_ALLIES}','{"amount":{"type":"int","min":1,"default":1},"type":{"type":"enum","values":["ANY","COMBAT","PHYSICAL"],"default":"COMBAT"}}',false,210),
 ('THORNS','Dano ao atacante','DEFENSE','{PASSIVE}','{SELF}','{"amount":{"type":"int","min":1,"default":1},"melee_only":{"type":"bool","default":true}}',false,220),
 ('TRAMPLE','Dano excedente ao jogador','COMBAT','{PASSIVE}','{SELF}','{}',false,230),
 ('SPLASH_DAMAGE','Dano em adjacentes','DAMAGE','{ON_ATTACK_DECLARED,ON_DAMAGE_DEALT}','{ADJACENT_TARGET}','{"amount":{"type":"int","min":1,"required":true}}',false,240),
 ('REDIRECT_ATTACK','Redirecionar ataque','DEFENSE','{ON_TARGETED,PASSIVE}','{SELF,ADJACENT_SELF}','{"to":{"type":"enum","values":["SELF","ADJACENT_ALLY"],"default":"ADJACENT_ALLY"}}',false,250),
 ('PROTECT_LINK','Proteger aliado','DEFENSE','{ON_PLAY}','{ALLY_CHOSEN}','{}',false,260),
 ('FIRST_STRIKE','Golpe primeiro','COMBAT','{PASSIVE}','{SELF}','{}',false,270),
 ('SELF_DAMAGE','Dano em si mesmo','DAMAGE','{ON_ATTACK_DECLARED,ON_DAMAGE_DEALT,ON_TURN_END}','{SELF}','{"amount":{"type":"int","min":1,"default":1},"irreducible":{"type":"bool","default":false}}',false,280),
 ('IMMUNE','Imunidade','DEFENSE','{PASSIVE}','{SELF}','{"to":{"type":"enum","values":["DEBUFF_ATK","SUPPORT_EFFECTS","FIRST_DIRECT_DAMAGE_PER_TURN"],"required":true}}',false,290),
 ('MODAL','Escolher 1 entre N','META','{ON_PLAY,ACTIVATED}','{SELF}','{"options":{"type":"ability[]","required":true}}',false,300)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  category = EXCLUDED.category,
  allowed_triggers = EXCLUDED.allowed_triggers,
  allowed_targets = EXCLUDED.allowed_targets,
  params_schema = EXCLUDED.params_schema,
  sort_order = EXCLUDED.sort_order;
```

`implemented = true` marca só os 3 efeitos com paridade direta no engine atual
(`DRAW`, `GAIN_AP`, `EXTRA_ATTACK`); os demais entram como catálogo até a Fase 2.

## Rollback — `docs/migrations/0044_tcg_effect_engine_rollback.md`

```sql
DROP TRIGGER IF EXISTS card_abilities_touch ON public.card_abilities;
DROP FUNCTION IF EXISTS public.touch_card_abilities();
DROP TABLE IF EXISTS public.card_abilities;
DROP TABLE IF EXISTS public.card_tokens;
DROP TABLE IF EXISTS public.effect_definitions;

ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_gender_valid;
ALTER TABLE public.cards DROP COLUMN IF EXISTS race;
ALTER TABLE public.cards DROP COLUMN IF EXISTS affiliation;
ALTER TABLE public.cards DROP COLUMN IF EXISTS crew;
ALTER TABLE public.cards DROP COLUMN IF EXISTS card_type;
ALTER TABLE public.cards DROP COLUMN IF EXISTS gender;
ALTER TABLE public.cards DROP COLUMN IF EXISTS abilities_migrated;
```

O rollback não afeta `effect_code`, coleções, baralhos, partidas nem ranking.

## Dados preservados

`cards` (incluindo `effect_code`, `atk`, `power`, `cost`, imagens),
`user_cards`, `decks`/`deck_cards`, `tcg_player_stats`, histórico de duelos,
carteira, conquistas e todo o subsistema `tcg_pvp_*` — nenhum deles é lido ou
escrito por esta migration.

## Entregável desta fase

Somente dois arquivos novos em `docs/migrations/`
(`0044_tcg_effect_engine.md` e `0044_tcg_effect_engine_rollback.md`) para você
rodar no SQL Editor. Nenhum arquivo de código é criado ou alterado.
