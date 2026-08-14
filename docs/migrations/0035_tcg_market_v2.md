# 0035 — Mercado v2: anúncios de VENDA/TROCA, expiração 24h e ofertas com até 3 cartas

Execute no **SQL Editor** do Supabase (New query → colar → Run).
Requer a migração `0034_tcg_craft_trade.md` já aplicada.

O que muda:
- `market_listings.kind` (`SALE` | `TRADE`) — anúncio de troca não tem preço.
- Expiração automática passa a ser **24 horas**.
- Ofertas de troca passam a aceitar **de 1 a 3 cartas** (nova tabela `trade_offer_cards`).
- Todas as transferências continuam atômicas em RPCs `SECURITY DEFINER`.

```sql
-- ============================================================
-- 1. LISTINGS: tipo (SALE/TRADE), preço opcional, expiração 24h
-- ============================================================
ALTER TABLE public.market_listings
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'SALE';

ALTER TABLE public.market_listings ALTER COLUMN price_essence DROP NOT NULL;
ALTER TABLE public.market_listings DROP CONSTRAINT IF EXISTS market_listings_price_essence_check;
ALTER TABLE public.market_listings DROP CONSTRAINT IF EXISTS market_listings_price_check;
ALTER TABLE public.market_listings DROP CONSTRAINT IF EXISTS market_listings_kind_check;

ALTER TABLE public.market_listings
  ADD CONSTRAINT market_listings_kind_check CHECK (kind IN ('SALE','TRADE'));
ALTER TABLE public.market_listings
  ADD CONSTRAINT market_listings_price_check CHECK (
    (kind = 'SALE'  AND price_essence IS NOT NULL AND price_essence > 0) OR
    (kind = 'TRADE' AND price_essence IS NULL)
  );

ALTER TABLE public.market_listings
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '24 hours');

-- ============================================================
-- 2. OFERTAS COM ATÉ 3 CARTAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trade_offer_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.trade_offers(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trade_offer_cards_offer_idx ON public.trade_offer_cards(offer_id);

GRANT SELECT ON public.trade_offer_cards TO authenticated;
GRANT ALL ON public.trade_offer_cards TO service_role;

ALTER TABLE public.trade_offer_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trade_offer_cards read" ON public.trade_offer_cards;
CREATE POLICY "trade_offer_cards read"
  ON public.trade_offer_cards FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trade_offers o
    JOIN public.market_listings ml ON ml.id = o.listing_id
    WHERE o.id = trade_offer_cards.offer_id
      AND (o.offerer_id = auth.uid() OR ml.seller_id = auth.uid())
  ));

-- backfill das ofertas antigas (1 carta)
INSERT INTO public.trade_offer_cards (offer_id, card_id)
SELECT o.id, o.offered_card_id FROM public.trade_offers o
WHERE o.offered_card_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.trade_offer_cards t WHERE t.offer_id = o.id);

ALTER TABLE public.trade_offers ALTER COLUMN offered_card_id DROP NOT NULL;

-- ============================================================
-- 3. RPC — CRIAR ANÚNCIO (VENDA ou TROCA)
-- ============================================================
DROP FUNCTION IF EXISTS public.tcg_create_listing(uuid, int);
DROP FUNCTION IF EXISTS public.tcg_create_listing(uuid, text, int);

CREATE OR REPLACE FUNCTION public.tcg_create_listing(_card_id uuid, _kind text, _price_essence int)
RETURNS TABLE(out_id uuid, out_name text, out_kind text, out_price int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid(); _card record; _avail int; _active int; _price int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;
  IF _kind NOT IN ('SALE','TRADE') THEN RAISE EXCEPTION 'Tipo de anúncio inválido.'; END IF;

  IF _kind = 'SALE' THEN
    IF _price_essence IS NULL OR _price_essence <= 0 THEN
      RAISE EXCEPTION 'Informe um preço em essência maior que zero.'; END IF;
    _price := _price_essence;
  ELSE
    _price := NULL;
  END IF;

  SELECT c.id, c.name INTO _card FROM public.cards c WHERE c.id = _card_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Carta não encontrada.'; END IF;

  -- precisa de pelo menos 2 cópias disponíveis (fora de baralhos)
  _avail := public.tcg_available_qty(_uid, _card_id);
  IF _avail < 2 THEN
    RAISE EXCEPTION 'Você precisa de pelo menos 2 cópias disponíveis (fora de baralhos) para anunciar.'; END IF;

  SELECT count(*)::int INTO _active FROM public.market_listings
  WHERE seller_id = _uid AND status = 'ACTIVE';
  IF _active >= 3 THEN
    RAISE EXCEPTION 'Você já possui 3 anúncios ativos (limite máximo).'; END IF;

  -- escrow: bloquear 1 cópia
  UPDATE public.user_cards SET quantity = quantity - 1
  WHERE user_id = _uid AND card_id = _card_id;
  DELETE FROM public.user_cards WHERE user_id = _uid AND card_id = _card_id AND quantity <= 0;

  INSERT INTO public.market_listings (seller_id, card_id, kind, price_essence, expires_at)
  VALUES (_uid, _card_id, _kind, _price, now() + interval '24 hours')
  RETURNING id INTO out_id;

  PERFORM public.tcg_notify(_uid, 'Anúncio Criado',
    CASE WHEN _kind = 'SALE'
      THEN 'Sua carta ' || _card.name || ' foi listada por ' || _price || ' de essência.'
      ELSE 'Sua carta ' || _card.name || ' foi listada para troca.' END, 'TCG_MARKET');

  out_name := _card.name; out_kind := _kind; out_price := _price;
  RETURN NEXT;
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_create_listing(uuid, text, int) TO authenticated;

-- ============================================================
-- 4. RPC — DECLINE INNER (devolve TODAS as cartas ofertadas)
-- ============================================================
CREATE OR REPLACE FUNCTION public.tcg_decline_trade_offer_inner(_offer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o record; _c record;
BEGIN
  SELECT * INTO _o FROM public.trade_offers WHERE id = _offer_id AND status = 'PENDING';
  IF _o.id IS NULL THEN RETURN; END IF;
  UPDATE public.trade_offers SET status = 'DECLINED', responded_at = now() WHERE id = _offer_id;
  FOR _c IN SELECT card_id FROM public.trade_offer_cards WHERE offer_id = _offer_id LOOP
    INSERT INTO public.user_cards (user_id, card_id, quantity) VALUES (_o.offerer_id, _c.card_id, 1)
    ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = public.user_cards.quantity + 1;
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_decline_trade_offer_inner(uuid) TO service_role;

-- ============================================================
-- 5. RPC — CRIAR OFERTA DE TROCA (1 a 3 cartas)
-- ============================================================
DROP FUNCTION IF EXISTS public.tcg_create_trade_offer(uuid, uuid);
DROP FUNCTION IF EXISTS public.tcg_create_trade_offer(uuid, uuid[]);

CREATE OR REPLACE FUNCTION public.tcg_create_trade_offer(_listing_id uuid, _offered_card_ids uuid[])
RETURNS TABLE(out_id uuid, out_count int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid(); _l record; _ids uuid[]; _cid uuid; _avail int; _offer uuid; _names text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;
  PERFORM public.tcg_expire_listings();

  SELECT ARRAY(SELECT DISTINCT unnest(_offered_card_ids)) INTO _ids;
  IF _ids IS NULL OR array_length(_ids, 1) IS NULL OR array_length(_ids, 1) < 1 THEN
    RAISE EXCEPTION 'Selecione ao menos 1 carta.'; END IF;
  IF array_length(_ids, 1) > 3 THEN
    RAISE EXCEPTION 'Você pode oferecer no máximo 3 cartas.'; END IF;

  SELECT * INTO _l FROM public.market_listings WHERE id = _listing_id FOR UPDATE;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Anúncio não encontrado.'; END IF;
  IF _l.status <> 'ACTIVE' THEN RAISE EXCEPTION 'Anúncio não está mais ativo.'; END IF;
  IF _l.seller_id = _uid THEN RAISE EXCEPTION 'Você não pode oferecer troca no seu próprio anúncio.'; END IF;

  IF EXISTS (SELECT 1 FROM public.trade_offers
             WHERE listing_id = _listing_id AND offerer_id = _uid AND status = 'PENDING') THEN
    RAISE EXCEPTION 'Você já tem uma oferta pendente neste anúncio.'; END IF;

  -- validar disponibilidade (>= 2 cópias, fora de baralhos e não bloqueadas)
  FOREACH _cid IN ARRAY _ids LOOP
    IF NOT EXISTS (SELECT 1 FROM public.cards WHERE id = _cid) THEN
      RAISE EXCEPTION 'Carta oferecida não encontrada.'; END IF;
    _avail := public.tcg_available_qty(_uid, _cid);
    IF _avail < 2 THEN
      RAISE EXCEPTION 'A carta % não tem 2 cópias disponíveis para oferta.',
        (SELECT name FROM public.cards WHERE id = _cid); END IF;
  END LOOP;

  INSERT INTO public.trade_offers (listing_id, offerer_id, offered_card_id)
  VALUES (_listing_id, _uid, _ids[1])
  RETURNING id INTO _offer;

  -- escrow das cartas oferecidas
  FOREACH _cid IN ARRAY _ids LOOP
    UPDATE public.user_cards SET quantity = quantity - 1
    WHERE user_id = _uid AND card_id = _cid;
    DELETE FROM public.user_cards WHERE user_id = _uid AND card_id = _cid AND quantity <= 0;
    INSERT INTO public.trade_offer_cards (offer_id, card_id) VALUES (_offer, _cid);
  END LOOP;

  SELECT string_agg(name, ', ') INTO _names FROM public.cards WHERE id = ANY(_ids);

  PERFORM public.tcg_notify(_l.seller_id, 'Nova Oferta de Troca',
    'Você recebeu uma oferta (' || _names || ') pelo seu anúncio de ' ||
    (SELECT name FROM public.cards WHERE id = _l.card_id) || '.', 'TCG_TRADE');

  out_id := _offer; out_count := array_length(_ids, 1);
  RETURN NEXT;
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_create_trade_offer(uuid, uuid[]) TO authenticated;

-- ============================================================
-- 6. RPC — ACEITAR OFERTA (swap atômico, N cartas)
-- ============================================================
CREATE OR REPLACE FUNCTION public.tcg_accept_trade_offer(_offer_id uuid)
RETURNS TABLE(out_listing_card text, out_offered_card text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid(); _o record; _l record; _lc record; _c record; _names text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;
  SELECT * INTO _o FROM public.trade_offers WHERE id = _offer_id FOR UPDATE;
  IF _o.id IS NULL THEN RAISE EXCEPTION 'Oferta não encontrada.'; END IF;
  IF _o.status <> 'PENDING' THEN RAISE EXCEPTION 'Esta oferta não está mais pendente.'; END IF;

  SELECT * INTO _l FROM public.market_listings WHERE id = _o.listing_id FOR UPDATE;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Anúncio não encontrado.'; END IF;
  IF _l.status <> 'ACTIVE' THEN RAISE EXCEPTION 'Anúncio não está mais ativo.'; END IF;
  IF _l.seller_id <> _uid THEN RAISE EXCEPTION 'Apenas o dono do anúncio pode aceitar a oferta.'; END IF;

  SELECT name INTO _lc FROM public.cards WHERE id = _l.card_id;

  -- carta anunciada → ofertante
  INSERT INTO public.user_cards (user_id, card_id, quantity) VALUES (_o.offerer_id, _l.card_id, 1)
  ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = public.user_cards.quantity + 1;

  -- cartas ofertadas → anunciante
  FOR _c IN SELECT card_id FROM public.trade_offer_cards WHERE offer_id = _offer_id LOOP
    INSERT INTO public.user_cards (user_id, card_id, quantity) VALUES (_l.seller_id, _c.card_id, 1)
    ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = public.user_cards.quantity + 1;
  END LOOP;

  UPDATE public.market_listings SET status = 'TRADED', buyer_id = _o.offerer_id, sold_at = now() WHERE id = _l.id;
  UPDATE public.trade_offers SET status = 'ACCEPTED', responded_at = now() WHERE id = _offer_id;

  -- demais ofertas voltam para os ofertantes
  PERFORM public.tcg_decline_trade_offer_inner(o.id) FROM public.trade_offers o
    WHERE o.listing_id = _l.id AND o.status = 'PENDING' AND o.id <> _offer_id;

  PERFORM public.tcg_track_event_owner(_l.seller_id, 'TRADES_COMPLETED', 1);
  PERFORM public.tcg_track_event_owner(_o.offerer_id, 'TRADES_COMPLETED', 1);

  SELECT string_agg(c.name, ', ') INTO _names
  FROM public.trade_offer_cards t JOIN public.cards c ON c.id = t.card_id
  WHERE t.offer_id = _offer_id;

  PERFORM public.tcg_notify(_o.offerer_id, 'Troca Aceita!',
    'Sua oferta foi aceita. Você recebeu ' || _lc.name || '.', 'TCG_TRADE');
  PERFORM public.tcg_notify(_l.seller_id, 'Troca Concluída',
    'Você trocou ' || _lc.name || ' e recebeu ' || COALESCE(_names, '—') || '.', 'TCG_TRADE');

  out_listing_card := _lc.name; out_offered_card := COALESCE(_names, '—');
  RETURN NEXT;
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_accept_trade_offer(uuid) TO authenticated;

-- ============================================================
-- 7. RPC — RECUSAR OFERTA (notifica o ofertante)
-- ============================================================
CREATE OR REPLACE FUNCTION public.tcg_decline_trade_offer(_offer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _o record; _l record; _names text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;
  SELECT * INTO _o FROM public.trade_offers WHERE id = _offer_id;
  IF _o.id IS NULL THEN RAISE EXCEPTION 'Oferta não encontrada.'; END IF;
  IF _o.status <> 'PENDING' THEN RAISE EXCEPTION 'Esta oferta não está mais pendente.'; END IF;

  SELECT * INTO _l FROM public.market_listings WHERE id = _o.listing_id;
  IF _l.seller_id <> _uid AND _o.offerer_id <> _uid THEN
    RAISE EXCEPTION 'Você não tem permissão para recusar esta oferta.'; END IF;

  SELECT string_agg(c.name, ', ') INTO _names
  FROM public.trade_offer_cards t JOIN public.cards c ON c.id = t.card_id
  WHERE t.offer_id = _offer_id;

  PERFORM public.tcg_decline_trade_offer_inner(_offer_id);

  IF _l.seller_id = _uid THEN
    PERFORM public.tcg_notify(_o.offerer_id, 'Oferta Recusada',
      'Sua oferta (' || COALESCE(_names, '—') || ') foi recusada. As cartas voltaram para sua coleção.', 'TCG_TRADE');
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_decline_trade_offer(uuid) TO authenticated;

-- ============================================================
-- 8. COMPRA — apenas anúncios de VENDA
-- ============================================================
CREATE OR REPLACE FUNCTION public.tcg_buy_listing(_listing_id uuid)
RETURNS TABLE(out_name text, out_price int, out_seller_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid(); _l record; _card record; _buyer_wallet int; _seller_name text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;
  PERFORM public.tcg_expire_listings();

  SELECT * INTO _l FROM public.market_listings WHERE id = _listing_id FOR UPDATE;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Anúncio não encontrado.'; END IF;
  IF _l.status <> 'ACTIVE' THEN RAISE EXCEPTION 'Anúncio não está mais ativo.'; END IF;
  IF _l.kind <> 'SALE' THEN RAISE EXCEPTION 'Este anúncio é apenas para troca.'; END IF;
  IF _l.seller_id = _uid THEN RAISE EXCEPTION 'Você não pode comprar sua própria carta.'; END IF;

  PERFORM public.tcg_ensure_wallet(_uid);
  SELECT essence INTO _buyer_wallet FROM public.tcg_wallets WHERE user_id = _uid;
  IF COALESCE(_buyer_wallet, 0) < _l.price_essence THEN
    RAISE EXCEPTION 'Essência insuficiente. Você tem %, precisa %.', COALESCE(_buyer_wallet, 0), _l.price_essence; END IF;

  SELECT c.name, c.rarity INTO _card FROM public.cards c WHERE c.id = _l.card_id;

  PERFORM public.tcg_ensure_wallet(_l.seller_id);
  UPDATE public.tcg_wallets SET essence = essence - _l.price_essence, updated_at = now() WHERE user_id = _uid;
  UPDATE public.tcg_wallets SET essence = essence + _l.price_essence, updated_at = now() WHERE user_id = _l.seller_id;

  INSERT INTO public.user_cards (user_id, card_id, quantity) VALUES (_uid, _l.card_id, 1)
  ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = public.user_cards.quantity + 1;

  UPDATE public.market_listings SET status = 'SOLD', buyer_id = _uid, sold_at = now() WHERE id = _listing_id;

  PERFORM public.tcg_decline_trade_offer_inner(o.id) FROM public.trade_offers o
    WHERE o.listing_id = _listing_id AND o.status = 'PENDING';

  SELECT COALESCE(p.username, split_part(u.email, '@', 1)) INTO _seller_name
  FROM public.tcg_players p JOIN auth.users u ON u.id = p.user_id
  WHERE p.user_id = _l.seller_id;

  PERFORM public.tcg_track_event_owner(_l.seller_id, 'CARDS_SOLD', 1);
  PERFORM public.tcg_track_event_owner(_l.seller_id, 'ESSENCE_EARNED_MARKET', _l.price_essence);

  PERFORM public.tcg_notify(_uid, 'Compra Concluída',
    'Você comprou ' || _card.name || ' por ' || _l.price_essence || ' de essência.', 'TCG_MARKET');
  PERFORM public.tcg_notify(_l.seller_id, 'Carta Vendida!',
    'Alguém comprou ' || _card.name || ' por ' || _l.price_essence || ' de essência.', 'TCG_MARKET');

  out_name := _card.name; out_price := _l.price_essence; out_seller_name := COALESCE(_seller_name, 'Vendedor');
  RETURN NEXT;
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_buy_listing(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
```

> Após rodar, recarregue o app. Os anúncios agora expiram em 24 horas.
