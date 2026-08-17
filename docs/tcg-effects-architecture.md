# WOP TCG — Arquitetura de Efeitos (análise, sem implementação)

> Base: export enviado pelo usuário. O arquivo contém **56 cartas** (não 75) —
> as demais precisam ser exportadas para completar o mapeamento.

## 1. Estado atual do engine (`src/lib/tcg/duel.ts`)

`effect_code` é hoje um enum plano, 1 efeito por carta, sem parâmetros:

`NONE, DRAW_1, GAIN_1_AP, HEAL_DEF_50, BUFF_ATK_25, BUFF_PS_30, SWAP_WITH_DEFENSE, DOUBLE_ATTACK, GUARD`

Limitações estruturais:

- valor embutido no código (`_50`, `_25`, `_30`) → não parametrizável;
- uma única habilidade por carta (as cartas reais têm 1–3);
- só existe o gatilho "ao jogar" (`applyEffect` chamado em `playCard`) e
  a keyword `GUARD` lida em `isValidTarget`;
- não há keywords, status temporários, duração, adjacência, invocação de
  fichas, aura, nem condições (raça/afiliação/custo).

## 2. Modelo proposto: TRIGGER → CONDITION → EFFECT(PARAMS) → TARGET

Uma carta passa a ter **N habilidades**. Cada habilidade:

```jsonc
{
  "name": "Face Demoníaca",
  "trigger": "ON_PLAY",
  "conditions": [{ "type": "CONTROLS_COUNT", "group": "affiliation", "value": "MARINHA", "op": ">=", "n": 1 }],
  "effects": [
    { "code": "DEBUFF_ATK", "target": "ALL_ENEMIES", "params": { "amount": 1, "duration": "UNTIL_YOUR_NEXT_TURN" } }
  ],
  "once": "PER_TURN"
}
```

### 2.1 Gatilhos (TRIGGER)

| Código | Quando dispara |
| --- | --- |
| `ON_PLAY` | carta entra em campo ("Ao Entrar") |
| `ON_ATTACK_DECLARED` | ao declarar ataque, antes do dano |
| `ON_DAMAGE_DEALT` | após causar dano |
| `ON_DAMAGE_TAKEN` | ao receber dano |
| `ON_TARGETED` | ao ser escolhida como alvo |
| `ON_KILL` | ao destruir uma carta |
| `ON_DEATH` | quando esta carta é destruída |
| `ON_ANY_DEATH` | qualquer carta destruída (filtrável por lado) |
| `ON_ALLY_PLAYED` | outro aliado entra em campo |
| `ON_TURN_START` / `ON_TURN_END` | início/fim do seu turno |
| `ON_OPPONENT_TURN_END` | fim do turno inimigo (venenos) |
| `PASSIVE` | estado permanente enquanto em campo (keywords, redução de dano) |
| `AURA` | modificador contínuo sobre outras cartas |
| `ACTIVATED` | "Ação Rápida" — botão na carta, custo opcional em PA |

### 2.2 Efeitos (EFFECT) — catálogo proposto

| `effect_code` | Mecânica | Parâmetros |
| --- | --- | --- |
| `DAMAGE` | dano a alvo(s) | `amount`, `shots?`, `ignore_guard?`, `ignore_stealth?`, `irreducible?` |
| `HEAL` | cura HP atual | `amount` |
| `BUFF_ATK` / `DEBUFF_ATK` | altera DMG | `amount`, `duration` |
| `BUFF_MAX_HP` | +HP máximo (cura junto) | `amount`, `duration` |
| `SET_ATK_FROM_TARGET` | copia DMG de outra carta | `duration` |
| `SWAP_STATS` | inverte DMG/HP | `duration` |
| `DESTROY` | destrói alvo(s) | `filter` (custo, raça…) |
| `BOUNCE` | devolve carta à mão | — |
| `DRAW` | compra cartas | `count` |
| `SCRY` | olha topo do deck, pode enviar ao fundo | `count` |
| `GAIN_AP` | ganha PA | `amount` |
| `TAX_COST` | aumenta custo das cartas do oponente | `amount`, `scope` (1ª carta/turno) |
| `SUMMON_TOKEN` | invoca ficha | `token_id`, `slots` (esq/dir/adjacente), `count` |
| `GRANT_KEYWORD` / `REMOVE_KEYWORD` | concede/remove keyword | `keyword`, `duration` |
| `APPLY_STATUS` | aplica status | `status`, `turns` |
| `CLEANSE` | remove status/debuffs | `scope` |
| `EXTRA_ATTACK` | ataques adicionais | `count` |
| `LIFESTEAL` | cura = dano causado | `ratio` |
| `DAMAGE_REDUCTION` | reduz dano recebido | `amount`, `type` (combate/físico/qualquer) |
| `THORNS` | dano ao atacante | `amount`, `melee_only?` |
| `TRAMPLE` | excedente vai ao jogador | — |
| `SPLASH_DAMAGE` | dano a adjacentes do alvo | `amount` |
| `REDIRECT_ATTACK` | redireciona ataque | `to` (adjacente/self) |
| `PROTECT_LINK` | vira alvo obrigatório de uma carta | `target` |
| `FIRST_STRIKE` | ataca primeiro; sem contra-ataque se matar | — |
| `SELF_DAMAGE` | dano no próprio | `amount` |
| `IMMUNE` | imunidade | `to` (debuff_atk, suporte, 1º dano/turno) |
| `MODAL` | jogador escolhe 1 entre N sub-habilidades | `options[]` |

### 2.3 Keywords / status (usados por `GRANT_KEYWORD` e `APPLY_STATUS`)

`GUARD`, `STEALTH` (Furtividade), `RUSH` (Ímpeto), `FLYING` (Voo),
`IGNORE_GUARD`, `CANNOT_ATTACK`, `UNTARGETABLE`, `IRREDUCIBLE`,
`SLEEP` (Dormindo), `POISON` (Envenenada), `IMMOBILIZED`, `DISTRACTED`,
`NO_COUNTERATTACK` (paralisia de contra-ataque).

Durações: `INSTANT`, `END_OF_TURN`, `UNTIL_YOUR_NEXT_TURN`, `N_TURNS`,
`WHILE_IN_PLAY`, `PERMANENT`.

### 2.4 Seletores de alvo (TARGET)

`SELF`, `ALLY_CHOSEN`, `ENEMY_CHOSEN`, `ANY_CHOSEN`, `ALL_ALLIES`,
`ALL_ENEMIES`, `ALL_OTHERS`, `ADJACENT_SELF`, `ADJACENT_TARGET`,
`ATTACK_TARGET`, `ATTACKER`, `LOWEST_HP_ALLY`, `N_ENEMIES_CHOSEN`,
`TOKEN_SLOT_LEFT/RIGHT`.

### 2.5 Condições (CONDITION)

| Tipo | Params |
| --- | --- |
| `CONTROLS_CARD` | `card_id` / `card_name` |
| `CONTROLS_COUNT` | `group` (race/affiliation/crew/type), `value`, `op`, `n` |
| `TARGET_HAS` | `group`, `value` |
| `TARGET_COST` | `op`, `value` |
| `TARGET_HP` | `op`, `value` |
| `TARGET_HAS_KEYWORD` | `keyword` |
| `TARGET_GENDER` | `male` / `female` |
| `SELF_HP_FULL` | — |
| `HAND_SIZE` / `FIELD_COUNT` | `op`, `value` |
| `ONCE` | `PER_TURN` / `PER_MATCH` |

Efeitos condicionais "se X então bônus" viram uma **segunda entrada de effect**
com `conditions` próprias (ex.: Kara Rockbell = `HEAL 3` + `BUFF_ATK 1` com
`TARGET_HAS race=Oni`).

## 3. Mapeamento das cartas (56 exportadas)

Formato: carta → habilidades (`TRIGGER: EFFECT(params)`).

| Carta | Habilidades mapeadas |
| --- | --- |
| 02 - The Second | PASSIVE: DAMAGE_REDUCTION(1); ON_ATTACK_DECLARED: APPLY_STATUS(NO_COUNTERATTACK) em ATTACK_TARGET; ON_PLAY: GRANT_KEYWORD(STEALTH, UNTIL_YOUR_NEXT_TURN) |
| Abaddon Stn | ON_PLAY: APPLY_STATUS(SLEEP,1) [cond: !CONTROLS_COUNT(crew=Morningstar)]; ON_DAMAGE_TAKEN: CLEANSE(SLEEP); primeiro ataque pós-despertar: BUFF_ATK(2,INSTANT)+GRANT_KEYWORD(IGNORE_GUARD) |
| Agaroth Jones | ON_PLAY: DAMAGE(2, ALL_OTHERS); ON_ANY_DEATH: HEAL(2) ou BUFF_ATK(1,PERMANENT) se SELF_HP_FULL; PASSIVE: IMMUNE(suporte) |
| Ahari Hegoshi | ON_PLAY: DAMAGE(70, ENEMY_CHOSEN, irreducible+ignora escudo/esquiva) |
| Aphellia Jube | ON_PLAY: HEAL(2, ALLY_CHOSEN) + BUFF_ATK(1,PERMANENT)[TARGET_HAS race=Drakumira]; ON_TURN_END: HEAL(1) em aliado Pirata custo>=6 |
| Arlan Skandifinn | PASSIVE: IMMUNE(debuff_atk); ON_ATTACK_DECLARED: DAMAGE(1, ALL_ENEMIES exceto alvo); REMOVE_KEYWORD(GUARD, END_OF_TURN)[CONTROLS_COUNT(affiliation=Marinha)>=1] |
| Armura Maesck | ON_PLAY: DEBUFF_ATK(1, ALL_ENEMIES, UNTIL_YOUR_NEXT_TURN); ON_ATTACK_DECLARED: SPLASH_DAMAGE(2, ADJACENT_TARGET) |
| Azazel Morningstar | PASSIVE: DAMAGE_REDUCTION(1) + THORNS(1, melee); PASSIVE: IGNORE_GUARD; GRANT_KEYWORD(RUSH)[CONTROLS_CARD=Papa Morningstar] |
| Barnaby Buttercup | ON_PLAY: PROTECT_LINK(ALLY_CHOSEN); ON_DAMAGE_TAKEN: DAMAGE(50, ATTACKER)[cond: protegido = Caviar Beluga] |
| Bartoleleu Xambles | ON_PLAY: CLEANSE(ALL_ALLIES); PASSIVE: GUARD + DAMAGE_REDUCTION(1); AURA: BUFF_ATK(1)+UNTARGETABLE em aliados custo<=3 |
| Baubas | ON_PLAY: BUFF_MAX_HP(2, ALLY_CHOSEN); ACTIVATED(ONCE PER_TURN): SWAP_STATS(SELF, END_OF_TURN) |
| Belial Desgrace | ON_PLAY: SET_ATK_FROM_TARGET(ANY_CHOSEN); GRANT_KEYWORD(RUSH)[CONTROLS_CARD=Azazel] |
| Bennks Zeha | PASSIVE: CANNOT_ATTACK; AURA: BUFF_ATK(2)+BUFF_MAX_HP(2) em Pirata/Revolucionário; ON_TURN_END: SELF_DAMAGE(2) |
| Caranguejos-Sentinela | PASSIVE: CANNOT_ATTACK; AURA: TAX_COST(1, primeira carta do oponente por turno) |
| Caviar Beluga | ON_PLAY: APPLY_STATUS(TRAP_DIAL) em até 2 inimigos → DAMAGE(70)+cancela ação; desarme por 1 PA |
| Cortius Stominus | ON_PLAY: DEBUFF_ATK(2,PERMANENT)+REMOVE_KEYWORD(GUARD) em ENEMY_CHOSEN; ON_ANY_DEATH: HEAL(3, ALLY_CHOSEN); GRANT_KEYWORD(GUARD)[CONTROLS Pirata custo>=7] |
| Dagwey Domain | PASSIVE: RUSH; ON_PLAY: GRANT_KEYWORD(RUSH, ADJACENT_SELF); ON_DAMAGE_DEALT: SELF_DAMAGE(2) |
| Eggui Midall | ON_PLAY: HEAL(2, ALLY_CHOSEN) |
| Einar Sigrskald | ON_PLAY: SUMMON_TOKEN(garanho, ADJACENT_SELF); PASSIVE condicional: RUSH+IGNORE_GUARD enquanto token vivo |
| Galdrom Vulham | PASSIVE: FIRST_STRIKE; ON_KILL: BUFF_ATK(2,PERMANENT); ON_ALLY_PLAYED[Marinha]: GRANT_KEYWORD(GUARD, UNTIL_YOUR_NEXT_TURN) |
| Goetio Akkurix | ON_PLAY: DAMAGE(2, ENEMY_CHOSEN, ignore_guard+ignore_stealth); ON_KILL[!TARGET_HAS_KEYWORD GUARD]: GRANT_KEYWORD(STEALTH) |
| Hare Focalor | ON_PLAY: GRANT_KEYWORD(GUARD, ANY_CHOSEN) + BUFF_ATK(1,PERMANENT)[aliado Pirata] |
| Hush Bush | ON_PLAY: APPLY_STATUS(IMMOBILIZED,2)+DAMAGE(80) em ENEMY_CHOSEN; BUFF_MAX_HP(50, ADJACENT_SELF, WHILE status) |
| Jake Kemmors | PASSIVE: DAMAGE_REDUCTION(1) + IGNORE_GUARD |
| Jill Kask | ON_PLAY: DESTROY(ALL_OTHERS, filter cost<=4); PASSIVE: FLYING (IGNORE_GUARD + só alvo de Atirador/Voo); DAMAGE_REDUCTION(1, físico) |
| Jozzie Rowan | ON_PLAY: SUMMON_TOKEN(fuzileiro, esq+dir); AURA: BUFF_ATK(1) em tipo=Atirador |
| Kaida Kama | ON_TURN_START: HEAL(2, SELF); AURA: BUFF_ATK(1)+BUFF_MAX_HP(1) em Tritão/Sereia; ON_ATTACK_DECLARED: GRANT_KEYWORD(IGNORE_GUARD, ALLY_CHOSEN, END_OF_TURN) |
| Kara Rockbell | ON_PLAY: HEAL(3, ALLY_CHOSEN) + BUFF_ATK(1,PERMANENT)[race=Oni] |
| Kasabel Morningstar | PASSIVE: DAMAGE_REDUCTION(1)+THORNS(1); ON_PLAY: SUMMON_TOKEN(espantalho, ADJACENT_SELF); ON_ANY_DEATH[token aliado]: DEBUFF_ATK(2, killer, END_OF_TURN)+DRAW(1) |
| Kassius Drum | PASSIVE: TRAMPLE; ON_ANY_DEATH[aliado Marinha matou sem dano]: BUFF_ATK(2,PERMANENT); ON_PLAY: GRANT_KEYWORD(GUARD)[CONTROLS_COUNT(Marinha)==2] |
| Kizza | ON_PLAY: BUFF_MAX_HP(2,PERMANENT, ALLY_CHOSEN); PASSIVE: IRREDUCIBLE |
| Kuro Rockbell | ON_PLAY: DEBUFF_ATK(1, ALL_ENEMIES, UNTIL_YOUR_NEXT_TURN); ON_ANY_DEATH: HEAL(2)[aliada] / BUFF_ATK(1,PERMANENT)[inimiga] |
| Lady Hita | AURA: REMOVE_KEYWORD(STEALTH, ALL_ENEMIES) + bloqueio; ON_PLAY: APPLY_STATUS(POISON)+CANNOT_ATTACK(1 turno) em ENEMY_CHOSEN; [CONTROLS_CARD=Uzui Tengen] GUARD + ataques aplicam POISON |
| Leviathan Estrelo | ON_TURN_END: HEAL(2, SELF) |
| Lucky Wali | PASSIVE: restrição de alvo (não ataca personagens femininas); ON_PLAY: GRANT_KEYWORD(RUSH) |
| Marcellia Dullacus | PASSIVE: FLYING; ON_DAMAGE_DEALT: LIFESTEAL(1.0); ON_KILL: BUFF_ATK(1,PERMANENT); AURA: BUFF_MAX_HP(1)+STEALTH ao entrar para Drakumira/Shapes of The Night |
| Mimi Segredos | PASSIVE: UNTARGETABLE[CONTROLS_COUNT(Pirata)>=1]; ON_PLAY: HEAL(2)+BUFF_ATK(1,END_OF_TURN) em ALLY_CHOSEN |
| Mizuno D'Artagnan | ON_ATTACK_DECLARED: DEBUFF_ATK(1)+REMOVE_KEYWORD(GUARD) no alvo; ON_KILL: GRANT_KEYWORD(STEALTH); [CONTROLS_CARD=Damian Vayne] ataques aplicam POISON(1) |
| Nacht Sunatas | ON_ATTACK_DECLARED: SPLASH_DAMAGE(1, ADJACENT_TARGET); ON_ATTACK_DECLARED: SELF_DAMAGE(1, irreducible) |
| Nao Namoshi | PASSIVE: FIRST_STRIKE; ON_PLAY[CONTROLS_COUNT(Marinha)==2]: GRANT_KEYWORD(RUSH)+BUFF_MAX_HP(1) |
| O Refém | PASSIVE: GUARD + CANNOT_ATTACK; ON_TURN_END: SELF_DAMAGE(1); ON_DEATH: DRAW(1) |
| Papa Morningstar | ON_PLAY: SUMMON_TOKEN(homie_fogo, esq) + SUMMON_TOKEN(homie_areia, dir) |
| Paulo Markovsk | ON_PLAY: HEAL(3, ALLY_CHOSEN) + DAMAGE(2, ENEMY_CHOSEN, ignore_guard); PASSIVE: GUARD; BUFF_ATK(1,PERMANENT)[curado = Void Imperium] |
| Relax D. Fontein | ON_PLAY: APPLY_STATUS(SLEEP,1); ON_TURN_START: DAMAGE(100, ENEMY_CHOSEN) + BOUNCE |
| Remmy O. Roaders | ON_PLAY: APPLY_STATUS(DISTRACTED,1) em ENEMY_CHOSEN; ON_TARGETED: REDIRECT_ATTACK(ADJACENT_SELF); PASSIVE: DAMAGE_REDUCTION(1) |
| Sabrina Tengen (Passado) | ON_PLAY: MODAL implícito — BUFF_ATK(2,END_OF_TURN)[aliada] / DEBUFF_ATK(2,END_OF_TURN)[inimiga]; ON_TURN_START: SCRY(1) |
| San Girino | ON_PLAY/ataque: DAMAGE(70, ENEMY_CHOSEN)+SPLASH_DAMAGE(30, ADJACENT_TARGET); PASSIVE: IMMUNE(primeiro dano direto por turno) |
| Shindarell Trim | ON_PLAY: MODAL[HEAL(1) / BUFF_ATK(1,END_OF_TURN) / SCRY(1)] |
| Sid D. Hartha | PASSIVE: GUARD + DAMAGE_REDUCTION(1); ACTIVATED(ONCE PER_MATCH): REMOVE_KEYWORD(GUARD)+BUFF_ATK(3,PERMANENT) + HEAL(2)[CONTROLS Void Imperium] |
| Tayana Alavossa | ON_PLAY: DRAW(1) |
| THE DRIFTER | ON_PLAY: DAMAGE(1, N_ENEMIES_CHOSEN n=3, shots=3) com `amount=2` se TARGET_HAS(affiliation=Marinha) |
| Todd Jeromy | ON_PLAY: BUFF_MAX_HP(2, ALLY_CHOSEN); ON_TARGETED: BUFF_ATK(1, INSTANT) |
| Trey Ozhan | ON_TURN_END: HEAL(1, ADJACENT_SELF) |
| Uzui & Aven | ON_PLAY: BUFF_ATK(1, ALLY_CHOSEN, END_OF_TURN); PASSIVE: REDIRECT_ATTACK(SELF) quando aliado com HP<=2 é alvo |
| Vera Jones | PASSIVE: FLYING; AURA: DEBUFF_ATK(2)+REMOVE_KEYWORD(GUARD) em inimigos masculinos; ON_KILL: HEAL(2) |
| Young K | ON_PLAY: BUFF_ATK(2, ALLY_CHOSEN, END_OF_TURN → PERMANENT se crew=Void Imperium) |

### Efeitos que exigem mecânica especial (fora do modelo genérico)

1. **Fichas/tokens** (Einar, Jozzie, Kasabel, Papa) — exigem catálogo de tokens
   e slots adjacentes.
2. **Voo / restrição de alvo por tipo** (Jill, Marcellia, Vera) — regra de
   targeting, não efeito.
3. **Armadilhas reativas** (Caviar Beluga) — sistema de traps com janela de
   interrupção e desarme pago.
4. **FIRST_STRIKE / contra-ataque** (Galdrom, Nao, 02) — hoje o engine não tem
   contra-ataque; é pré-requisito.
5. **MODAL / Ação Rápida** (Shindarell, Baubas, Sid) — exige UI de escolha e,
   no PvP, prompt autoritativo no servidor.
6. **TAX_COST, TRAMPLE, PROTECT_LINK, REDIRECT_ATTACK** — alteram o pipeline de
   custo/dano/targeting.
7. **Gênero, raça, tripulação, tipo** — não existem colunas em `cards`.

## 4. Armazenamento no Supabase

```sql
-- catálogo de mecânicas (alimenta os selects do admin)
effect_definitions(code pk, label, description, category,
                   allowed_triggers text[], allowed_targets text[],
                   params_schema jsonb, active bool)

-- taxonomia das cartas (necessária para as condições)
cards += race text, affiliation text, crew text, card_type text, gender text

-- habilidades por carta (N por carta)
card_abilities(id pk, card_id fk cards, sort_order int, name text,
               trigger text, conditions jsonb default '[]',
               effects jsonb not null, once text, active bool)

-- tokens invocáveis
card_tokens(id pk, name, atk, hp, keywords text[], race, affiliation, type)
```

Grants: `select` para `anon, authenticated`; escrita só para admin
(`has_role(auth.uid(),'admin')`) + `service_role`. `cards.effect_code` é mantido
como legado até a migração completa das 75 cartas.

Migrations previstas:
- `0044_tcg_effect_engine.md` — tabelas acima + RLS/grants + seed de
  `effect_definitions`.
- `0045_tcg_card_taxonomy.md` — colunas de raça/afiliação/tripulação/tipo/gênero.
- `0046_tcg_card_abilities_backfill.md` — inserts das habilidades das cartas
  já mapeadas.

## 5. Alterações no engine

1. `InPlayCard` ganha `keywords: string[]`, `statuses: {code, turns}[]`,
   `modifiers: {stat, amount, duration, source}[]`, `abilities`, `flags`.
2. Barramento de eventos: `emit(state, event, ctx)` percorre todas as cartas em
   campo e resolve habilidades cujo `trigger` casa e cujas `conditions` passam.
3. Registro de efeitos: `EFFECT_HANDLERS: Record<EffectCode, (ctx, params) => void>`
   — adicionar efeito = adicionar handler + linha em `effect_definitions`.
4. Pipeline de dano único (`dealDamage`) aplicando redução, irredutível, thorns,
   lifesteal, trample, morte e `ON_ANY_DEATH`.
5. Recalcular auras a cada mutação (`recomputeAuras`).
6. Fila de escolhas: efeitos com alvo escolhido geram `pendingChoice` no estado;
   no PvP o servidor valida a escolha (nova action `RESOLVE_CHOICE`).
7. `ENGINE_STATE_VERSION` → 2, com migração/invalidação das partidas em curso.

## 6. Painel Admin

Em `/admin/woptcg/cartas`, editor de habilidades por carta:

- lista ordenável de habilidades (adicionar/remover/reordenar);
- select de **Gatilho** (filtrado por `allowed_triggers` do efeito);
- construtor de **Condições** (tipo → grupo → operador → valor);
- lista de **Efeitos** com select de `effect_code`, select de alvo e formulário
  de parâmetros gerado dinamicamente a partir de `params_schema`;
- preview textual ("Ao Entrar: causa 2 de dano a todas as cartas inimigas");
- validação contra o schema antes de salvar;
- campos de taxonomia (raça/afiliação/tripulação/tipo/gênero) no formulário.

Resultado: novas cartas passam a ser criadas por select + parâmetros, sem
alteração de código — exceto quando exigirem uma mecânica inédita.
