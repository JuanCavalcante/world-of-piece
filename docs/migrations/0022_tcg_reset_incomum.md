# Migração 0022 — Reset de conta TCG, raridade Incomum e correção de raça

Execute no **SQL Editor** do Supabase.

```sql
-- 1. Reset completo da conta de TCG de um jogador (apenas admin)
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

    UPDATE public.tcg_players
    SET level = 1, xp = 0, wins = 0, losses = 0, last_daily_reward_at = NULL
    WHERE user_id = _user_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_tcg_reset_account(uuid) TO authenticated;

-- 2. Raridade "Incomum" no pacote diário (entre Comum e Rara)
--    XP: 8 base / +25 de bônus por carta inédita
CREATE OR REPLACE FUNCTION public.tcg_claim_daily_reward()
RETURNS TABLE(out_card_id uuid, out_name text, out_rarity text, out_image_url text, out_is_new boolean, out_xp integer, out_total_xp integer, out_streak integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    _user_id uuid := auth.uid();
    _last_claim timestamptz; _now timestamptz := now();
    _card record; _count int; _slot int; _r numeric; _rarity text; _pool text[];
    _streak int; _mult numeric; _is_new boolean; _base int; _bonus int; _card_xp int; _total_xp int := 0;
BEGIN
    IF _user_id IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;

    SELECT last_claim INTO _last_claim FROM public.daily_rewards WHERE user_id = _user_id;
    IF _last_claim IS NOT NULL AND _now < _last_claim + interval '12 hours' THEN
        RAISE EXCEPTION 'Aguarde 12 horas entre os resgates.';
    END IF;

    SELECT count(*) INTO _count FROM public.cards WHERE status = 'ACTIVE';
    IF _count = 0 THEN RAISE EXCEPTION 'Nenhuma carta ativa disponível para recompensa no momento.'; END IF;

    INSERT INTO public.daily_rewards (user_id, last_claim, streak)
    VALUES (_user_id, _now, 1)
    ON CONFLICT (user_id) DO UPDATE
    SET streak = CASE WHEN daily_rewards.last_claim > _now - interval '48 hours' THEN daily_rewards.streak + 1 ELSE 1 END,
        last_claim = _now
    RETURNING streak INTO _streak;

    UPDATE public.tcg_players SET last_daily_reward_at = _now WHERE user_id = _user_id;

    _mult := CASE WHEN _streak >= 30 THEN 1.25 WHEN _streak >= 14 THEN 1.15
                  WHEN _streak >= 7 THEN 1.10 WHEN _streak >= 3 THEN 1.05 ELSE 1.00 END;

    FOR _slot IN 1..4 LOOP
        _r := random() * 100;
        IF _slot <= 2 THEN
            _rarity := CASE WHEN _r < 80 THEN 'COMUM' ELSE 'INCOMUM' END;
            _pool := ARRAY['COMUM','INCOMUM','RARA','EPICA','LENDARIA'];
        ELSIF _slot = 3 THEN
            _rarity := CASE WHEN _r < 82 THEN 'RARA' WHEN _r < 99 THEN 'EPICA' ELSE 'LENDARIA' END;
            _pool := ARRAY['RARA','EPICA','LENDARIA','INCOMUM','COMUM'];
        ELSE
            _rarity := CASE WHEN _r < 55 THEN 'COMUM' WHEN _r < 70 THEN 'INCOMUM'
                            WHEN _r < 93 THEN 'RARA' WHEN _r < 99 THEN 'EPICA' ELSE 'LENDARIA' END;
            _pool := ARRAY['COMUM','INCOMUM','RARA','EPICA','LENDARIA'];
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

        SELECT NOT EXISTS (SELECT 1 FROM public.user_cards uc WHERE uc.user_id = _user_id AND uc.card_id = _card.id) INTO _is_new;

        INSERT INTO public.user_cards (user_id, card_id, quantity)
        VALUES (_user_id, _card.id, 1)
        ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = user_cards.quantity + 1;

        _base := CASE _card.rarity WHEN 'COMUM' THEN 5 WHEN 'INCOMUM' THEN 8 WHEN 'RARA' THEN 12
                                   WHEN 'EPICA' THEN 30 WHEN 'LENDARIA' THEN 80 ELSE 5 END;
        _bonus := CASE WHEN NOT _is_new THEN 0
                       WHEN _card.rarity = 'COMUM' THEN 15 WHEN _card.rarity = 'INCOMUM' THEN 25
                       WHEN _card.rarity = 'RARA' THEN 40 WHEN _card.rarity = 'EPICA' THEN 100
                       WHEN _card.rarity = 'LENDARIA' THEN 250 ELSE 15 END;
        _card_xp := floor((_base + _bonus) * _mult)::int;
        _total_xp := _total_xp + _card_xp;

        out_card_id := _card.id; out_name := _card.name; out_rarity := _card.rarity;
        out_image_url := _card.image_url; out_is_new := _is_new; out_xp := _card_xp;
        out_total_xp := _total_xp; out_streak := _streak;
        RETURN NEXT;
    END LOOP;

    PERFORM public.tcg_grant_xp(_user_id, _total_xp);
END; $$;

GRANT EXECUTE ON FUNCTION public.tcg_claim_daily_reward() TO authenticated;

-- 3. Correção do nome da raça
UPDATE public.cards SET race = 'Hinoki''Al' WHERE race = 'Honoki''al';
UPDATE public.characters SET race = 'Hinoki''Al' WHERE race = 'Honoki''al';
```
