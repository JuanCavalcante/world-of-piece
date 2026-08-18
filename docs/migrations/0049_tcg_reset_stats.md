# Migração 0049 — Reset também zera VR/estatísticas de ranking

Motivo: `admin_tcg_reset_account` e `admin_tcg_reset_all_accounts` não limpavam
`public.tcg_player_stats` (VR, vitórias, derrotas, streaks) nem o histórico JxJ,
então a conta resetada continuava aparecendo no ranking.

Execute no **SQL Editor** do Supabase.

```sql
-- ============================================================
-- 1. RESET INDIVIDUAL (admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_tcg_reset_account(_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    DELETE FROM public.tcg_duel_matches
      WHERE winner_id = _user_id OR loser_id = _user_id;

    -- estatísticas competitivas (VR / streaks) usadas pelo ranking
    DELETE FROM public.tcg_player_stats WHERE user_id = _user_id;

    UPDATE public.tcg_wallets
    SET essence = 0, common_fragments = 0, uncommon_fragments = 0,
        rare_fragments = 0, epic_fragments = 0, legendary_fragments = 0,
        updated_at = now()
    WHERE user_id = _user_id;

    UPDATE public.tcg_players
    SET level = 1, xp = 0, wins = 0, losses = 0, last_daily_reward_at = NULL, packs = 0
    WHERE user_id = _user_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_tcg_reset_account(uuid) TO authenticated;

-- ============================================================
-- 2. RESET GLOBAL (admin)
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
  DELETE FROM public.tcg_player_stats;

  UPDATE public.tcg_wallets SET essence = 0, common_fragments = 0, uncommon_fragments = 0,
    rare_fragments = 0, epic_fragments = 0, legendary_fragments = 0, updated_at = now();

  UPDATE public.tcg_players
  SET level = 1, xp = 0, wins = 0, losses = 0, last_daily_reward_at = null, packs = 0;

  SELECT count(*)::int INTO _count FROM public.tcg_players;
  RETURN _count;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_tcg_reset_all_accounts() TO authenticated;

-- ============================================================
-- 3. CORREÇÃO PONTUAL: zerar o VR de quem já foi resetado antes
--    (troque o e-mail/uuid pelo jogador em questão)
-- ============================================================
-- DELETE FROM public.tcg_player_stats WHERE user_id = '00000000-0000-0000-0000-000000000000';
-- DELETE FROM public.tcg_duel_matches
--   WHERE winner_id = '00000000-...' OR loser_id = '00000000-...';

NOTIFY pgrst, 'reload schema';
```
