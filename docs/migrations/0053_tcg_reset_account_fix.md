# Migração 0053 — Correção do reset de conta do TCG

Motivo: `admin_tcg_reset_account` falhava ("Falha ao aplicar ação") quando alguma
tabela citada não existia no banco ou quando restavam registros novos do PvP
(fila/partidas JxJ, ofertas de mercado) apontando para o jogador.

Esta versão é defensiva: só apaga tabelas que existem (`to_regclass`) e cobre
todas as tabelas criadas depois da 0049.

Execute no **SQL Editor** do Supabase.

```sql
CREATE OR REPLACE FUNCTION public.admin_tcg_reset_account(_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    _t text;
    _tables_user text[] := ARRAY[
        'user_cards','daily_rewards','user_achievements','user_daily_missions',
        'daily_streaks','tcg_player_stats','tcg_event_counters','tcg_pvp_queue'
    ];
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Apenas administradores podem resetar contas.';
    END IF;

    -- baralhos
    IF to_regclass('public.deck_cards') IS NOT NULL THEN
        DELETE FROM public.deck_cards WHERE deck_id IN (SELECT id FROM public.decks WHERE user_id = _user_id);
    END IF;
    IF to_regclass('public.decks') IS NOT NULL THEN
        DELETE FROM public.decks WHERE user_id = _user_id;
    END IF;

    -- tabelas simples com coluna user_id
    FOREACH _t IN ARRAY _tables_user LOOP
        IF to_regclass('public.' || _t) IS NOT NULL THEN
            EXECUTE format('DELETE FROM public.%I WHERE user_id = $1', _t) USING _user_id;
        END IF;
    END LOOP;

    -- histórico de duelos (JxIA e JxJ)
    IF to_regclass('public.tcg_duel_matches') IS NOT NULL THEN
        DELETE FROM public.tcg_duel_matches WHERE winner_id = _user_id OR loser_id = _user_id;
    END IF;

    -- partidas PvP
    IF to_regclass('public.tcg_pvp_matches') IS NOT NULL THEN
        DELETE FROM public.tcg_pvp_matches WHERE player_a = _user_id OR player_b = _user_id;
    END IF;

    -- mercado / trocas
    IF to_regclass('public.tcg_market_listings') IS NOT NULL THEN
        DELETE FROM public.tcg_market_listings WHERE seller_id = _user_id;
    END IF;

    -- carteira
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

Se o erro persistir, o toast do painel agora mostra a mensagem exata do banco.
