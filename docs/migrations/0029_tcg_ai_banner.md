# 0029 — Banner padrão da IA

Adiciona a marcação de qual banner é usado pelo adversário (IA) no campo de batalha.

Execute no **SQL Editor** do Supabase.

```sql
alter table public.tcg_banners
  add column if not exists is_ai boolean not null default false;

-- somente um banner pode ser o da IA
drop index if exists tcg_banners_single_ai;
create unique index tcg_banners_single_ai
  on public.tcg_banners ((is_ai))
  where is_ai;

-- define o banner da IA (admin)
create or replace function public.admin_tcg_set_ai_banner(_banner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized';
  end if;
  update public.tcg_banners set is_ai = false where is_ai;
  update public.tcg_banners set is_ai = true where id = _banner_id;
end;
$$;

grant execute on function public.admin_tcg_set_ai_banner(uuid) to authenticated;

notify pgrst, 'reload schema';
```
