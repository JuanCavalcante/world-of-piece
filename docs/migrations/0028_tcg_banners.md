# 0028 — Banners do duelo

Cria a tabela `tcg_banners` (catálogo de banners do campo de batalha) e garante
a coluna `banner_url` em `tcg_players`.

Execute no **SQL Editor** do Supabase (New query → colar → Run).

```sql
-- ============ CATÁLOGO DE BANNERS ============
create table if not exists public.tcg_banners (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Banner',
  image_url text not null,
  created_at timestamptz not null default now()
);

grant select on public.tcg_banners to anon, authenticated;
grant all on public.tcg_banners to service_role;

alter table public.tcg_banners enable row level security;

drop policy if exists "tcg_banners public read" on public.tcg_banners;
drop policy if exists "tcg_banners admin write" on public.tcg_banners;

create policy "tcg_banners public read"
  on public.tcg_banners for select
  using (true);

create policy "tcg_banners admin write"
  on public.tcg_banners for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ BANNER ESCOLHIDO PELO JOGADOR ============
alter table public.tcg_players
  add column if not exists banner_url text;

-- recarrega o cache de schema do PostgREST
notify pgrst, 'reload schema';
```