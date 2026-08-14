# 0024 — Admin: ver perfil do jogador (cartas)

Permite que um admin leia a coleção de cartas de qualquer jogador (a tabela `user_cards` é self-only via RLS).

```sql
create or replace function public.admin_tcg_player_cards(_user_id uuid)
returns table(card_id uuid, quantity integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Apenas administradores podem ver o perfil de jogadores.';
  end if;

  return query
    select uc.card_id, uc.quantity
    from public.user_cards uc
    where uc.user_id = _user_id;
end;
$$;

grant execute on function public.admin_tcg_player_cards(uuid) to authenticated;
```
