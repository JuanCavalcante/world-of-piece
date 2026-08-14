# Migração — Probabilidades do pacote diário do TCG

Execute no **SQL Editor** do Supabase.

Cartas 1 e 2: Comum (100%). Carta 3: Rara 82% / Épica 17% / Lendária 1%. Carta 4: Comum 70% / Rara 23% / Épica 6% / Lendária 1%.

```sql
DROP FUNCTION IF EXISTS public.tcg_claim_daily_reward();

CREATE FUNCTION public.tcg_claim_daily_reward()
RETURNS TABLE (out_card_id uuid, out_name text, out_rarity text, out_image_url text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    _user_id uuid := auth.uid();
    _last_claim timestamptz;
    _now timestamptz := now();
    _card record;
    _count int;
    _slot int;
    _r numeric;
    _rarity text;
    _pool text[];
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
    SET streak = CASE WHEN daily_rewards.last_claim > _now - interval '24 hours' THEN daily_rewards.streak + 1 ELSE 1 END,
        last_claim = _now;

    UPDATE public.tcg_players SET last_daily_reward_at = _now WHERE user_id = _user_id;

    FOR _slot IN 1..4 LOOP
        _r := random() * 100;
        IF _slot <= 2 THEN
            _rarity := 'COMUM';
            _pool := ARRAY['COMUM','RARA','EPICA','LENDARIA'];
        ELSIF _slot = 3 THEN
            _rarity := CASE WHEN _r < 82 THEN 'RARA' WHEN _r < 99 THEN 'EPICA' ELSE 'LENDARIA' END;
            _pool := ARRAY['RARA','EPICA','LENDARIA','COMUM'];
        ELSE
            _rarity := CASE WHEN _r < 70 THEN 'COMUM' WHEN _r < 93 THEN 'RARA' WHEN _r < 99 THEN 'EPICA' ELSE 'LENDARIA' END;
            _pool := ARRAY['COMUM','RARA','EPICA','LENDARIA'];
        END IF;

        -- tenta a raridade sorteada; se não houver cartas, cai para as alternativas do pool
        SELECT c.id, c.name, c.rarity, c.image_url INTO _card
        FROM public.cards c WHERE c.status = 'ACTIVE' AND c.rarity = _rarity
        ORDER BY random() LIMIT 1;

        IF NOT FOUND THEN
            SELECT c.id, c.name, c.rarity, c.image_url INTO _card
            FROM public.cards c
            WHERE c.status = 'ACTIVE' AND c.rarity = ANY(_pool)
            ORDER BY array_position(_pool, c.rarity), random()
            LIMIT 1;
        END IF;

        IF NOT FOUND THEN
            SELECT c.id, c.name, c.rarity, c.image_url INTO _card
            FROM public.cards c WHERE c.status = 'ACTIVE' ORDER BY random() LIMIT 1;
        END IF;

        INSERT INTO public.user_cards (user_id, card_id, quantity)
        VALUES (_user_id, _card.id, 1)
        ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = user_cards.quantity + 1;

        out_card_id := _card.id;
        out_name := _card.name;
        out_rarity := _card.rarity;
        out_image_url := _card.image_url;
        RETURN NEXT;
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tcg_claim_daily_reward() TO authenticated;
```
