# Mapeamento dos 45 efeitos → Effect Engine v2

Como cadastrar cada efeito no admin (`/admin/woptcg/cartas` → seção **Efeitos**),
usando apenas o catálogo (`public.effects`) e parâmetros. Nenhum efeito exige
código novo, salvo onde indicado.

Legenda: **Efeito** = item do SELECT do admin · **Gatilho** · **Alvo** · **Params**.

## Dano

| # | Nome de jogo | Efeito | Gatilho | Alvo | Params |
| --- | --- | --- | --- | --- | --- |
| 1 | DMG Entrada 1 | `DAMAGE_ON_PLAY` | ON_PLAY | ENEMY_CHOSEN | `amount: 1` |
| 2 | Área Geral 2 | `DAMAGE_ON_PLAY` | ON_PLAY | ALL_OTHERS | `amount: 2` |
| 3 | Dano Direto 1 | `DAMAGE_PLAYER_ON_PLAY` | ON_PLAY | ENEMY_PLAYER | `amount: 1` |
| 4 | Impacto Board 1 | `DAMAGE_ON_ATTACK` | ON_ATTACK_DECLARED | ALL_OTHER_ENEMIES | `amount: 1` |
| 5 | Dano Espaçado 2 | `SPLASH_ON_ATTACK` | ON_ATTACK_RESOLVED | ADJACENT | `amount: 2` |
| 6 | Debuff DMG T1 | `DEBUFF_ATK` | ON_PLAY | ALL_ENEMIES | `amount: 1, duration: UNTIL_NEXT_TURN` |
| 7 | Doença 2 | `SELF_DAMAGE_EOT` | ON_END_TURN | SELF | `amount: 2` |
| 8 | Irredutível 1 | `IRREDUCIBLE_BONUS` | PASSIVE | SELF | `amount: 1` |
| 9 | RD 1 | `DAMAGE_REDUCTION` | PASSIVE | SELF | `amount: 1` |
| 10 | Reflete 1 | `THORNS` | PASSIVE | SELF | `amount: 1` |

## Buff, cura e auras

| # | Nome de jogo | Efeito | Gatilho | Alvo | Params |
| --- | --- | --- | --- | --- | --- |
| 11 | Regen Draku 2 | `HEAL_ON_PLAY` | ON_PLAY | SELF | `amount: 2` + condição `CONTROLS_CARD = Drakumira` |
| 12 | Cura e HP 2 | `BUFF_MAX_HP` | ON_PLAY | ALLY_CHOSEN | `amount: 2, also_heal: true` |
| 13 | Amor Beluga | `BUFF_MAX_HP` (slot 1) + `BUFF_ATK` (slot 2) | ON_PLAY | SELF | `amount: 2` + condição `CONTROLS_CARD = Beluga` |
| 14 | Buff Rev 1 | `BUFF_ATK` | ON_PLAY | ALLY_CHOSEN | `amount: 1, duration: PERMANENT` |
| 15 | Corte Silencioso | `BUFF_ATK` | ON_ATTACK_DECLARED | SELF | `amount: 2, duration: END_OF_TURN, grant_ignore_guard: true` |
| 16 | Lutador Geral +1 | `AURA_BUFF_ATK` | PASSIVE | AURA_FILTER | `amount: 1, classes: Lutador` |
| 17 | Buff C3 ATK | `AURA_BUFF_ATK` | PASSIVE | AURA_FILTER | `amount: 1, cost_min: 3` |
| 18 | Aura +2 PR (ATK) | `AURA_BUFF_ATK` | PASSIVE | AURA_FILTER | `amount: 2, organizations: Piratas Ruivos` |
| 19 | Aura +2 PR (HP) | `AURA_BUFF_MAX_HP` | PASSIVE | AURA_FILTER | `amount: 2, organizations: Piratas Ruivos` |
| 20 | Muralha Lutador 1 | `AURA_BUFF_MAX_HP` | PASSIVE | AURA_FILTER | `amount: 1, classes: Lutador` |
| 21 | Regen Custo 6 | `HEAL_SELF_EOT` | ON_END_TURN | SELF | `amount: 1` + condição `CONTROLS_COST_MIN = 6` |
| 22 | Paramecia da Arma | `COPY_ATK_ON_PLAY` | ON_PLAY | ANY_CHOSEN | — |
| 23 | Logia Sangue | `ON_ANY_DEATH_TRIGGER` | ON_ANY_DEATH | SELF | `heal_amount: 1, buff_amount: 1` |

## Status

| # | Nome de jogo | Efeito | Gatilho | Alvo | Params |
| --- | --- | --- | --- | --- | --- |
| 24 | Furtividade Temporária | `GRANT_STATUS` | ON_PLAY | SELF | `status: STEALTH_TEMP, duration: UNTIL_NEXT_TURN` |
| 25 | Furtividade E | `GRANT_STATUS` | ON_PLAY | SELF | `status: STEALTH_UNTIL_ATTACK, duration: WHILE_IN_PLAY` |
| 26 | Furtividade | `GRANT_STATUS` | ON_PLAY | SELF | `status: STEALTH, duration: WHILE_IN_PLAY` |
| 27 | Preguiça | `GRANT_STATUS` | ON_PLAY | SELF | `status: LAZY, duration: WHILE_IN_PLAY` |
| 28 | Sono aplicado | `GRANT_STATUS` | ON_PLAY | ENEMY_CHOSEN | `status: SLEEP, duration: WHILE_IN_PLAY` |
| 29 | Veneno 1 | `GRANT_STATUS` | ON_PLAY | ENEMY_CHOSEN | `status: POISON, amount: 1, duration: PERMANENT` |
| 30 | Imobilizar | `GRANT_STATUS` | ON_PLAY | ENEMY_CHOSEN | `status: IMMOBILIZED, duration: UNTIL_NEXT_TURN` |
| 31 | Ímpeto (Papa) | `CONDITIONAL_KEYWORD` | PASSIVE | SELF | `keyword: RUSH` + condição `CONTROLS_CARD = Papa Morningstar` |
| 32 | Ímpeto (Azazel) | `CONDITIONAL_KEYWORD` | PASSIVE | SELF | `keyword: RUSH` + condição `CONTROLS_CARD = Azazel` |
| 33 | Ímpeto (Barnab) | `CONDITIONAL_KEYWORD` | PASSIVE | SELF | `keyword: RUSH` + condição `CONTROLS_CARD = Barnab` |
| 34 | Ímpeto (Malva) | `CONDITIONAL_KEYWORD` | PASSIVE | SELF | `keyword: RUSH` + condição `CONTROLS_CARD = Malva` |
| 35 | Clean | `CLEANSE` | ON_PLAY | ALLY_CHOSEN | — |
| 36 | Remove Guarda T | `REMOVE_GUARD_ON_ATTACK` | ON_ATTACK_RESOLVED | ALL_ENEMIES | `duration: UNTIL_NEXT_TURN` |
| 37 | Imunidade Debuff ATK | `KEYWORD` | PASSIVE | SELF | `keyword: IMMUNE_DEBUFF_ATK` |
| 38 | Imunidade Preguiça | `IMMUNE_STATUS` | PASSIVE | SELF | `status: LAZY` |

## Palavras-chave de combate

| # | Nome de jogo | Efeito | Params |
| --- | --- | --- | --- |
| 39 | Guarda | `KEYWORD` | `keyword: GUARD` |
| 40 | Fura-Guarta | `KEYWORD` | `keyword: IGNORE_GUARD` |
| 41 | Vôo | `KEYWORD` | `keyword: FLYING` |
| 42 | Perfurador de Furtividade | `KEYWORD` | `keyword: PIERCE_STEALTH` |
| 43 | Pacifista | `KEYWORD` | `keyword: CANNOT_ATTACK` |
| 44 | Ignorante | `KEYWORD` | `keyword: IMMUNE_SUPPORT` |
| 45 | Alta Voltagem | `KEYWORD` | `keyword: NO_REBOUND` |
| 45b | Cobertura | `KEYWORD` | `keyword: NO_COUNTER_CLASSES, classes: Lutador,Espadachim` |

## Fora do escopo desta fase

- **Ação de Troca** (Gemina/Fusionados): exige ação ativada na UI e nova ação
  autoritativa no PvP — fase posterior, conforme decidido.
- **Taxonomia**: Morningstar usa `cards.family`; Linhagem Híbrida TH usa `cards.race`
  com duas raças separadas por vírgula (as condições `CONTROLS_RACE`/`CONTROLS_FAMILY`
  já leem esses campos).
