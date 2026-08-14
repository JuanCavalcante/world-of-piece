# 0033 — Pacotes de cartas guardados (abrir manualmente)

Execute no **SQL Editor** do Supabase.

Agora os packs não são abertos automaticamente: eles ficam guardados em `tcg_players.packs`
e o jogador abre um por vez pelo botão "Abrir pacote de cartas".

```sql
-- 1. Inventário de pacotes
ALTER TABLE public.tcg_players ADD COLUMN IF NOT EXISTS packs integer NOT NULL DEFAULT 0;

-- 2. Conceder pack passa a guardar o pacote (não entrega mais cartas na hora)
CREATE OR REPLACE FUNCTION public.tcg_grant_pack(_user_id uuid, _size int default 5)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n int := GREATEST(1, CEIL(COALESCE(_size, 5)::numeric / 5)::int);
BEGIN
  INSERT INTO public.tcg_players (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.tcg_players SET packs = COALESCE(packs, 0) + _n WHERE user_id = _user_id;
  RETURN _n;
END $$;

-- 3. Admin "dar pacote" também guarda o pacote
CREATE OR REPLACE FUNCTION public.admin_tcg_give_pack(_user_id uuid, _size int default 5)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem dar pacotes.';
  END IF;
  PERFORM public.tcg_grant_pack(_user_id, _size);
END $$;

GRANT EXECUTE ON FUNCTION public.admin_tcg_give_pack(uuid, int) TO authenticated;

-- 4. Abrir um pacote (5 cartas, com XP como na recompensa diária)
CREATE OR REPLACE FUNCTION public.tcg_open_pack()
RETURNS TABLE(out_card_id uuid, out_name text, out_rarity text, out_image_url text,
              out_is_new boolean, out_xp integer, out_total_xp integer, out_packs_left integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id uuid := auth.uid();
  _left int; _slot int; _r numeric; _rarity text; _pool text[]; _card record;
  _is_new boolean; _base int; _bonus int; _card_xp int; _total_xp int := 0;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;

  INSERT INTO public.tcg_players (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.tcg_players SET packs = COALESCE(packs, 0) - 1
  WHERE user_id = _user_id AND COALESCE(packs, 0) > 0
  RETURNING packs INTO _left;

  IF _left IS NULL THEN RAISE EXCEPTION 'Você não possui pacotes para abrir.'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.cards WHERE status = 'ACTIVE') THEN
    RAISE EXCEPTION 'Nenhuma carta ativa disponível no momento.';
  END IF;

  FOR _slot IN 1..5 LOOP
    _r := random() * 100;
    IF _slot <= 2 THEN
      _rarity := 'COMUM'; _pool := ARRAY['COMUM','INCOMUM','RARA','EPICA','LENDARIA'];
    ELSIF _slot = 3 THEN
      _rarity := CASE WHEN _r < 70 THEN 'INCOMUM' WHEN _r < 95 THEN 'RARA' WHEN _r < 99 THEN 'EPICA' ELSE 'LENDARIA' END;
      _pool := ARRAY['INCOMUM','RARA','EPICA','LENDARIA','COMUM'];
    ELSIF _slot = 4 THEN
      _rarity := CASE WHEN _r < 82 THEN 'RARA' WHEN _r < 99 THEN 'EPICA' ELSE 'LENDARIA' END;
      _pool := ARRAY['RARA','EPICA','LENDARIA','INCOMUM','COMUM'];
    ELSE
      _rarity := CASE WHEN _r < 60 THEN 'COMUM' WHEN _r < 88 THEN 'RARA' WHEN _r < 98 THEN 'EPICA' ELSE 'LENDARIA' END;
      _pool := ARRAY['COMUM','RARA','EPICA','LENDARIA','INCOMUM'];
    END IF;

    SELECT c.id, c.name, c.rarity, c.image_url INTO _card
    FROM public.cards c WHERE c.status = 'ACTIVE' AND c.rarity = _rarity ORDER BY random() LIMIT 1;
    IF NOT FOUND THEN
      SELECT c.id, c.name, c.rarity, c.image_url INTO _card FROM public.cards c
      WHERE c.status = 'ACTIVE' AND c.rarity = ANY(_pool)
      ORDER BY array_position(_pool, c.rarity), random() LIMIT 1;
    END IF;
    IF NOT FOUND THEN
      SELECT c.id, c.name, c.rarity, c.image_url INTO _card
      FROM public.cards c WHERE c.status = 'ACTIVE' ORDER BY random() LIMIT 1;
    END IF;

    SELECT NOT EXISTS (SELECT 1 FROM public.user_cards uc WHERE uc.user_id = _user_id AND uc.card_id = _card.id)
    INTO _is_new;

    INSERT INTO public.user_cards (user_id, card_id, quantity)
    VALUES (_user_id, _card.id, 1)
    ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = public.user_cards.quantity + 1;

    _base := CASE _card.rarity WHEN 'COMUM' THEN 5 WHEN 'INCOMUM' THEN 8 WHEN 'RARA' THEN 12
                               WHEN 'EPICA' THEN 30 WHEN 'LENDARIA' THEN 80 ELSE 5 END;
    _bonus := CASE WHEN NOT _is_new THEN 0
                   WHEN _card.rarity = 'COMUM' THEN 15 WHEN _card.rarity = 'INCOMUM' THEN 25
                   WHEN _card.rarity = 'RARA' THEN 40 WHEN _card.rarity = 'EPICA' THEN 100
                   WHEN _card.rarity = 'LENDARIA' THEN 250 ELSE 15 END;
    _card_xp := _base + _bonus;
    _total_xp := _total_xp + _card_xp;

    out_card_id := _card.id; out_name := _card.name; out_rarity := _card.rarity;
    out_image_url := _card.image_url; out_is_new := _is_new; out_xp := _card_xp;
    out_total_xp := _total_xp; out_packs_left := _left;
    RETURN NEXT;
  END LOOP;

  PERFORM public.tcg_grant_xp(_user_id, _total_xp);
END $$;

GRANT EXECUTE ON FUNCTION public.tcg_open_pack() TO authenticated;

-- 5. Reset de conta zera os pacotes guardados
CREATE OR REPLACE FUNCTION public.admin_tcg_reset_account(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem resetar contas.';
  END IF;

  DELETE FROM public.deck_cards WHERE deck_id IN (SELECT id FROM public.decks WHERE user_id = _user_id);
  DELETE FROM public.decks WHERE user_id = _user_id;
  DELETE FROM public.user_cards WHERE user_id = _user_id;
  DELETE FROM public.daily_rewards WHERE user_id = _user_id;
  DELETE FROM public.user_achievements WHERE user_id = _user_id;
  DELETE FROM public.user_daily_missions WHERE user_id = _user_id;
  DELETE FROM public.daily_streaks WHERE user_id = _user_id;
  DELETE FROM public.tcg_event_counters WHERE user_id = _user_id;
  DELETE FROM public.tcg_duel_matches WHERE user_id = _user_id;

  UPDATE public.tcg_players
  SET level = 1, xp = 0, wins = 0, losses = 0, last_daily_reward_at = null, packs = 0
  WHERE user_id = _user_id;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_tcg_reset_account(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
```
