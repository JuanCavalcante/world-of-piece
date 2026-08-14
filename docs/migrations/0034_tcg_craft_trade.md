# 0034 — Criação (Craft) e Mercado/Trocas (Trade) no WOP TCG

Execute no **SQL Editor** do Supabase (New query → colar → Run).

Introduz duas moedas (Essence e Fragmentos por raridade), carteira isolada,
forja/desmanter/extrair, mercado de cartas com essência e trocas carta-por-carta.
Todas as mutações de economia são RPCs `SECURITY DEFINER` atômicos (escrow) para
evitar duplicação e exploits.

```sql
-- ============================================================
-- 0. HELPERS GENÉRICOS
-- ============================================================

-- Notificar um usuário (não exposto a authenticated — só chamado internamente)
CREATE OR REPLACE FUNCTION public.tcg_notify(_user_id uuid, _title text, _message text, _type text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (_user_id, _title, _message, _type);
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_notify(uuid, text, text, text) TO service_role;

-- Quantidade "disponível" de uma carta = posse − cartas reservadas em baralhos
CREATE OR REPLACE FUNCTION public.tcg_available_qty(_user_id uuid, _card_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(COALESCE(uc.quantity, 0) - COALESCE((
    SELECT SUM(dc.quantity)::int FROM public.deck_cards dc
    JOIN public.decks d ON d.id = dc.deck_id
    WHERE d.user_id = _user_id AND dc.card_id = _card_id
  ), 0), 0)
  FROM public.user_cards uc
  WHERE uc.user_id = _user_id AND uc.card_id = _card_id
$$;
GRANT EXECUTE ON FUNCTION public.tcg_available_qty(uuid, uuid) TO authenticated;

-- Adicionar fragmentos de uma raridade
CREATE OR REPLACE FUNCTION public.tcg_add_fragments(_user_id uuid, _rarity text, _amount int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _col text;
BEGIN
  _col := CASE _rarity
    WHEN 'COMUM' THEN 'common_fragments'
    WHEN 'INCOMUM' THEN 'uncommon_fragments'
    WHEN 'RARA' THEN 'rare_fragments'
    WHEN 'EPICA' THEN 'epic_fragments'
    WHEN 'LENDARIA' THEN 'legendary_fragments'
    ELSE NULL END;
  IF _col IS NULL THEN RAISE EXCEPTION 'Raridade inválida: %', _rarity; END IF;
  PERFORM public.tcg_ensure_wallet(_user_id);
  EXECUTE format(
    'UPDATE public.tcg_wallets SET %I = GREATEST(0, %I) + $1, updated_at = now() WHERE user_id = $2',
    _col, _col
  ) USING GREATEST(_amount, 0), _user_id;
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_add_fragments(uuid, text, int) TO service_role;

-- Ler fragmentos de uma raridade
CREATE OR REPLACE FUNCTION public.tcg_get_fragments(_user_id uuid, _rarity text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _col text; _val int;
BEGIN
  _col := CASE _rarity
    WHEN 'COMUM' THEN 'common_fragments'
    WHEN 'INCOMUM' THEN 'uncommon_fragments'
    WHEN 'RARA' THEN 'rare_fragments'
    WHEN 'EPICA' THEN 'epic_fragments'
    WHEN 'LENDARIA' THEN 'legendary_fragments'
    ELSE NULL END;
  IF _col IS NULL THEN RETURN 0; END IF;
  EXECUTE format('SELECT %I FROM public.tcg_wallets WHERE user_id = $1', _col) INTO _val USING _user_id;
  RETURN COALESCE(_val, 0);
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_get_fragments(uuid, text) TO authenticated;

-- ============================================================
-- 1. CARTEIRA (WALLET)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tcg_wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  essence integer NOT NULL DEFAULT 0 CHECK (essence >= 0),
  common_fragments integer NOT NULL DEFAULT 0 CHECK (common_fragments >= 0),
  uncommon_fragments integer NOT NULL DEFAULT 0 CHECK (uncommon_fragments >= 0),
  rare_fragments integer NOT NULL DEFAULT 0 CHECK (rare_fragments >= 0),
  epic_fragments integer NOT NULL DEFAULT 0 CHECK (epic_fragments >= 0),
  legendary_fragments integer NOT NULL DEFAULT 0 CHECK (legendary_fragments >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tcg_wallets TO authenticated;
GRANT ALL ON public.tcg_wallets TO service_role;

ALTER TABLE public.tcg_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tcg_wallets self read" ON public.tcg_wallets;
CREATE POLICY "tcg_wallets self read"
  ON public.tcg_wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.tcg_ensure_wallet(_user_id uuid)
RETURNS public.tcg_wallets LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.tcg_wallets;
BEGIN
  INSERT INTO public.tcg_wallets (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO r FROM public.tcg_wallets WHERE user_id = _user_id;
  RETURN r;
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_ensure_wallet(uuid) TO authenticated;

-- Garantia da própria carteira ao entrar no TCG
CREATE OR REPLACE FUNCTION public.tcg_ensure_wallet_self()
RETURNS public.tcg_wallets LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  RETURN public.tcg_ensure_wallet(auth.uid());
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_ensure_wallet_self() TO authenticated;

-- ============================================================
-- 2. MERCADO (LISTINGS)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.market_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  price_essence integer NOT NULL CHECK (price_essence > 0),
  status text NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | SOLD | CANCELED | EXPIRED | TRADED
  buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sold_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS market_listings_active_idx ON public.market_listings(status, created_at desc);
CREATE INDEX IF NOT EXISTS market_listings_seller_idx ON public.market_listings(seller_id, status);

GRANT SELECT ON public.market_listings TO authenticated;
GRANT ALL ON public.market_listings TO service_role;

ALTER TABLE public.market_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "market_listings read" ON public.market_listings;
CREATE POLICY "market_listings read"
  ON public.market_listings FOR SELECT TO authenticated
  USING (status = 'ACTIVE' OR seller_id = auth.uid());

-- ============================================================
-- 3. OFERTAS DE TROCA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trade_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.market_listings(id) ON DELETE CASCADE,
  offerer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offered_card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING', -- PENDING | ACCEPTED | DECLINED | CANCELED
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (listing_id, offerer_id)
);

CREATE INDEX IF NOT EXISTS trade_offers_listing_idx ON public.trade_offers(listing_id, status);

GRANT SELECT ON public.trade_offers TO authenticated;
GRANT ALL ON public.trade_offers TO service_role;

ALTER TABLE public.trade_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trade_offers read" ON public.trade_offers;
CREATE POLICY "trade_offers read"
  ON public.trade_offers FOR SELECT TO authenticated
  USING (offerer_id = auth.uid()
     OR EXISTS (SELECT 1 FROM public.market_listings ml WHERE ml.id = trade_offers.listing_id AND ml.seller_id = auth.uid()));

-- ============================================================
-- 4. RPCs — CRAFT (FORJAR / DESMANTELAR / EXTRAIR)
-- ============================================================

-- FORJAR: 10 fragmentos da raridade → 1 carta aleatória ACTIVE da mesma raridade
CREATE OR REPLACE FUNCTION public.tcg_forge_card(_rarity text)
RETURNS TABLE(out_card_id uuid, out_name text, out_rarity text, out_image_url text, out_is_new boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _have int; _card record; _is_new boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;
  IF _rarity NOT IN ('COMUM','INCOMUM','RARA','EPICA','LENDARIA') THEN
    RAISE EXCEPTION 'Raridade inválida.'; END IF;

  _have := public.tcg_get_fragments(_uid, _rarity);
  IF _have < 10 THEN
    RAISE EXCEPTION 'Fragmentos insuficientes. Necessário 10 de %.', _rarity; END IF;

  SELECT c.id, c.name, c.rarity, c.image_url INTO _card
  FROM public.cards c WHERE c.status = 'ACTIVE' AND c.rarity = _rarity
  ORDER BY random() LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nenhuma carta ativa da raridade % disponível para forjar.', _rarity; END IF;

  -- consumir 10 fragmentos
  PERFORM public.tcg_add_fragments(_uid, _rarity, -10);

  -- conceder carta
  SELECT NOT EXISTS (SELECT 1 FROM public.user_cards uc WHERE uc.user_id = _uid AND uc.card_id = _card.id) INTO _is_new;
  INSERT INTO public.user_cards (user_id, card_id, quantity) VALUES (_uid, _card.id, 1)
  ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = public.user_cards.quantity + 1;

  -- track + notificar
  PERFORM public.tcg_track_event('CARDS_FORGED', 1);
  PERFORM public.tcg_notify(_uid, 'Carta Forjada!',
    'Você forjou uma carta ' || _card.rarity || ': ' || _card.name, 'TCG_CRAFT');

  out_card_id := _card.id; out_name := _card.name; out_rarity := _card.rarity;
  out_image_url := _card.image_url; out_is_new := _is_new;
  RETURN NEXT;
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_forge_card(text) TO authenticated;

-- DESMANTELAR: 1 cópia excedente (qty>=2, disponível) → 1 fragmento da raridade
CREATE OR REPLACE FUNCTION public.tcg_dismantle_card(_card_id uuid)
RETURNS TABLE(out_name text, out_rarity text, out_fragments int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid(); _card record; _qty int; _avail int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;

  SELECT c.id, c.name, c.rarity INTO _card FROM public.cards c WHERE c.id = _card_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Carta não encontrada.'; END IF;

  SELECT quantity INTO _qty FROM public.user_cards WHERE user_id = _uid AND card_id = _card_id;
  IF _qty IS NULL OR _qty < 2 THEN
    RAISE EXCEPTION 'Você precisa de pelo menos 2 cópias para desmantelar.'; END IF;

  _avail := public.tcg_available_qty(_uid, _card_id);
  IF _avail < 1 THEN
    RAISE EXCEPTION 'Esta carta está reservada em um baralho e não pode ser desmantelada.'; END IF;

  -- remover 1 cópia
  UPDATE public.user_cards SET quantity = quantity - 1
  WHERE user_id = _uid AND card_id = _card_id;
  -- limpar linha zerada
  DELETE FROM public.user_cards WHERE user_id = _uid AND card_id = _card_id AND quantity <= 0;

  -- +1 fragmento da raridade
  PERFORM public.tcg_add_fragments(_uid, _card.rarity, 1);

  PERFORM public.tcg_track_event('CARDS_DISMANTLED', 1);
  PERFORM public.tcg_notify(_uid, 'Carta Desmantelada',
    'Você desmantelou ' || _card.name || ' e obteve 1 fragmento ' || _card.rarity, 'TCG_CRAFT');

  out_name := _card.name; out_rarity := _card.rarity; out_fragments := 1;
  RETURN NEXT;
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_dismantle_card(uuid) TO authenticated;

-- EXTRAIR ESSÊNCIA: sacrificar 1 cópia (disponível) → essence por raridade
CREATE OR REPLACE FUNCTION public.tcg_extract_essence(_card_id uuid)
RETURNS TABLE(out_name text, out_rarity text, out_essence int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid(); _card record; _avail int; _gain int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;

  SELECT c.id, c.name, c.rarity INTO _card FROM public.cards c WHERE c.id = _card_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Carta não encontrada.'; END IF;

  _avail := public.tcg_available_qty(_uid, _card_id);
  IF _avail < 1 THEN
    RAISE EXCEPTION 'Nenhuma cópia disponível (a carta pode estar reservada em um baralho).'; END IF;

  _gain := CASE _card.rarity WHEN 'COMUM' THEN 10 WHEN 'INCOMUM' THEN 25
           WHEN 'RARA' THEN 60 WHEN 'EPICA' THEN 150 WHEN 'LENDARIA' THEN 400 ELSE 10 END;

  -- remover 1 cópia
  UPDATE public.user_cards SET quantity = quantity - 1
  WHERE user_id = _uid AND card_id = _card_id;
  DELETE FROM public.user_cards WHERE user_id = _uid AND card_id = _card_id AND quantity <= 0;

  -- conceder essence
  PERFORM public.tcg_ensure_wallet(_uid);
  UPDATE public.tcg_wallets SET essence = essence + _gain, updated_at = now() WHERE user_id = _uid;

  PERFORM public.tcg_track_event('ESSENCE_EXTRACTED', _gain);
  PERFORM public.tcg_notify(_uid, 'Essência Extraída',
    'Você extraiu ' || _gain || ' de essência de ' || _card.name, 'TCG_CRAFT');

  out_name := _card.name; out_rarity := _card.rarity; out_essence := _gain;
  RETURN NEXT;
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_extract_essence(uuid) TO authenticated;

-- ============================================================
-- 5. RPCs — MERCADO
-- ============================================================

-- Expirar anúncios vencidos (devolve escrow)
CREATE OR REPLACE FUNCTION public.tcg_expire_listings()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _lid uuid; _seller uuid; _card uuid;
BEGIN
  FOR _lid, _seller, _card IN
    SELECT id, seller_id, card_id FROM public.market_listings
    WHERE status = 'ACTIVE' AND expires_at < now()
  LOOP
    UPDATE public.market_listings SET status = 'EXPIRED' WHERE id = _lid;
    INSERT INTO public.user_cards (user_id, card_id, quantity) VALUES (_seller, _card, 1)
    ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = public.user_cards.quantity + 1;
    -- cancelar ofertas pendentes (devolver escrow do offerer)
    PERFORM public.tcg_decline_trade_offer_inner(o.id) FROM public.trade_offers o
      WHERE o.listing_id = _lid AND o.status = 'PENDING';
    PERFORM public.tcg_notify(_seller, 'Anúncio Expirado',
      'Seu anúncio expirou e a carta voltou para sua coleção.', 'TCG_MARKET');
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_expire_listings() TO service_role;

-- Criar anúncio (escrow: remove 1 cópia do vendedor)
CREATE OR REPLACE FUNCTION public.tcg_create_listing(_card_id uuid, _price_essence int)
RETURNS TABLE(out_id uuid, out_name text, out_price int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid(); _card record; _avail int; _active int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;
  IF _price_essence IS NULL OR _price_essence <= 0 THEN
    RAISE EXCEPTION 'Preço deve ser maior que zero.'; END IF;

  SELECT c.id, c.name INTO _card FROM public.cards c WHERE c.id = _card_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Carta não encontrada.'; END IF;

  _avail := public.tcg_available_qty(_uid, _card_id);
  IF _avail < 1 THEN
    RAISE EXCEPTION 'Carta não disponível (pode estar reservada em um baralho).'; END IF;

  SELECT count(*)::int INTO _active FROM public.market_listings
  WHERE seller_id = _uid AND status = 'ACTIVE';
  IF _active >= 3 THEN
    RAISE EXCEPTION 'Você já possui 3 anúncios ativos (limite máximo).'; END IF;

  -- escrow: remover 1 cópia do vendedor
  UPDATE public.user_cards SET quantity = quantity - 1
  WHERE user_id = _uid AND card_id = _card_id;
  DELETE FROM public.user_cards WHERE user_id = _uid AND card_id = _card_id AND quantity <= 0;

  INSERT INTO public.market_listings (seller_id, card_id, price_essence)
  VALUES (_uid, _card_id, _price_essence)
  RETURNING id INTO out_id;

  PERFORM public.tcg_notify(_uid, 'Anúncio Criado',
    'Sua carta ' || _card.name || ' foi listada por ' || _price_essence || ' de essência.', 'TCG_MARKET');

  out_name := _card.name; out_price := _price_essence;
  RETURN NEXT;
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_create_listing(uuid, int) TO authenticated;

-- Cancelar anúncio (devolve escrow)
CREATE OR REPLACE FUNCTION public.tcg_cancel_listing(_listing_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _l record;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;
  SELECT * INTO _l FROM public.market_listings WHERE id = _listing_id;
  IF _l.seller_id IS NULL THEN RAISE EXCEPTION 'Anúncio não encontrado.'; END IF;
  IF _l.seller_id <> _uid THEN RAISE EXCEPTION 'Este anúncio não é seu.'; END IF;
  IF _l.status <> 'ACTIVE' THEN RAISE EXCEPTION 'Apenas anúncios ativos podem ser cancelados.'; END IF;

  UPDATE public.market_listings SET status = 'CANCELED' WHERE id = _listing_id;
  INSERT INTO public.user_cards (user_id, card_id, quantity) VALUES (_uid, _l.card_id, 1)
  ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = public.user_cards.quantity + 1;

  PERFORM public.tcg_decline_trade_offer_inner(o.id) FROM public.trade_offers o
    WHERE o.listing_id = _listing_id AND o.status = 'PENDING';
  PERFORM public.tcg_notify(_uid, 'Anúncio Cancelado',
    'Seu anúncio foi cancelado e a carta voltou para sua coleção.', 'TCG_MARKET');
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_cancel_listing(uuid) TO authenticated;

-- Comprar anúncio (essence → carta)
CREATE OR REPLACE FUNCTION public.tcg_buy_listing(_listing_id uuid)
RETURNS TABLE(out_name text, out_price int, out_seller_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid(); _l record; _card record; _buyer_wallet int;
  _seller_email text; _seller_name text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;
  PERFORM public.tcg_expire_listings();

  SELECT * INTO _l FROM public.market_listings WHERE id = _listing_id FOR UPDATE;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Anúncio não encontrado.'; END IF;
  IF _l.status <> 'ACTIVE' THEN RAISE EXCEPTION 'Anúncio não está mais ativo.'; END IF;
  IF _l.seller_id = _uid THEN RAISE EXCEPTION 'Você não pode comprar sua própria carta.'; END IF;

  SELECT essence INTO _buyer_wallet FROM public.tcg_wallets WHERE user_id = _uid;
  IF _buyer_wallet IS NULL THEN _buyer_wallet := 0; PERFORM public.tcg_ensure_wallet(_uid); END IF;
  IF _buyer_wallet < _l.price_essence THEN
    RAISE EXCEPTION 'Essência insuficiente. Você tem %, precisa %.', _buyer_wallet, _l.price_essence; END IF;

  SELECT c.name, c.rarity INTO _card FROM public.cards c WHERE c.id = _l.card_id;

  -- pagar
  UPDATE public.tcg_wallets SET essence = essence - _l.price_essence, updated_at = now() WHERE user_id = _uid;
  UPDATE public.tcg_wallets SET essence = essence + _l.price_essence, updated_at = now() WHERE user_id = _l.seller_id;

  -- carta → comprador
  INSERT INTO public.user_cards (user_id, card_id, quantity) VALUES (_uid, _l.card_id, 1)
  ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = public.user_cards.quantity + 1;

  -- fechar anúncio
  UPDATE public.market_listings SET status = 'SOLD', buyer_id = _uid, sold_at = now() WHERE id = _listing_id;

  -- recusar ofertas pendentes (devolver escrow)
  PERFORM public.tcg_decline_trade_offer_inner(o.id) FROM public.trade_offers o
    WHERE o.listing_id = _listing_id AND o.status = 'PENDING';

  -- nome do vendedor p/ notificação
  SELECT COALESCE(p.username, split_part(u.email, '@', 1)) INTO _seller_name
  FROM public.tcg_players p JOIN auth.users u ON u.id = p.user_id
  WHERE p.user_id = _l.seller_id;

  -- track (vendedor)
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

-- ============================================================
-- 6. RPCs — TROCAS
-- ============================================================

-- Helper interno: recusar oferta devolvendo escrow
CREATE OR REPLACE FUNCTION public.tcg_decline_trade_offer_inner(_offer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o record;
BEGIN
  SELECT * INTO _o FROM public.trade_offers WHERE id = _offer_id AND status = 'PENDING';
  IF _o.id IS NULL THEN RETURN; END IF;
  UPDATE public.trade_offers SET status = 'DECLINED', responded_at = now() WHERE id = _offer_id;
  INSERT INTO public.user_cards (user_id, card_id, quantity) VALUES (_o.offerer_id, _o.offered_card_id, 1)
  ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = public.user_cards.quantity + 1;
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_decline_trade_offer_inner(uuid) TO service_role;

-- track_event parametrizado por dono (para rastrear eventos do vendedor na compra)
CREATE OR REPLACE FUNCTION public.tcg_track_event_owner(_user_id uuid, _trigger text, _amount int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.tcg_event_counters (user_id, trigger_type, value)
  VALUES (_user_id, _trigger, GREATEST(COALESCE(_amount, 1), 0))
  ON CONFLICT (user_id, trigger_type)
  DO UPDATE SET value = public.tcg_event_counters.value + GREATEST(COALESCE(_amount, 1), 0);
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_track_event_owner(uuid, text, int) TO service_role;

-- Criar oferta de troca (escrow: remove 1 cópia do offerer)
CREATE OR REPLACE FUNCTION public.tcg_create_trade_offer(_listing_id uuid, _offered_card_id uuid)
RETURNS TABLE(out_id uuid, out_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid(); _l record; _card record; _avail int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;
  PERFORM public.tcg_expire_listings();

  SELECT * INTO _l FROM public.market_listings WHERE id = _listing_id;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Anúncio não encontrado.'; END IF;
  IF _l.status <> 'ACTIVE' THEN RAISE EXCEPTION 'Anúncio não está mais ativo.'; END IF;
  IF _l.seller_id = _uid THEN RAISE EXCEPTION 'Você não pode oferecer troca no seu próprio anúncio.'; END IF;

  -- já existe oferta pendente deste usuário neste anúncio?
  IF EXISTS (SELECT 1 FROM public.trade_offers WHERE listing_id = _listing_id AND offerer_id = _uid AND status = 'PENDING') THEN
    RAISE EXCEPTION 'Você já tem uma oferta pendente neste anúncio.'; END IF;

  SELECT name INTO _card FROM public.cards WHERE id = _offered_card_id;
  IF _card.name IS NULL THEN RAISE EXCEPTION 'Carta oferecida não encontrada.'; END IF;

  _avail := public.tcg_available_qty(_uid, _offered_card_id);
  IF _avail < 1 THEN
    RAISE EXCEPTION 'A carta oferecida não está disponível (pode estar reservada em um baralho).'; END IF;

  -- escrow do offerer
  UPDATE public.user_cards SET quantity = quantity - 1
  WHERE user_id = _uid AND card_id = _offered_card_id;
  DELETE FROM public.user_cards WHERE user_id = _uid AND card_id = _offered_card_id AND quantity <= 0;

  INSERT INTO public.trade_offers (listing_id, offerer_id, offered_card_id)
  VALUES (_listing_id, _uid, _offered_card_id)
  RETURNING id INTO out_id;

  PERFORM public.tcg_notify(_l.seller_id, 'Nova Oferta de Troca',
    'Alguém ofereceu uma carta em troca do seu anúncio de ' ||
    (SELECT name FROM public.cards WHERE id = _l.card_id) || '.', 'TCG_TRADE');

  out_name := _card.name;
  RETURN NEXT;
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_create_trade_offer(uuid, uuid) TO authenticated;

-- Aceitar oferta (swap atômico)
CREATE OR REPLACE FUNCTION public.tcg_accept_trade_offer(_offer_id uuid)
RETURNS TABLE(out_listing_card text, out_offered_card text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid(); _o record; _l record; _lc record; _oc record;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;
  SELECT * INTO _o FROM public.trade_offers WHERE id = _offer_id FOR UPDATE;
  IF _o.id IS NULL THEN RAISE EXCEPTION 'Oferta não encontrada.'; END IF;
  IF _o.status <> 'PENDING' THEN RAISE EXCEPTION 'Esta oferta não está mais pendente.'; END IF;

  SELECT * INTO _l FROM public.market_listings WHERE id = _o.listing_id FOR UPDATE;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Anúncio não encontrado.'; END IF;
  IF _l.status <> 'ACTIVE' THEN RAISE EXCEPTION 'Anúncio não está mais ativo.'; END IF;
  IF _l.seller_id <> _uid THEN RAISE EXCEPTION 'Apenas o dono do anúncio pode aceitar a oferta.'; END IF;

  SELECT name, rarity INTO _lc FROM public.cards WHERE id = _l.card_id;
  SELECT name, rarity INTO _oc FROM public.cards WHERE id = _o.offered_card_id;

  -- carta do anúncio → offerer
  INSERT INTO public.user_cards (user_id, card_id, quantity) VALUES (_o.offerer_id, _l.card_id, 1)
  ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = public.user_cards.quantity + 1;
  -- carta oferecida → vendedor
  INSERT INTO public.user_cards (user_id, card_id, quantity) VALUES (_l.seller_id, _o.offered_card_id, 1)
  ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = public.user_cards.quantity + 1;

  -- fechar anúncio e oferta
  UPDATE public.market_listings SET status = 'TRADED', buyer_id = _o.offerer_id, sold_at = now() WHERE id = _l.id;
  UPDATE public.trade_offers SET status = 'ACCEPTED', responded_at = now() WHERE id = _offer_id;

  -- recusar demais ofertas (devolver escrow)
  PERFORM public.tcg_decline_trade_offer_inner(o.id) FROM public.trade_offers o
    WHERE o.listing_id = _l.id AND o.status = 'PENDING' AND o.id <> _offer_id;

  -- track troca (ambos)
  PERFORM public.tcg_track_event_owner(_l.seller_id, 'TRADES_COMPLETED', 1);
  PERFORM public.tcg_track_event_owner(_o.offerer_id, 'TRADES_COMPLETED', 1);

  PERFORM public.tcg_notify(_o.offerer_id, 'Troca Aceita!',
    'Sua oferta de troca foi aceita. Você recebeu ' || _lc.name || '.', 'TCG_TRADE');
  PERFORM public.tcg_notify(_l.seller_id, 'Troca Concluída',
    'Você trocou ' || _lc.name || ' e recebeu ' || _oc.name || '.', 'TCG_TRADE');

  out_listing_card := _lc.name; out_offered_card := _oc.name;
  RETURN NEXT;
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_accept_trade_offer(uuid) TO authenticated;

-- Recusar oferta (devolve escrow, notifica)
CREATE OR REPLACE FUNCTION public.tcg_decline_trade_offer(_offer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _o record; _l record; _card record;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;
  SELECT * INTO _o FROM public.trade_offers WHERE id = _offer_id;
  IF _o.id IS NULL THEN RAISE EXCEPTION 'Oferta não encontrada.'; END IF;
  IF _o.status <> 'PENDING' THEN RAISE EXCEPTION 'Esta oferta não está mais pendente.'; END IF;

  SELECT * INTO _l FROM public.market_listings WHERE id = _o.listing_id;
  -- dono do anúncio OU próprio offerer (cancelamento) podem recusar
  IF _l.seller_id <> _uid AND _o.offerer_id <> _uid THEN
    RAISE EXCEPTION 'Você não tem permissão para recusar esta oferta.'; END IF;

  PERFORM public.tcg_decline_trade_offer_inner(_offer_id);

  SELECT name INTO _card FROM public.cards WHERE id = _o.offered_card_id;
  IF _l.seller_id = _uid THEN
    PERFORM public.tcg_notify(_o.offerer_id, 'Oferta Recusada',
      'Sua oferta de troca por ' || _card.name || ' foi recusada.', 'TCG_TRADE');
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_decline_trade_offer(uuid) TO authenticated;

-- ============================================================
-- 7. CONQUISTAS NOVAS
-- ============================================================
INSERT INTO public.achievements (title, description, category, icon, xp_reward, pack_reward, target_value, trigger_type) VALUES
  -- COLLECTION (forja / desmanter / extrair)
  ('Primeira Forja', 'Forje 1 carta.', 'COLLECTION', 'Sparkles', 50, 0, 1, 'CARDS_FORGED'),
  ('Alquimista', 'Forje 10 cartas.', 'COLLECTION', 'Flame', 150, 1, 10, 'CARDS_FORGED'),
  ('Desmantelador', 'Desmonte 25 cartas.', 'COLLECTION', 'Layers', 120, 0, 25, 'CARDS_DISMANTLED'),
  ('Essência Pura', 'Extraia 1000 de essência.', 'COLLECTION', 'Coins', 250, 1, 1000, 'ESSENCE_EXTRACTED'),
  -- MARKET (trocas / vendas)
  ('Primeira Troca', 'Conclua 1 troca.', 'MARKET', 'ArrowLeftRight', 50, 0, 1, 'TRADES_COMPLETED'),
  ('Mercador dos Mares', 'Conclua 10 trocas.', 'MARKET', 'Medal', 120, 1, 10, 'TRADES_COMPLETED'),
  ('Grande Comerciante', 'Conclua 50 trocas.', 'MARKET', 'Crown', 400, 3, 50, 'TRADES_COMPLETED'),
  ('Primeira Venda', 'Venda 1 carta no mercado.', 'MARKET', 'Coins', 50, 0, 1, 'CARDS_SOLD'),
  ('Colecionador Rico', 'Ganhe 1000 de essência em vendas.', 'MARKET', 'Trophy', 300, 2, 1000, 'ESSENCE_EARNED_MARKET')
ON CONFLICT (title) DO UPDATE SET
  description = excluded.description, category = excluded.category, icon = excluded.icon,
  xp_reward = excluded.xp_reward, pack_reward = excluded.pack_reward,
  target_value = excluded.target_value, trigger_type = excluded.trigger_type;

NOTIFY pgrst, 'reload schema';
```

> Após rodar, publique o app para que as novas RPCs estejam disponíveis em produção.
