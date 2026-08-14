# Migração — Sincronizar recompensa diária (timer + reset admin)

Execute no **SQL Editor** do Supabase.

O cooldown estava sendo gravado apenas em `daily_rewards.last_claim`, enquanto o painel e o admin
leem `tcg_players.last_daily_reward_at`. Isso fazia o timer não aparecer e o "Resetar recompensa
diária" não ter efeito.

```sql
-- 1. Ao resgatar, gravar também em tcg_players.last_daily_reward_at
CREATE OR REPLACE FUNCTION public.tcg_claim_daily_reward()
RETURNS TABLE (
    out_card_id uuid,
    out_name text,
    out_rarity text,
    out_image_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _user_id uuid := auth.uid();
    _last_claim timestamp WITH TIME ZONE;
    _now timestamp WITH TIME ZONE := now();
    _card record;
    _count int;
BEGIN
    IF _user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    SELECT last_claim INTO _last_claim FROM public.daily_rewards WHERE user_id = _user_id;

    IF _last_claim IS NOT NULL AND _now < _last_claim + interval '12 hours' THEN
        RAISE EXCEPTION 'Aguarde 12 horas entre os resgates.';
    END IF;

    SELECT count(*) INTO _count FROM public.cards WHERE status = 'ACTIVE';
    IF _count = 0 THEN
        RAISE EXCEPTION 'Nenhuma carta ativa disponível para recompensa no momento.';
    END IF;

    INSERT INTO public.daily_rewards (user_id, last_claim, streak)
    VALUES (_user_id, _now, 1)
    ON CONFLICT (user_id) DO UPDATE
    SET streak = CASE
            WHEN daily_rewards.last_claim > _now - interval '24 hours' THEN daily_rewards.streak + 1
            ELSE 1
        END,
        last_claim = _now;

    -- manter o painel do jogador em sincronia (timer regressivo)
    UPDATE public.tcg_players SET last_daily_reward_at = _now WHERE user_id = _user_id;

    FOR _card IN (
        SELECT id, name, rarity, image_url
        FROM public.cards
        WHERE status = 'ACTIVE'
        ORDER BY random()
        LIMIT 4
    ) LOOP
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

-- 2. Reset do admin deve limpar as DUAS fontes do cooldown
CREATE OR REPLACE FUNCTION public.admin_tcg_reset_daily(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    UPDATE public.tcg_players SET last_daily_reward_at = NULL WHERE user_id = _user_id;
    DELETE FROM public.daily_rewards WHERE user_id = _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_tcg_reset_daily(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tcg_claim_daily_reward() TO authenticated;
```
