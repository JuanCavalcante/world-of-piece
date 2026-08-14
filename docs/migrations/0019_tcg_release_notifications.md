# Migração 0019 — Correção do "Lançar cartas" (coluna `content` → `message`)

O erro `42703: column "content" of relation "notifications" does not exist` acontece porque a
tabela `public.notifications` usa a coluna **`message`** (criada na migração 0003), não `content`.

Rode este SQL no **SQL Editor** do Supabase:

```sql
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
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Apenas administradores podem lançar cartas.';
    END IF;

    SELECT string_agg(name || ' | ' || rarity, E'\n' ORDER BY name)
      INTO _card_list
      FROM public.cards
     WHERE status = 'WAITING';

    UPDATE public.cards SET status = 'ACTIVE' WHERE status = 'WAITING';
    GET DIAGNOSTICS _count = ROW_COUNT;

    IF _count = 0 THEN
        RETURN 'Nenhuma carta pendente.';
    END IF;

    -- Notifica todos os usuários (coluna correta: message)
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT u.id,
           'Novas Cartas no TCG!',
           _count || ' Novas cartas adicionadas ao TCG, sendo elas:' || E'\n' || _card_list,
           'TCG_RELEASE'
      FROM auth.users u;

    RETURN _count || ' Novas cartas adicionadas ao TCG, sendo elas:' || E'\n' || _card_list;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_release_cards() TO authenticated;
```
