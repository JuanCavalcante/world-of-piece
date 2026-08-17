# Análise arquitetural — Sistema de efeitos do WOP TCG

Análise completa (sem nenhuma alteração de código, banco ou migrations).
O documento detalhado ficou em `docs/tcg-effects-architecture.md`.

**Observação importante:** o export enviado contém **56 cartas**, não 75.
O mapeamento cobre essas 56; as demais precisam ser exportadas para completar.

## Diagnóstico do estado atual

`effect_code` hoje é um enum plano com valor embutido no nome
(`HEAL_DEF_50`, `BUFF_ATK_25`, `BUFF_PS_30`…), **um único efeito por carta**,
e apenas o gatilho "ao jogar". As cartas reais têm 1–3 habilidades, com
gatilhos variados (ao atacar, ao morrer, fim de turno, aura), condições
(raça, tripulação, custo, quantidade de aliados) e alvos escolhidos.
Nada disso é representável hoje.

## Arquitetura proposta

Cada carta passa a ter **N habilidades**, e cada habilidade é
`TRIGGER → CONDITIONS[] → EFFECTS[] (target + params)`.

- **14 gatilhos**: `ON_PLAY`, `ON_ATTACK_DECLARED`, `ON_DAMAGE_DEALT`,
  `ON_DAMAGE_TAKEN`, `ON_TARGETED`, `ON_KILL`, `ON_DEATH`, `ON_ANY_DEATH`,
  `ON_ALLY_PLAYED`, `ON_TURN_START`, `ON_TURN_END`, `ON_OPPONENT_TURN_END`,
  `PASSIVE`, `AURA`, `ACTIVATED`.
- **~28 efeitos parametrizados**: `DAMAGE`, `HEAL`, `BUFF_ATK`, `DEBUFF_ATK`,
  `BUFF_MAX_HP`, `DESTROY`, `BOUNCE`, `DRAW`, `SCRY`, `GAIN_AP`, `TAX_COST`,
  `SUMMON_TOKEN`, `GRANT_KEYWORD`, `REMOVE_KEYWORD`, `APPLY_STATUS`, `CLEANSE`,
  `EXTRA_ATTACK`, `LIFESTEAL`, `DAMAGE_REDUCTION`, `THORNS`, `TRAMPLE`,
  `SPLASH_DAMAGE`, `REDIRECT_ATTACK`, `PROTECT_LINK`, `FIRST_STRIKE`,
  `SET_ATK_FROM_TARGET`, `SWAP_STATS`, `SELF_DAMAGE`, `IMMUNE`, `MODAL`.
  Nada de `DAMAGE_30`/`DAMAGE_50` — a diferença vira `params.amount`.
- **Keywords/status**: GUARD, STEALTH, RUSH, FLYING, IGNORE_GUARD,
  CANNOT_ATTACK, UNTARGETABLE, IRREDUCIBLE, SLEEP, POISON, IMMOBILIZED,
  DISTRACTED, NO_COUNTERATTACK — com durações (`END_OF_TURN`,
  `UNTIL_YOUR_NEXT_TURN`, `N_TURNS`, `PERMANENT`).
- **Alvos**: SELF, ALLY_CHOSEN, ENEMY_CHOSEN, ALL_ENEMIES, ALL_OTHERS,
  ADJACENT_SELF, ADJACENT_TARGET, ATTACK_TARGET, ATTACKER, N_ENEMIES_CHOSEN…
- **Condições**: CONTROLS_CARD, CONTROLS_COUNT(raça/afiliação/tripulação/tipo),
  TARGET_HAS, TARGET_COST, TARGET_HP, TARGET_GENDER, TARGET_HAS_KEYWORD,
  SELF_HP_FULL, ONCE(PER_TURN|PER_MATCH).

Mapeamento dos códigos atuais: `HEAL_DEF_50→HEAL`, `BUFF_ATK_25→BUFF_ATK`,
`BUFF_PS_30→BUFF_MAX_HP`, `DRAW_1→DRAW`, `GAIN_1_AP→GAIN_AP`,
`SWAP_WITH_DEFENSE→GRANT_KEYWORD(RUSH)`, `DOUBLE_ATTACK→EXTRA_ATTACK`,
`GUARD→GRANT_KEYWORD(GUARD)`.

## Mecânicas que exigem trabalho especial no engine

Tokens/fichas, Voo (restrição de alvo por tipo), armadilhas reativas
(Caviar Beluga), contra-ataque + FIRST_STRIKE (hoje inexistente), efeitos
modais/Ação Rápida, TAX_COST, TRAMPLE, PROTECT_LINK e REDIRECT_ATTACK.
Também faltam colunas de taxonomia (raça, afiliação, tripulação, tipo, gênero).

## Banco (migrations propostas, ainda não escritas)

- `effect_definitions` — catálogo de mecânicas + `params_schema` (alimenta o admin).
- `card_abilities` — N habilidades por carta (`trigger`, `conditions` jsonb,
  `effects` jsonb, `once`, ordem).
- `card_tokens` — fichas invocáveis.
- `cards` += `race`, `affiliation`, `crew`, `card_type`, `gender`.
- Grants `select` para anon/authenticated, escrita só para admin/service_role.
- `cards.effect_code` mantido como legado durante a transição.

## Engine

Estado das cartas ganha `keywords`, `statuses`, `modifiers` e `abilities`;
entra um barramento de eventos (`emit`), um registro
`EFFECT_HANDLERS[code]`, pipeline único de dano, recálculo de auras e uma fila
de escolhas de alvo validada pelo servidor no PvP. `ENGINE_STATE_VERSION` vai
para 2.

## Painel Admin

Editor de habilidades em `/admin/woptcg/cartas`: lista ordenável de
habilidades, select de gatilho, construtor de condições, select de efeito +
alvo, formulário de parâmetros gerado a partir do `params_schema`, preview
textual e validação. Novas cartas passam a ser criadas sem tocar em código.

## Sugestão de fases (implementação futura)

1. Banco + taxonomia + catálogo de efeitos (sem mudar o jogo).
2. Refactor do engine para eventos/keywords/modificadores, com paridade dos 9
   efeitos atuais.
3. Admin builder.
4. Mecânicas especiais (tokens, voo, contra-ataque, traps, modais).
5. Backfill das 75 cartas.
