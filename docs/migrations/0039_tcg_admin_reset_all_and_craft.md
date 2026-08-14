# Migração 0039 — Reset global, craft sem mínimo de cópias e dados do jogador no admin

Execute no **SQL Editor** do Supabase.

```sql
-- ============================================================
-- 1. DESMANTELAR / EXTRAIR sem exigir 2+ cópias
--    (mantém a regra de não usar cópias reservadas em baralhos)
-- ============================================================
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
  IF _qty IS NULL OR _qty < 1 THEN
    RAISE EXCEPTION 'Você não possui esta carta.'; END IF;

  _avail := public.tcg_available_qty(_uid, _card_id);
  IF _avail < 1 THEN
    RAISE EXCEPTION 'Esta carta está reservada em um baralho e não pode ser desmantelada.'; END IF;

  UPDATE public.user_cards SET quantity = quantity - 1
  WHERE user_id = _uid AND card_id = _card_id;
  DELETE FROM public.user_cards WHERE user_id = _uid AND card_id = _card_id AND quantity <= 0;

  PERFORM public.tcg_add_fragments(_uid, _card.rarity, 1);

  PERFORM public.tcg_track_event('CARDS_DISMANTLED', 1);
  PERFORM public.tcg_notify(_uid, 'Carta Desmantelada',
    'Você desmantelou ' || _card.name || ' e obteve 1 fragmento ' || _card.rarity, 'TCG_CRAFT');

  out_name := _card.name; out_rarity := _card.rarity; out_fragments := 1;
  RETURN NEXT;
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_dismantle_card(uuid) TO authenticated;

-- tcg_extract_essence já exige apenas 1 cópia disponível; recriado por clareza
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

  UPDATE public.user_cards SET quantity = quantity - 1
  WHERE user_id = _uid AND card_id = _card_id;
  DELETE FROM public.user_cards WHERE user_id = _uid AND card_id = _card_id AND quantity <= 0;

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
-- 2. RESETAR TODOS OS JOGADORES DO TCG (somente admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_tcg_reset_all_accounts()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem resetar contas.';
  END IF;

  DELETE FROM public.deck_cards;
  DELETE FROM public.decks;
  DELETE FROM public.user_cards;
  DELETE FROM public.daily_rewards;
  DELETE FROM public.user_achievements;
  DELETE FROM public.user_daily_missions;
  DELETE FROM public.daily_streaks;
  DELETE FROM public.tcg_event_counters;
  DELETE FROM public.tcg_duel_matches;

  UPDATE public.tcg_wallets SET essence = 0, common_fragments = 0, uncommon_fragments = 0,
    rare_fragments = 0, epic_fragments = 0, legendary_fragments = 0, updated_at = now();

  UPDATE public.tcg_players
  SET level = 1, xp = 0, wins = 0, losses = 0, last_daily_reward_at = null, packs = 0;

  SELECT count(*)::int INTO _count FROM public.tcg_players;
  RETURN _count;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_tcg_reset_all_accounts() TO authenticated;

-- ============================================================
-- 3. CARTEIRA E CONQUISTAS DE UM JOGADOR (admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_tcg_player_wallet(_user_id uuid)
RETURNS TABLE(
  essence int, common_fragments int, uncommon_fragments int,
  rare_fragments int, epic_fragments int, legendary_fragments int
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores.';
  END IF;
  PERFORM public.tcg_ensure_wallet(_user_id);
  RETURN QUERY
  SELECT w.essence, w.common_fragments, w.uncommon_fragments,
         w.rare_fragments, w.epic_fragments, w.legendary_fragments
  FROM public.tcg_wallets w WHERE w.user_id = _user_id;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_tcg_player_wallet(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_tcg_player_achievements(_user_id uuid)
RETURNS TABLE(
  achievement_id uuid, progress int, completed boolean, reward_claimed boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores.';
  END IF;
  RETURN QUERY
  SELECT ua.achievement_id, ua.progress, ua.completed, ua.reward_claimed
  FROM public.user_achievements ua WHERE ua.user_id = _user_id;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_tcg_player_achievements(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
```
