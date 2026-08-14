# Migração — Fase 4 (Admin, Papéis e Feature Flags)

Execute no **SQL Editor** do Supabase.

```sql
-- ============ ROLES ============
do $$ begin
  create type public.app_role as enum ('admin');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

drop policy if exists "user_roles self read"  on public.user_roles;
drop policy if exists "user_roles admin read" on public.user_roles;
drop policy if exists "user_roles admin write" on public.user_roles;

create policy "user_roles self read"
  on public.user_roles for select using (auth.uid() = user_id);
create policy "user_roles admin read"
  on public.user_roles for select using (public.has_role(auth.uid(), 'admin'));
create policy "user_roles admin write"
  on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ FEATURE FLAGS (por usuário; guarda o que está DESABILITADO) ============
create table if not exists public.user_feature_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('personagens','estoque','tripulacao','pets','navio')),
  created_at timestamptz not null default now(),
  unique (user_id, feature)
);

alter table public.user_feature_flags enable row level security;

drop policy if exists "flags self read"  on public.user_feature_flags;
drop policy if exists "flags admin all"  on public.user_feature_flags;

create policy "flags self read"
  on public.user_feature_flags for select using (auth.uid() = user_id);
create policy "flags admin all"
  on public.user_feature_flags for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ AUDIT LOG ============
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

drop policy if exists "audit admin read"  on public.admin_audit_log;
drop policy if exists "audit admin write" on public.admin_audit_log;

create policy "audit admin read"
  on public.admin_audit_log for select using (public.has_role(auth.uid(), 'admin'));
create policy "audit admin write"
  on public.admin_audit_log for insert with check (
    public.has_role(auth.uid(), 'admin') and auth.uid() = actor_id
  );

-- ============ RLS DE CHARACTERS — acesso total para admins ============
drop policy if exists "characters admin all" on public.characters;
create policy "characters admin all"
  on public.characters for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ RPCs ============
create or replace function public.admin_list_players()
returns table(id uuid, email text, created_at timestamptz, is_admin boolean, character_count int)
language sql security definer set search_path = public as $$
  select u.id,
         u.email::text,
         u.created_at,
         exists(select 1 from public.user_roles r where r.user_id = u.id and r.role = 'admin'),
         (select count(*)::int from public.characters c where c.user_id = u.id)
  from auth.users u
  where public.has_role(auth.uid(), 'admin')
  order by u.created_at desc
$$;

create or replace function public.admin_get_player(_id uuid)
returns table(id uuid, email text, created_at timestamptz, is_admin boolean)
language sql security definer set search_path = public as $$
  select u.id, u.email::text, u.created_at,
         exists(select 1 from public.user_roles r where r.user_id = u.id and r.role = 'admin')
  from auth.users u
  where u.id = _id and public.has_role(auth.uid(), 'admin')
$$;

revoke all on function public.admin_list_players() from public;
revoke all on function public.admin_get_player(uuid) from public;
grant execute on function public.admin_list_players() to authenticated;
grant execute on function public.admin_get_player(uuid) to authenticated;

-- ============ PRIMEIRO ADMIN (rode manual, troque o email) ============
-- insert into public.user_roles (user_id, role)
-- select id, 'admin' from auth.users where email = 'voce@exemplo.com';
```
