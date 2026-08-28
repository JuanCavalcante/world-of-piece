# Tutorial — Sistema de Efeitos do WOP TCG (Painel Admin)

Guia para o admin configurar os efeitos das cartas em **/admin/woptcg/cartas**.

> Pré-requisito: rodar as migrations `0062_tcg_effect_engine_catalog.md` e
> `0063_tcg_effects_catalog_tuning.md` no banco.

---

## 1. Conceitos em 30 segundos

Cada carta tem **3 slots fixos de habilidades**. Cada habilidade é montada com 4 peças:

| Peça | O que define | Exemplo |
|---|---|---|
| **Efeito** | O que acontece | Causar dano, Curar, Aplicar status |
| **Gatilho (Trigger)** | Quando acontece | Ao jogar, Ao atacar, No fim do turno |
| **Alvo (Target)** | Em quem age | Própria carta, Aliado, Inimigo |
| **Parâmetros** | Quanto / qual | `amount: 2`, `status: SLEEP` |

Opcionalmente existe a **Condição**, que só deixa o efeito disparar se algo for verdade (ex.: inimigo com pouco HP).

**Importante:** o que vale no duelo é a habilidade configurada. A descrição em texto da carta é apenas cosmética — mantenha as duas coerentes.

---

## 2. Onde fica

1. Acesse **/admin/woptcg/cartas**.
2. Crie uma carta nova ou clique em uma existente para editar.
3. Role até a seção de **Efeitos / Habilidades** (3 slots).

Cada slot é independente. Uma carta pode ter 0, 1, 2 ou 3 habilidades — a raridade costuma ditar a quantidade.

---

## 3. Passo a passo para configurar uma habilidade

**Exemplo prático:** "Ao ser jogada, causa 2 de dano em um inimigo à sua escolha."

1. **Slot 1 → Efeito:** selecione `Dano ao jogar (DAMAGE_ON_PLAY)`.
2. **Gatilho:** `ON_PLAY` (ao entrar em campo).
3. **Alvo:** `ENEMY_CHOSEN` (o jogador escolhe o alvo na hora).
4. **Parâmetros:** preencha `amount` = `2`.
5. Salve a carta.

Pronto — sem código, sem deploy. Na próxima partida a carta já funciona.

**Exemplo 2 — status:** "Ao atacar, 30% de chance de causar Sono no alvo."

1. Efeito: `Aplicar status (GRANT_STATUS)`
2. Gatilho: `ON_ATTACK`
3. Alvo: `ENEMY_CHOSEN` (ou `SELF` para efeitos que atingem a própria carta)
4. Parâmetros: `status` = `SLEEP`, `chance` = `0.3`

**Exemplo 3 — aura passiva:** "Enquanto estiver em campo, +1 de ATK para todos os aliados."

1. Efeito: `Aura de ATK (AURA_BUFF_ATK)`
2. Gatilho: `PASSIVE` (sempre ativo enquanto a carta viver)
3. Alvo: `ALL_ALLIES`
4. Parâmetros: `amount` = `1`

---

## 4. Regras de ouro

- **Máximo de 3 habilidades por carta** — o sistema ignora slots vazios.
- **Chance:** use valores de `0` a `1` (0.3 = 30%). Se omitir, é 100%.
- **Alvos `*_CHOSEN`** pausam o turno pedindo escolha ao jogador. Use só quando fizer sentido tático; para efeitos automáticos prefira `RANDOM_ENEMY`, `SELF`, `ALL_*`.
- **Não duplique gatilhos redundantes**: duas habilidades com o mesmo gatilho disparam as duas, em ordem de slot — pode ser intencional (ex.: dano + veneno ao atacar).
- **Palavras-chave** (Aparar, Provocar, Furtivo etc.) são o efeito `KEYWORD` com gatilho `PASSIVE`.
- **Teste antes de anunciar**: monte um deck com a carta e jogue um duelo vs IA para confirmar o comportamento.

---

## 5. Como saber quais parâmetros cada efeito aceita

O editor gera o formulário automaticamente a partir do catálogo do banco (`params_schema`) — os campos que aparecem são exatamente os que o efeito entende. Para planejar fora do painel, consulte:

- **`docs/tcg-effects-45-mapping.md`** — os 45 efeitos planejados, cada um com efeito/gatilho/alvo/parâmetros prontos para copiar.
- Tabela `effects` no banco — lista todos os efeitos com seus schemas.

---

## 6. Problemas comuns

| Sintoma | Causa provável | Correção |
|---|---|---|
| Efeito não dispara no duelo | Gatilho errado (ex.: `ON_PLAY` em aura) | Revise gatilho vs. intenção |
| Efeito não deixa escolher alvo | Alvo não é `*_CHOSEN` | Troque para `ENEMY_CHOSEN` / `ALLY_CHOSEN` |
| Status nunca aplica | `chance` baixa ou alvo incorreto | Confira `chance` (0–1) e o alvo |
| Efeito não aparece no SELECT do editor | Catálogo não semeado | Rodar migration 0062 (e 0063) |
| Mudança não vale em partida em andamento | Habilidades são lidas no início do duelo | Normal — vale no próximo duelo |

---

## 7. Segurança / rollback

- As habilidades são resolvidas **no servidor**; o cliente nunca envia ATK/HP/status — editar cartas pelo painel é o único caminho.
- Para desativar o sistema inteiro sem redeploy: `delete from card_effects;` — as cartas voltam ao comportamento base (ATK/HP puros).
- Para desativar **uma** habilidade: remova o slot da carta no painel e salve.
