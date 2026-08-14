# Migração — Correções TCG V4 (Ambiguidade, Notificações e Limpeza)

Execute no **SQL Editor** do Supabase para corrigir os erros de ambiguidade e ativar as notificações globais.

```sql
-- 1. Corrigir função de resgate de recompensa (Eliminar ambiguidade de card_id)
DROP FUNCTION IF EXISTS public.tcg_claim_daily_reward();
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
    -- Verificar se o usuário está autenticado
    IF _user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    -- Verificar cooldown de 12 horas
    SELECT last_claim INTO _last_claim FROM public.daily_rewards WHERE user_id = _user_id;
    
    IF _last_claim IS NOT NULL AND _now < _last_claim + interval '12 hours' THEN
        RAISE EXCEPTION 'Aguarde 12 horas entre os resgates.';
    END IF;

    -- Verificar se existem cartas ativas
    SELECT count(*) INTO _count FROM public.cards WHERE status = 'ACTIVE';
    IF _count = 0 THEN
        RAISE EXCEPTION 'Nenhuma carta ativa disponível para recompensa no momento.';
    END IF;

    -- Atualizar ou inserir registro de recompensa
    INSERT INTO public.daily_rewards (user_id, last_claim, streak)
    VALUES (_user_id, _now, 1)
    ON CONFLICT (user_id) DO UPDATE 
    SET streak = CASE 
            WHEN daily_rewards.last_claim > _now - interval '24 hours' THEN daily_rewards.streak + 1 
            ELSE 1 
        END,
        last_claim = _now;

    -- Conceder 4 cartas aleatórias ATIVAS
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

-- 2. Corrigir função de lançamento de cartas (Adicionar notificações para todos os usuários)
DROP FUNCTION IF EXISTS public.admin_release_cards();
CREATE OR REPLACE FUNCTION public.admin_release_cards()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _count int;
    _card_list text;
    _user_id uuid;
BEGIN
    -- Verificar se é admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN 
        RAISE EXCEPTION 'Apenas administradores podem lançar cartas.'; 
    END IF;

    -- Obter lista para a notificação ANTES de atualizar
    SELECT string_agg(name || ' | ' || rarity, E'\n') INTO _card_list
    FROM public.cards WHERE status = 'WAITING';

    -- Atualizar cartas para ACTIVE
    UPDATE public.cards 
    SET status = 'ACTIVE' 
    WHERE status = 'WAITING';

    GET DIAGNOSTICS _count = ROW_COUNT;

    IF _count > 0 THEN
        -- Notificar todos os usuários (assumindo que existe a tabela public.notifications)
        -- Estrutura comum: user_id, title, content, read
        FOR _user_id IN (SELECT id FROM auth.users) LOOP
            INSERT INTO public.notifications (user_id, title, content, type)
            VALUES (
                _user_id, 
                'Novas Cartas no TCG!', 
                _count || ' novas cartas foram adicionadas:' || E'\n' || _card_list,
                'TCG_RELEASE'
            ) ON CONFLICT DO NOTHING;
        END LOOP;
        
        RETURN _count || ' Novas cartas adicionadas ao TCG, sendo elas:' || E'\n' || _card_list;
    END IF;

    RETURN 'Nenhuma carta pendente.';
END;
$$;

-- 3. Garantir que notificações antigas e duplicadas sejam tratadas (Opcional)
-- Limpa notificações com mais de 30 dias para manter o banco leve
DELETE FROM public.notifications WHERE created_at < now() - interval '30 days';

