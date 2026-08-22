# Plano Técnico — Sistema de Efeitos do WOP TCG (Effect Engine v2)

Análise + arquitetura + plano faseado. **Nada será implementado nesta etapa.**

---

## 1. Auditoria da arquitetura atual

### 1.1 Motor de duelo (`src/lib/tcg/duel.ts`)
- **Estado**: `DuelState` puro em memória/JSONB — `you`/`foe` com `hp`, `ap`, `deck`, `hand`, `field[7]`, `log`, `turnCount`, `state_version = 1`.
- **Cartas entram em campo**: `playCard()` → desconta AP, remove da mão, chama `applyEffect()`.
- **Ataques**: `attackWith()` → valida `isValidTarget` (regra de Guarda hardcoded), aplica dano no alvo **e contra-ataque** (`attacker.ps -= victim.atk`), resolve mortes, dano direto no perfil.
- **Turnos**: `endTurn()` → `startTurn()` (reseta `attacked/ready`, +1 maxAP, compra 2).
- **Efeitos hoje**: 9 códigos hardcoded (`DRAW_1`, `GAIN_1_AP`, `HEAL_DEF_50`, `BUFF_ATK_25`, `BUFF_PS_30`, `SWAP_WITH_DEFENSE`, `DOUBLE_ATTACK`, `GUARD`) num único `switch` em `applyEffect`, **só no gatilho "ao jogar"**. Valores embutidos no nome do código. 1 efeito por carta (`cards.effect_code`).
- **Beta**: `toInPlay()` força `effect_code = "NONE"` — efeitos estão desligados.
- **IA**: `runAiTurn()` no mesmo arquivo, usa as mesmas funções puras.

### 1.2 Backend e segurança (PvP)
- **Autoridade no servidor**: `src/lib/tcg/pvp-engine.server.ts` executa `playCard/attackWith/endTurn/surrender` server-side com service role. Cliente só envia intenção (`PLAY/ATTACK/END_TURN/SURRENDER`).
- **Persistência**: `tcg_pvp_matches.state` (JSONB) com CAS por `version` via RPCs `tcg_pvp_lock_match` / `tcg_pvp_apply_state`. Visão redigida (mão/deck do oponente viram contagens) via `tcg_pvp_match_view`.
- **Recompensas**: `tcg_finish_match` RPC (XP/VR) — já protegida.
- **Conclusão de segurança**: o modelo atual já impede o cliente de "enviar dano". O novo sistema se encaixa no mesmo ponto: efeitos resolvem **dentro** das funções puras do motor, que no PvP rodam só no servidor.

### 1.3 Dados (Supabase)
- `cards`: `power` (HP), `atk`, `cost`, `effect_code`, `effect` (texto), `type`, `organization`, `race`, `status`. **Não existem** colunas de tripulação/família/gênero (a 0044 que as criava foi revertida).
- Não existem tabelas de efeitos nem de habilidades por carta.
- Admin (`/admin/woptcg/cartas`): 1 select hardcoded de `effect_code` + textarea livre.

### 1.4 Regras hardcoded a extrair
Guarda em `isValidTarget`/`hasGuard`; ataque duplo e `SWAP_WITH_DEFENSE` em `attackWith`/`playCard`; trava de ataque nos 2 primeiros turnos (`canAttackThisTurn`); contra-ataque universal; `ready` por turno.

---

## 2. Arquitetura proposta

### 2.1 Princípio
Motor continua **puramente funcional** (mesma disciplina que permite rodar no servidor PvP e na IA). Efeitos viram **dados** (catálogo no banco + habilidades por carta) interpretados por **registries** de código:

```
CARTA (cards) 1—N HABILIDADE (card_effects) N—1 EFEITO (effects catalog)
Habilidade = { trigger, conditions[], action: { effect_key, target, params } }
```

### 2.2 Banco de dados (proposta — a criar na Fase 2)

```sql
-- Catálogo central de efeitos (alimenta o SELECT do admin)
public.effects (
  id uuid pk default gen_random_uuid(),
  effect_key text unique not null,      -- 'DAMAGE_ON_PLAY', 'AURA_BUFF_ATK'...
  name text not null,                   -- 'Dano ao Entrar'
  description text not null,            -- texto exibido ao admin/jogador
  category text not null,               -- 'DANO','BUFF','AURA','STATUS','KEYWORD','ESPECIAL'
  default_trigger text not null,        -- gatilho padrão
  allowed_triggers text[] not null,
  allowed_targets text[] not null,
  params_schema jsonb not null,         -- {"amount":{"type":"int","min":1,"max":10}}
  active boolean not null default true,
  sort_order int not null default 0,
  created_at / updated_at timestamptz
)

-- Associação carta ↔ efeitos (até 3 slots, ordenados)
public.card_effects (
  id uuid pk default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  effect_id uuid not null references public.effects(id),
  trigger text,               -- override opcional do default
  target text,                -- override opcional
  params jsonb not null default '{}',   -- {"amount": 2}
  condition jsonb,            -- ex.: {"type":"CONTROLS_CARD","name":"Papa Morningstar"}
  unique (card_id, slot)
)

-- Status catalogado (referência/validação)
public.status_effects (
  status_key text pk, name text, description text,
  default_duration text, removable boolean
)
```

Grants: `SELECT` para `authenticated` (+`anon` só no catálogo `effects`), escrita via policy `has_role(auth.uid(),'admin')`, `ALL` para `service_role`. `cards.effect_code` permanece como legado até o backfill completo.

### 2.3 Event Engine (gatilhos)
Barramento `emit(state, event, ctx)` chamado dentro das funções existentes:

| Evento | Ponto de emissão |
| --- | --- |
| `CARD_PLAYED` | fim de `playCard` |
| `CARD_ATTACK_DECLARED` | início de `attackWith` (pré-dano) |
| `CARD_ATTACK_RESOLVED` | após dano/contra-ataque |
| `CARD_DAMAGED` / `CARD_HEALED` | dentro do pipeline `dealDamage`/`heal` |
| `CARD_DESTROYED` | remoção do campo (com `killer`) |
| `CARD_TARGETED` | ao validar alvo |
| `TURN_STARTED` / `TURN_ENDED` | `startTurn` / `endTurn` |
| `MATCH_STARTED` | criação do estado |

Cobertura dos 45 efeitos: `CARD_PLAYED` (12), gatilhos de ataque (7), `CARD_DESTROYED` (1), `TURN_ENDED` (2), passivos/auras avaliados continuamente (18), condicionais de presença (5).

### 2.4 Status Engine
`InPlayCard.statuses: { key, sourceUid, turnsLeft, expiresAt: 'TURN_START'|'TURN_END', data? }[]`

- **Ímpeto (RUSH)**: permanente na carta; permite atacar no turno em que entra.
- **Guarda**: keyword passiva (já existe, vira status/keyword formal).
- **Preguiça**: `CANNOT_ATTACK` com despertar por (a) início do 2º turno em campo ou (b) `CARD_DAMAGED` na própria carta.
- **Furtividade** — 3 variantes distintas, sem conflito:
  - `STEALTH_TEMP` (Furtividade Temporária): some no início do próximo turno do dono.
  - `STEALTH_UNTIL_ATTACK` (Furtividade E): não pode ser alvo; removida quando a própria carta ataca.
  - (futuro) `STEALTH`: permanente até ser removida por efeito.
- **Dormindo/Envenenado**: entram no catálogo `status_effects` para o efeito **Clean** remover (`removable=true`).

Durações: `INSTANT`, `END_OF_TURN`, `UNTIL_NEXT_TURN`, `N_TURNS`, `WHILE_IN_PLAY`, `PERMANENT`.

### 2.5 Effect Registry
```
src/lib/tcg/effects/
  events.ts       — tipos de evento + emit()
  registry.ts     — EFFECT_HANDLERS: Record<effect_key, handler>
  conditions.ts   — CONDITION_CHECKS: Record<tipo, check> (CONTROLS_CARD, TARGET_RACE, COST>=N...)
  targets.ts      — resolveTarget(state, ctx, target)
  status.ts       — grant/tick/remove/cleanse
  damage.ts       — dealDamage() único: redução → irredutível → thorns → morte → eventos
```
Adicionar efeito novo = 1 handler registrado + 1 linha em `effects` (SQL ou painel) → aparece automaticamente no SELECT do admin. Sem reestruturar o motor.

### 2.6 Segurança PvP
- Resolução de efeitos ocorre **dentro** das funções puras, que no PvP só rodam em `pvp-engine.server.ts`. Cliente nunca envia ATK/HP/status.
- Efeitos com alvo escolhido (`DMG Entrada 1`, `Paramecia da Arma`, `Cura e HP 2`) geram `pendingChoice` no estado; nova action autoritativa `RESOLVE_CHOICE` validada no servidor. Na IA, escolha automática.
- Snapshot de baralho JxJ passa a congelar também as habilidades das cartas (mudança de efeito pelo admin não afeta partida em curso).
- `ENGINE_STATE_VERSION` → 2: partidas em andamento com estado v1 são finalizadas/invalidadas na ativação.
- XP/VR: intocados (`tcg_finish_match` já valida servidor-side).

---

## 3. Classificação dos 45 efeitos

**Genéricos parametrizáveis (o motor ganha ~14 handlers e cobre a maioria):**

| Handler genérico | Efeitos atendidos (com params) |
| --- | --- |
| `DAMAGE_ON_PLAY amount/target` | DMG Entrada 1, Área Geral 2 (ALL_OTHERS), Dano Direto 1 (player) |
| `DAMAGE_ON_ATTACK amount/target` | Impacto Board 1 |
| `SPLASH_ON_ATTACK amount` | Dano Espaçado 2 |
| `DEBUFF_ATK_ON_PLAY amount/duration` | Debuff DMG T1 |
| `HEAL_ON_PLAY amount` (+condicional) | Regen Draku 2 |
| `BUFF_MAX_HP_ON_PLAY amount` (+cura) | Cura e HP 2, Amor Beluga (+2 ATK, condicional) |
| `BUFF_ATK amount/duration/target` | Buff Rev 1, Corte Silencioso (+2 temporário em si) |
| `AURA_BUFF_ATK filter/amount` | Lutador Geral +1, Buff C3 ATK, Aura +2 PR |
| `AURA_BUFF_HP filter/amount` | Muralha Lutador 1, Aura +2 PR |
| `DAMAGE_REDUCTION amount` | RD 1 |
| `THORNS amount` | Reflete 1 |
| `SELF_DAMAGE_EOT amount` | Doença 2 |
| `HEAL_EOT condicional` | Regen Custo 6 |
| `GRANT_STATUS status/duration` | Furtividade Temporária, Preguiça, Ímpeto (condicionais: Papa/Azazel/Barnab/Malva), Amor Beluga |
| `REMOVE_STATUS / CLEANSE` | Clean |
| `REMOVE_KEYWORD_ON_ATTACK keyword/duration` | Remove Guarda T |
| `COPY_ATK_ON_PLAY` | Paramecia da Arma |
| `ON_ANY_DEATH heal/buff` | Logia Sangue |

**Keywords/passivos (regra de targeting/combate, não efeito disparado):** Guarda, Fura-Guarta (IGNORE_GUARD), Vôo (IGNORE_GUARD + só alvo de Vôo/Atirador), Perfurador de Furtividade (PIERCE_STEALTH), Pacifista (CANNOT_ATTACK), Imunidade Debuff ATK, Ignorante (IMMUNE_SUPPORT), Cobertura (NO_COUNTER vs Lutador/Espadachim), Alta Voltagem (NO_REBOUND), Irredutível 1.

**Taxonômicos (dados, não motor):** Morningstar (família), Linhagem Híbrida TH (raça dupla), e os gatilhos condicionais `CONTROLS_CARD` (Papa/Azazel/Beluga/Malva/Barnab/Drakumira).

**Especiais (lógica própria pequena):** Preguiça (dupla condição de despertar), Ação de Troca (ação ativada 1x/partida — exige botão na UI + nova action PvP), Paramecia da Arma (escolha de alvo cópia).

**Nome "Fura-Guarta"**: mantido como está. Hoje não há nenhuma referência a esse nome no código/banco (cartas usam `effect_code`), então a correção futura para "Fura-Guarda" será só um `UPDATE` no catálogo — registro isso como tarefa separada a seu comando.

---

## 4. Plano de implementação por fases

### FASE 1 — Auditoria ✅ (esta entrega)
Sem alterações. Entrega: este plano.

### FASE 2 — Modelagem do banco
- Migration `0062_tcg_effects_catalog.md`: `effects`, `card_effects`, `status_effects` + grants/RLS + seed dos ~20 efeitos genéricos + keywords + status.
- Decisão sua: famílias (Morningstar etc.) viram **nova coluna `cards.family`** ou reutilizam `organization`? (Recomendo coluna nova.)
- Risco: baixo; tabelas novas, nada existente muda.

### FASE 3 — Effect Engine (núcleo puro)
- Novos arquivos `src/lib/tcg/effects/*` (events, registry, conditions, targets, status, damage).
- `InPlayCard` ganha `statuses[]`, `keywords[]`, `abilities[]` (congeladas no snapshot). `ENGINE_STATE_VERSION` → 2.
- Testes: vitest unitário por handler. Sem mudança de comportamento ainda (nenhuma carta terá habilidades cadastradas).

### FASE 4 — Integração do motor
- `duel.ts`: `playCard/attackWith/startTurn/endTurn` passam a emitir eventos; Guarda/ataque-duplo/contra-ataque migram para o pipeline novo mantendo comportamento idêntico.
- Remover o "NONE forçado" do beta **somente quando você aprovar** (cartas sem habilidades continuam sem efeito).
- Testes de regressão: replay de duelos JxIA comparando resultados antes/depois.

### FASE 5 — Status Engine
- Durações, expiração em TURN_START/TURN_END, remoção por Clean, interações Preguiça/Furtividades.
- Testes unitários de ciclo de vida de cada status.

### FASE 6 — Interface administrativa
- `/admin/woptcg/cartas`: substituir o select único por **Efeito 1/2/3** populados de `effects` (nome + descrição + categoria), form de parâmetros gerado de `params_schema`, campo de condição (ex.: "quando controla Papa Morningstar").
- CRUD mínimo do catálogo (ativar/desativar efeito). Admin nunca digita ID nem código.

### FASE 7 — Implementação dos 45 efeitos
- Seed SQL das habilidades das cartas existentes + handlers especiais (Preguiça, Troca, Cópia).
- Exibição ao jogador: descrições continuam ocultas no beta? (decisão sua).

### FASE 8 — Testes
- Suite vitest: 1+ teste por efeito, duelos simulados completos, teste do pipeline de dano.
- Partidas de validação JxIA em ambiente de teste.

### FASE 9 — Segurança/PvP
- Action `RESOLVE_CHOICE` + `pendingChoice` no estado; validação de alvo no servidor; snapshot de habilidades no `tcg_pvp_matches`.
- Auditoria: nenhum campo de combate aceito do cliente; `tcg_finish_match` intacta.

### FASE 10 — Migração/Deploy
- Rodar migrations em janela sem partidas ativas (ou drenar partidas v1), deploy Vercel, smoke test JxIA + JxJ.
- Rollback: manter `effect_code` legado até a Fase 10; script de rollback dedicado.

---

## 5. Decisões que preciso que você aprove

1. **Família/tripulação**: nova coluna `cards.family` (recomendado) ou reutilizar `organization`?
2. **Nomes das tabelas**: `effects` / `card_effects` / `status_effects` — aprova? (Seu exemplo usava `effects`.)
3. **Limite de 3 efeitos por carta** (slots 1–3) ou ilimitado ordenado? Recomendo 3 fixos, como seu mockup.
4. **Ativação gradual**: ligar o novo motor primeiro só para cartas com habilidades cadastradas (recomendado) mantendo o resto sem efeito durante o beta.
5. **Ação de Troca** (botão na carta): incluir no escopo inicial ou deixar para uma fase posterior? É o único efeito que exige nova interação de UI/PvP além de escolha de alvo.
6. Efeitos com alvo escolhido: no JxIA a IA escolhe automaticamente (heurística simples) — OK?
