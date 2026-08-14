# Plano — Criação (/craft) e Mercado/Trocas (/trade) no WOP TCG

## Objetivo
Implementar dois sistemas integrados ao TCG usando RPCs atômicos (SECURITY DEFINER) no Supabase, reutilizando o sistema de usuários/auth existente. Tudo segue o tema visual WOP TCG (sea-deep, gold, gradient-primary, hover com elevação).

## Moedas e Carteira
**Duas moedas:**
- **ESSENCE** (Essência) — ícone roxo — moeda do mercado; obtida por extração, eventos e vendas.
- **CARD FRAGMENTS** (Fragmentos) — ícone azul — não negociáveis; por raridade (common/uncommon/rare/epic/legendary). Usados só para forjar.

**Wallet isolada em tabela própria** `tcg_wallets` (por segurança — RLS SELECT-only; todas as mutações via RPC, evitando exploits de edição direta):
```
tcg_wallets(user_id PK, essence, common_fragments, uncommon_fragments,
            rare_fragments, epic_fragments, legendary_fragments, updated_at)
```
Helper `tcg_ensure_wallet()`. Grant SELECT p/ authenticated, ALL p/ service_role. RLS: self SELECT only.

## Migração SQL (`docs/migrations/0034_tcg_craft_trade.md`)
Você roda no SQL Editor do seu Supabase. Inclui:
1. Tabela `tcg_wallets` + grants + RLS + `tcg_ensure_wallet`.
2. Tabela `market_listings` (seller_id, card_id, price_essence, status ACTIVE/SOLD/CANCELED/EXPIRED/TRADED, buyer_id, expires_at 7d) + grants + RLS (vendedor gerencia próprios; todos leem ACTIVE).
3. Tabela `trade_offers` (listing_id, offerer_id, offered_card_id, status PENDING/ACCEPTED/DECLINED/CANCELED) + grants + RLS.
4. Helper `tcg_available_qty(user,card)` = user_cards.quantity − somatório de deck_cards.quantity dos baralhos do dono (protege cartas em baralhos).
5. RPCs de Craft:
   - `tcg_forge_card(_rarity)` — exige 10 fragmentos da raridade, consome, entrega 1 carta ACTIVE aleatória da mesma raridade, track CARDS_FORGED, notifica.
   - `tcg_dismantle_card(_card_id)` — exige quantity>=2 e available>=1, remove 1 cópia, +1 fragmento da raridade, track CARDS_DISMANTLED, notifica.
   - `tcg_extract_essence(_card_id)` — exige available>=1, remove 1 cópia, concede essence por raridade (COMUM 10/INCOMUM 25/RARA 60/EPICA 150/LENDARIA 400), track ESSENCE_EXTRACTED, notifica.
6. RPCs de Mercado:
   - `tcg_create_listing(_card_id,_price)` — exige available>=1 e <3 anúncios ACTIVE; escrow: remove 1 cópia do vendedor e guarda na listing.
   - `tcg_cancel_listing(_id)` — marca CANCELED, devolve carta ao vendedor.
   - `tcg_buy_listing(_id)` — paga essence (comprador→vendedor), carta→comprador, status SOLD, cancela/recusa ofertas pendentes (devolve escrow), track CARDS_SOLD + ESSENCE_EARNED_MARKET (vendedor), notifica ambos.
   - `tcg_expire_listings()` — marca ACTIVE expirados → EXPIRED, devolve escrow (chamado no início das listagens).
7. RPCs de Troca:
   - `tcg_create_trade_offer(_listing_id,_offered_card_id)` — exige available>=1 na carta oferecida; escrow remove 1 cópia do offerer.
   - `tcg_accept_trade_offer(_id)` — atômico: carta da listing→offerer, carta oferecida→vendedor, status TRADED, recusa outras ofertas (devolve escrow), track TRADES_COMPLETED, notifica.
   - `tcg_decline_trade_offer(_id)` — status DECLINED, devolve escrow, notifica offerer.
   - `tcg_cancel_trade_offer(_id)` — offerer cancela, devolve escrow.
8. INSERT novas conquistas (category MARKET + COLLECTION) com triggers CARDS_FORGED/CARDS_DISMANTLED/ESSENCE_EXTRACTED/TRADES_COMPLETED/CARDS_SOLD/ESSENCE_EARNED_MARKET. O `tcg_achievements_sync` já trata triggers via `tcg_event_counters` (branch else), então só preciso chamar `tcg_track_event` nos RPCs.

## Frontend

### Tipos/API (`src/lib/tcg/wallet.ts`, `src/lib/tcg/market.ts`)
- `getMyWallet()`, tipos `TcgWallet`.
- `listMarketListings()`, `listMyListings()`, `listMyTradeOffers()`, `listReceivedTradeOffers()`, e wrappers para os RPCs acima.
- Estende `src/lib/tcg/achievements.ts`: tipo `AchievementCategory` += `'MARKET'`, `CATEGORY_LABEL` += MARKET: "Mercado".

### Sidebar (`src/components/tcg/tcg-shell.tsx`)
Reordenar NAV para: Painel do Jogador · Cartas · Baralhos · Conquistas · Diárias · **Criação** (ícone Hammer) · Trocas · Rank · Duelos. Adicionar rota `/tcggame/craft`.

### Top bar — Wallet display
Componente `WalletDisplay` no header ao lado de "World of Piece — TCG":
- Fragmentos (ícone azul) + Essência (ícone roxo).
- Hover em Fragmentos abre popover com as 5 raridades e quantidades.

### Rota `/tcggame/craft` (`src/routes/tcggame.craft.tsx`)
Painel com 3 cards grandes (reutiliza padrão visual StatCard/gradient/hover):
1. **Forjar Carta** — select de raridade, mostra fragmentos disponíveis, botão Forjar, animação de abertura (reusa PackRevealDialog).
2. **Desmantelar** — grid de cartas com quantity>=2 e available>=1, botão por carta, confirmação.
3. **Extrair Essência** — grid de cartas com available>=1, mostra valor de essence por raridade, botão extrair, confirmação.

### Rota `/tcggame/trade` (`src/routes/tcggame.trade.tsx`)
Tabs: **Mercado** e **Minhas Ofertas**.
- Mercado: grid de anúncios ACTIVE (carta, vendedor, preço em essence, botão Comprar / Oferecer troca). Form "Criar anúncio" (select carta disponível + preço) com limite 0/3. Modal de oferta de troca (escolher sua carta para oferecer).
- Minhas Ofertas: sub-seções Anúncios ativos (cancelar), Vendidos/Trocados, Ofertas recebidas (aceitar/recusar), Ofertas enviadas (cancelar).

### Painel principal (`src/routes/tcggame.index.tsx`)
Adicionar dois cards: Anúncios ativos (0/3) e Trocas pendentes recebidas, com links para /trade.

### Conquistas (`src/routes/tcggame.achievements.tsx`)
Adicionar tab MARKET aos TABS.

### Toasts (`src/components/tcg/reward-toast.tsx`)
Adicionar kinds: forge, dismantle, extract, market (sold/listed), trade (received/accepted/declined/expired). Premium toasts reusando o estilo existente.

## Regras de segurança
- Fragmentos NÃO negociáveis; Essência é a única moeda do mercado.
- Máx 3 anúncios ativos por jogador.
- Escrow (remover cópia ao listar/oferecer) previne duplicação — transferências atômicas via RPC SECURITY DEFINER.
- Cartas em baralhos protegidas via `tcg_available_qty`.
- Validação Zod + server-side nos RPCs; RLS em todas as tabelas novas.

## Ordem de execução
1. Escrever migração 0034 (SQL) — você roda no Supabase.
2. Tipos/API: wallet.ts, market.ts, achievements.ts (MARKET).
3. Sidebar reorder + WalletDisplay.
4. Rota /craft.
5. Rota /trade.
6. Painel principal + conquistas tab + toasts.
7. Build/typecheck + verificação no preview.
