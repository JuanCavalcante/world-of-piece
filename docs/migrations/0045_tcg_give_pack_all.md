# 0045 — Dar pacote de cartas para todos os jogadores (beta)

Cria `public.admin_tcg_give_pack_all(_size int)`, que aplica `admin_tcg_give_pack`
para todos os jogadores existentes em `tcg_players`. Retorna a quantidade de
jogadores contemplados. Somente admins podem executar.

```sql
create or replace function public.admin_tcg_give_pack_all(_size int default 5)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  _actor uuid := auth.uid();
  _count int := 0;
  _r record;
begin
  if _actor is null or not public.has_role(_actor, 'admin') then
    raise exception 'not authorized';
  end if;

  for _r in select user_id from public.tcg_players loop
    perform public.admin_tcg_give_pack(_r.user_id, _size);
    _count := _count + 1;
  end loop;

  return _count;
end;
$$;

revoke all on function public.admin_tcg_give_pack_all(int) from public, anon;
grant execute on function public.admin_tcg_give_pack_all(int) to authenticated;
```

## Rollback

```sql
drop function if exists public.admin_tcg_give_pack_all(int);
```
