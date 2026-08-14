# Migração — Correções TCG

Execute no **SQL Editor** do Supabase para corrigir os erros reportados.

```sql
-- 1. Corrigir função de resgate de recompensa (garantir retorno correto e evitar erros se não houver cartas)
CREATE OR REPLACE FUNCTION public.tcg_claim_daily_reward()
RETURNS TABLE (
    card_id uuid,
    name text,
    rarity text,
    image_url text
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
        SELECT c.id, c.name, c.rarity, c.image_url 
        FROM public.cards c
        WHERE c.status = 'ACTIVE' 
        ORDER BY random() 
        LIMIT 4
    ) LOOP
        INSERT INTO public.user_cards (user_id, card_id, quantity)
        VALUES (_user_id, _card.id, 1)
        ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = user_cards.quantity + 1;
        
        card_id := _card.id;
        name := _card.name;
        rarity := _card.rarity;
        image_url := _card.image_url;
        RETURN NEXT;
    END LOOP;
END;
$$;

-- 2. Corrigir função de lançamento de cartas (corrigir erro de sintaxe no UPDATE)
CREATE OR REPLACE FUNCTION public.admin_release_cards()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _count int;
    _card_list text;
BEGIN
    -- Verificar se é admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN 
        RAISE EXCEPTION 'Apenas administradores podem lançar cartas.'; 
    END IF;

    -- Obter lista para a notificação ANTES de atualizar
    SELECT string_agg(name || ' | ' || rarity, E'\n') INTO _card_list
    FROM public.cards WHERE status = 'WAITING';

    -- Atualizar e obter o número de linhas afetadas
    WITH updated AS (
        UPDATE public.cards 
        SET status = 'ACTIVE' 
        WHERE status = 'WAITING' 
        RETURNING id
    )
    SELECT count(*) INTO _count FROM updated;

    IF _count > 0 THEN
        -- Aqui você poderia inserir na tabela de notificações se ela existir
        -- Exemplo: INSERT INTO public.notifications (title, content) VALUES ('Novas Cartas!', _count || ' novas cartas...');
        
        RETURN _count || ' Novas cartas adicionadas ao TCG, sendo elas:' || E'\n' || _card_list;
    END IF;

    RETURN 'Nenhuma carta pendente.';
END;
$$;
```
