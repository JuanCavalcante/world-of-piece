# Migração 0054 — Reset de conta: erro `column "winner_id" does not exist`

Motivo: a versão 0053 assumia que `public.tcg_duel_matches` tinha as colunas
`winner_id`/`loser_id`. Após a 0050 a tabela passou a usar `user_id`/`opponent_id`
em alguns bancos, então o `DELETE` quebrava com
`column "winner_id" does not exist`.

Esta versão descobre dinamicamente quais colunas de usuário existem em cada
tabela e só apaga pelas que realmente existirem.

Execute no **SQL Editor** do Supabase.

```sql
CREATE OR REPLACE FUNCTION public.admin_tcg_reset_account(_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    _t text;
    _c text;
    _cols text[];
    _where text;
    -- tabela -> colunas candidatas que apontam para um usuário
    _targets jsonb := jsonb_build_object(
        'user_cards',            jsonb_build_array('user_id'),
        'daily_rewards',         jsonb_build_array('user_id'),
        'user_achievements',     jsonb_build_array('user_id'),
        'user_daily_missions',   jsonb_build_array('user_id'),
        'daily_streaks',         jsonb_build_array('user_id'),
        'tcg_player_stats',      jsonb_build_array('user_id'),
        'tcg_event_counters',    jsonb_build_array('user_id'),
        'tcg_pvp_queue',         jsonb_build_array('user_id'),
        'tcg_duel_matches',      jsonb_build_array('user_id','opponent_id','winner_id','loser_id'),
        'tcg_pvp_matches',       jsonb_build_array('player_a','player_b','winner_id','loser_id'),
        'tcg_market_listings',   jsonb_build_array('seller_id','buyer_id')
    );
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Apenas administradores podem resetar contas.';
    END IF;

    -- baralhos
    IF to_regclass('public.deck_cards') IS NOT NULL AND to_regclass('public.decks') IS NOT NULL THEN
        DELETE FROM public.deck_cards
         WHERE deck_id IN (SELECT id FROM public.decks WHERE user_id = _user_id);
    END IF;
    IF to_regclass('public.decks') IS NOT NULL THEN
        DELETE FROM public.decks WHERE user_id = _user_id;
    END IF;

    FOR _t IN SELECT jsonb_object_keys(_targets) LOOP
        CONTINUE WHEN to_regclass('public.' || _t) IS NULL;

        _cols := ARRAY[]::text[];
        FOR _c IN SELECT jsonb_array_elements_text(_targets -> _t) LOOP
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = _t AND column_name = _c
            ) THEN
                _cols := _cols || _c;
            END IF;
        END LOOP;

        CONTINUE WHEN array_length(_cols, 1) IS NULL;

        SELECT string_agg(format('%I = $1', c), ' OR ') INTO _where FROM unnest(_cols) AS c;
        EXECUTE format('DELETE FROM public.%I WHERE %s', _t, _where) USING _user_id;
    END LOOP;

    IF to_regclass('public.tcg_wallets') IS NOT NULL THEN
        UPDATE public.tcg_wallets
           SET essence = 0, common_fragments = 0, uncommon_fragments = 0,
               rare_fragments = 0, epic_fragments = 0, legendary_fragments = 0,
               updated_at = now()
         WHERE user_id = _user_id;
    END IF;

    UPDATE public.tcg_players
       SET level = 1, xp = 0, wins = 0, losses = 0, last_daily_reward_at = NULL, packs = 0
     WHERE user_id = _user_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_tcg_reset_account(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
```
