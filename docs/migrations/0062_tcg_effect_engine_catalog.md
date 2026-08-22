# 0062 — Effect Engine v2: família, catálogo de efeitos e status

Migration **aditiva e lock-safe** (estilo 0059): nenhuma coluna/tabela existente é
alterada ou removida. Não exige locks longos. Executada via Management API.

Ordem de execução (blocos autônomos, nunca dentro de uma única transação):

## Bloco 1 — taxonomia: cards.family

```sql
set lock_timeout = '5s';
alter table public.cards add column if not exists family text;
```

## Bloco 2 — tabelas + grants + RLS

```sql
set lock_timeout = '5s';

-- ============ CATÁLOGO DE STATUS ============
create table if not exists public.status_effects (
  id uuid primary key default gen_random_uuid(),
  status_key text not null unique,
  name text not null,
  description text not null default '',
  stackable boolean not null default false,
  created_at timestamptz not null default now()
);

grant select on public.status_effects to anon, authenticated;
grant all on public.status_effects to service_role;
grant insert, update, delete on public.status_effects to authenticated;

alter table public.status_effects enable row level security;

drop policy if exists "status_effects public read" on public.status_effects;
drop policy if exists "status_effects admin write" on public.status_effects;

create policy "status_effects public read"
  on public.status_effects for select using (true);

create policy "status_effects admin write"
  on public.status_effects for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ CATÁLOGO DE EFEITOS ============
create table if not exists public.effects (
  id uuid primary key default gen_random_uuid(),
  effect_key text not null unique,
  name text not null,
  description text not null default '',
  category text not null default 'DANO',
  default_trigger text not null default 'ON_PLAY',
  allowed_triggers text[] not null default '{ON_PLAY}',
  allowed_targets text[] not null default '{SELF}',
  params_schema jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.effects to anon, authenticated;
grant insert, update, delete on public.effects to authenticated;
grant all on public.effects to service_role;

alter table public.effects enable row level security;

drop policy if exists "effects public read" on public.effects;
drop policy if exists "effects admin write" on public.effects;

create policy "effects public read"
  on public.effects for select using (true);

create policy "effects admin write"
  on public.effects for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ EFEITOS ASSOCIADOS ÀS CARTAS (3 slots fixos) ============
create table if not exists public.card_effects (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  effect_id uuid not null references public.effects(id) on delete restrict,
  trigger_code text,
  target_mode text,
  condition_type text not null default 'NONE',
  condition_value text,
  params jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (card_id, slot)
);

create index if not exists card_effects_card_idx on public.card_effects(card_id);

grant select on public.card_effects to anon, authenticated;
grant insert, update, delete on public.card_effects to authenticated;
grant all on public.card_effects to service_role;

alter table public.card_effects enable row level security;

drop policy if exists "card_effects public read" on public.card_effects;
drop policy if exists "card_effects admin write" on public.card_effects;

create policy "card_effects public read"
  on public.card_effects for select using (true);

create policy "card_effects admin write"
  on public.card_effects for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
```

## Bloco 3 — seed do catálogo de status

```sql
insert into public.status_effects (status_key, name, description, stackable) values
  ('RUSH',                  'Ímpeto',                    'Pode atacar no turno em que entra em campo.', false),
  ('GUARD',                 'Guarda',                    'O inimigo é obrigado a atacar esta carta.', false),
  ('STEALTH_UNTIL_ATTACK',  'Furtividade (até atacar)',  'Não pode ser alvo de ataques até atacar pela primeira vez.', false),
  ('STEALTH_TEMP',          'Furtividade temporária',    'Não pode ser alvo de ataques até o próximo turno do dono.', false),
  ('STEALTH',               'Furtividade',               'Não pode ser alvo de ataques.', false),
  ('LAZY',                  'Preguiça',                  'Não pode atacar. Desperta ao sofrer dano ou no 2º turno do dono em campo.', false),
  ('SLEEP',                 'Sono',                      'Não pode atacar nem ser alvo de ataques. Desperta ao sofrer dano.', false),
  ('POISON',                'Envenenamento',             'Sofre dano no fim de cada turno do dono.', true),
  ('IMMOBILIZED',           'Imobilizado',               'Não pode atacar até o próximo turno do dono.', false),
  ('DISTRACTED',            'Distraído',                 'Não pode atacar até ser atacado.', false)
on conflict (status_key) do nothing;
```

## Bloco 4 — seed do catálogo de efeitos (handlers genéricos)

```sql
insert into public.effects (effect_key, name, description, category, default_trigger, allowed_triggers, allowed_targets, params_schema, sort_order) values
-- DANO
('DAMAGE_ON_PLAY','Dano ao Entrar','Ao entrar em campo, causa dano a cartas inimigas (alvo escolhido ou todas).','DANO','ON_PLAY','{ON_PLAY}','{ENEMY_CHOSEN,ALL_ENEMIES,ALL_OTHERS}','{"amount":{"type":"int","min":1,"max":99,"default":1,"label":"Dano"},"ignore_guard":{"type":"bool","default":false,"label":"Ignora Guarda"}}',10),
('DAMAGE_PLAYER_ON_PLAY','Dano Direto ao Perfil','Ao entrar em campo, causa dano direto ao jogador adversário.','DANO','ON_PLAY','{ON_PLAY}','{ENEMY_PLAYER}','{"amount":{"type":"int","min":1,"max":99,"default":2,"label":"Dano"}}',20),
('DAMAGE_ON_ATTACK','Dano em Área ao Atacar','Ao declarar ataque, causa dano a todas as outras cartas inimigas.','DANO','ON_ATTACK_DECLARED','{ON_ATTACK_DECLARED}','{ALL_OTHER_ENEMIES}','{"amount":{"type":"int","min":1,"max":99,"default":1,"label":"Dano"}}',30),
('SPLASH_ON_ATTACK','Dano em Adjacentes','Após atacar, causa dano às cartas adjacentes ao alvo.','DANO','ON_ATTACK_RESOLVED','{ON_ATTACK_RESOLVED}','{ADJACENT}','{"amount":{"type":"int","min":1,"max":99,"default":1,"label":"Dano"}}',40),
('DEBUFF_ATK','Reduzir ATK','Reduz o ATK de cartas inimigas.','DANO','ON_PLAY','{ON_PLAY}','{ALL_ENEMIES,ENEMY_CHOSEN}','{"amount":{"type":"int","min":1,"max":99,"default":2,"label":"Redução"},"duration":{"type":"enum","options":["END_OF_TURN","UNTIL_NEXT_TURN","PERMANENT"],"default":"END_OF_TURN","label":"Duração"}}',50),
('SELF_DAMAGE_EOT','Dano a Si no Fim do Turno','No fim do turno do dono, esta carta sofre dano.','DANO','ON_END_TURN','{ON_END_TURN}','{SELF}','{"amount":{"type":"int","min":1,"max":99,"default":1,"label":"Dano"}}',60),
('IRREDUCIBLE_BONUS','Dano Irredutível Adicional','Os ataques desta carta causam dano adicional que ignora reduções.','DANO','PASSIVE','{PASSIVE}','{SELF}','{"amount":{"type":"int","min":1,"max":99,"default":1,"label":"Dano irredutível"}}',70),
('DAMAGE_REDUCTION','Redução de Dano','Reduz o dano recebido (não reduz dano irredutível).','DANO','PASSIVE','{PASSIVE}','{SELF}','{"amount":{"type":"int","min":1,"max":99,"default":1,"label":"Redução"}}',80),
('THORNS','Reflexo de Dano','Quando atacada, causa dano adicional de volta ao atacante.','DANO','PASSIVE','{PASSIVE}','{SELF}','{"amount":{"type":"int","min":1,"max":99,"default":1,"label":"Dano refletido"}}',90),
-- BUFF / CURA
('HEAL_ON_PLAY','Cura ao Entrar','Ao entrar em campo, recupera HP de uma carta aliada.','BUFF','ON_PLAY','{ON_PLAY}','{ALLY_CHOSEN,SELF,ALL_ALLIES}','{"amount":{"type":"int","min":1,"max":999,"default":1,"label":"Cura"}}',100),
('BUFF_MAX_HP','Aumentar HP Máximo','Aumenta o HP máximo de cartas aliadas.','BUFF','ON_PLAY','{ON_PLAY}','{ALLY_CHOSEN,SELF,ALL_ALLIES}','{"amount":{"type":"int","min":1,"max":999,"default":1,"label":"HP máximo"},"duration":{"type":"enum","options":["END_OF_TURN","UNTIL_NEXT_TURN","PERMANENT"],"default":"PERMANENT","label":"Duração"},"also_heal":{"type":"bool","default":true,"label":"Também cura"}}',110),
('BUFF_ATK','Aumentar ATK','Aumenta o ATK de uma carta aliada ou dela mesma.','BUFF','ON_PLAY','{ON_PLAY,ON_ATTACK_DECLARED}','{SELF,ALLY_CHOSEN}','{"amount":{"type":"int","min":1,"max":99,"default":2,"label":"ATK"},"duration":{"type":"enum","options":["END_OF_TURN","UNTIL_NEXT_TURN","PERMANENT"],"default":"PERMANENT","label":"Duração"}}',120),
('AURA_BUFF_ATK','Aura de ATK','Enquanto em campo, concede ATK a aliados que combinam com o filtro.','BUFF','PASSIVE','{PASSIVE}','{AURA_FILTER}','{"amount":{"type":"int","min":1,"max":99,"default":1,"label":"ATK"},"classes":{"type":"text","label":"Classes (separadas por vírgula)"},"races":{"type":"text","label":"Raças"},"organizations":{"type":"text","label":"Organizações"},"families":{"type":"text","label":"Famílias"},"cost_min":{"type":"int","label":"Custo mínimo"},"cost_max":{"type":"int","label":"Custo máximo"},"include_self":{"type":"bool","default":false,"label":"Inclui a própria carta"}}',130),
('AURA_BUFF_MAX_HP','Aura de HP Máximo','Enquanto em campo, aumenta o HP máximo de aliados que combinam com o filtro.','BUFF','PASSIVE','{PASSIVE}','{AURA_FILTER}','{"amount":{"type":"int","min":1,"max":99,"default":1,"label":"HP máximo"},"classes":{"type":"text","label":"Classes (separadas por vírgula)"},"races":{"type":"text","label":"Raças"},"organizations":{"type":"text","label":"Organizações"},"families":{"type":"text","label":"Famílias"},"cost_min":{"type":"int","label":"Custo mínimo"},"cost_max":{"type":"int","label":"Custo máximo"},"include_self":{"type":"bool","default":false,"label":"Inclui a própria carta"}}',140),
('HEAL_SELF_EOT','Regeneração no Fim do Turno','No fim do turno do dono, esta carta recupera HP.','BUFF','ON_END_TURN','{ON_END_TURN}','{SELF}','{"amount":{"type":"int","min":1,"max":99,"default":1,"label":"Cura"}}',150),
('COPY_ATK_ON_PLAY','Copiar ATK','Ao entrar em campo, copia o ATK de uma carta em campo.','BUFF','ON_PLAY','{ON_PLAY}','{ANY_CHOSEN}','{}',160),
-- STATUS
('GRANT_STATUS','Conceder Status','Concede um status à carta (ex.: Ímpeto, Furtividade, Preguiça, Guarda).','STATUS','ON_PLAY','{ON_PLAY}','{SELF,ALLY_CHOSEN}','{"status":{"type":"enum","options":["RUSH","GUARD","STEALTH_UNTIL_ATTACK","STEALTH_TEMP","STEALTH","LAZY","SLEEP","POISON","IMMOBILIZED","DISTRACTED"],"default":"RUSH","label":"Status"},"duration":{"type":"enum","options":["PERMANENT","UNTIL_NEXT_TURN","END_OF_TURN"],"default":"PERMANENT","label":"Duração"}}',170),
('CONDITIONAL_KEYWORD','Palavra-chave Condicional','Enquanto a condição for verdadeira, esta carta possui uma palavra-chave (ex.: Ímpeto se controlar carta X).','STATUS','PASSIVE','{PASSIVE}','{SELF}','{"keyword":{"type":"enum","options":["RUSH","GUARD","IGNORE_GUARD","IMMUNE_DEBUFF_ATK"],"default":"RUSH","label":"Palavra-chave"}}',180),
('CLEANSE','Remover Condições','Remove condições/status negativos de cartas aliadas.','STATUS','ON_PLAY','{ON_PLAY}','{SELF,ALLY_CHOSEN,ALL_ALLIES}','{}',190),
('REMOVE_GUARD_ON_ATTACK','Remover Guarda ao Atacar','Após atacar, remove Guarda das cartas inimigas até o próximo turno.','STATUS','ON_ATTACK_RESOLVED','{ON_ATTACK_RESOLVED}','{ALL_ENEMIES}','{"duration":{"type":"enum","options":["UNTIL_NEXT_TURN","END_OF_TURN"],"default":"UNTIL_NEXT_TURN","label":"Duração"}}',200),
('IMMUNE_STATUS','Imunidade a Status','Esta carta é imune a um status específico (pode exigir condição).','STATUS','PASSIVE','{PASSIVE}','{SELF}','{"status":{"type":"enum","options":["LAZY","SLEEP","POISON","IMMOBILIZED","DISTRACTED"],"default":"LAZY","label":"Status imune"}}',210),
('KEYWORD','Palavra-chave','Concede uma palavra-chave passiva à carta.','STATUS','PASSIVE','{PASSIVE}','{SELF}','{"keyword":{"type":"enum","options":["GUARD","IGNORE_GUARD","FLYING","PIERCE_STEALTH","CANNOT_ATTACK","IMMUNE_DEBUFF_ATK","IMMUNE_SUPPORT","NO_REBOUND","NO_COUNTER_CLASSES"],"default":"GUARD","label":"Palavra-chave"},"classes":{"type":"text","label":"Classes (para Cobertura, separadas por vírgula)"}}',220),
-- ESPECIAL
('ON_ANY_DEATH_TRIGGER','Reação a Destruição','Quando qualquer carta em campo é destruída, ativa bônus nesta carta (ex.: Logia Sangue).','ESPECIAL','ON_ANY_DEATH','{ON_ANY_DEATH}','{SELF}','{"heal_amount":{"type":"int","min":0,"max":99,"default":0,"label":"Cura"},"buff_amount":{"type":"int","min":0,"max":99,"default":0,"label":"ATK"}}',230)
on conflict (effect_key) do nothing;
```

## Notas

- `effects` e `card_effects` têm leitura pública (as habilidades de uma carta são
  informação pública do jogo, como o texto da carta); escrita apenas admin via RLS.
- A ativação é **gradual**: o motor novo só processa cartas que possuam linhas em
  `card_effects`. Cartas sem associação seguem exatamente o comportamento atual
  (`effect_code` legado, hoje forçado a `NONE` no beta).
- `cards.family` é livre (ex.: `Morningstar`) e alimenta condições/auras.
- "Ação de Troca" (Gemina e Fusionados) **não** faz parte desta fase.
