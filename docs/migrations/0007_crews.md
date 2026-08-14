# Migração — Fase 7 (Tripulações)

Execute no **SQL Editor** do Supabase.

```sql
-- ============ 1) Enum e tabelas ============
do $$ begin
  create type public.crew_role as enum ('capitao','imediato','tripulante');
exception when duplicate_object then null; end $$;

create table if not exists public.crews (
  id uuid primary key default gen_random_uuid(),
  name text,
  organization text,
  flag_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crew_members (
  crew_id uuid not null references public.crews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.crew_role not null default 'tripulante',
  created_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

-- Um jogador só pode pertencer a uma tripulação
create unique index if not exists crew_members_one_per_user on public.crew_members(user_id);

alter table public.crews enable row level security;
alter table public.crew_members enable row level security;

-- ============ 2) RLS ============
drop policy if exists "crews admin all" on public.crews;
drop policy if exists "crews member read" on public.crews;
drop policy if exists "crew_members admin all" on public.crew_members;
drop policy if exists "crew_members self read" on public.crew_members;

create policy "crews admin all"
  on public.crews for all
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create policy "crews member read"
  on public.crews for select
  using (exists (
    select 1 from public.crew_members m
    where m.crew_id = crews.id and m.user_id = auth.uid()
  ));

create policy "crew_members admin all"
  on public.crew_members for all
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create policy "crew_members self read"
  on public.crew_members for select
  using (user_id = auth.uid());

-- ============ 3) RPCs ============
drop function if exists public.get_my_crew();
create or replace function public.get_my_crew()
returns table(id uuid, name text, organization text, flag_url text)
language sql stable security definer set search_path = public as $$
  select cr.id, cr.name, cr.organization, cr.flag_url
  from public.crews cr
  join public.crew_members cm on cm.crew_id = cr.id and cm.user_id = auth.uid()
  limit 1
$$;

drop function if exists public.get_crew_members_detailed(uuid);
create or replace function public.get_crew_members_detailed(_crew_id uuid)
returns table(
  user_id uuid,
  username text,
  role public.crew_role,
  character_name text,
  level int
)
language sql stable security definer set search_path = public as $$
  select cm.user_id,
         coalesce(u.raw_user_meta_data->>'username','')::text,
         cm.role,
         c.name,
         coalesce(c.level, 0)
  from public.crew_members cm
  join auth.users u on u.id = cm.user_id
  left join public.characters c
    on c.user_id = cm.user_id
   and c.is_active
   and coalesce(c.is_npc,false) = false
  where cm.crew_id = _crew_id
    and (
      public.has_role(auth.uid(),'admin')
      or exists (
        select 1 from public.crew_members m
        where m.crew_id = _crew_id and m.user_id = auth.uid()
      )
    )
  order by case cm.role
             when 'capitao' then 0
             when 'imediato' then 1
             else 2
           end,
           coalesce(u.raw_user_meta_data->>'username','')
$$;

revoke all on function public.get_my_crew() from public;
revoke all on function public.get_crew_members_detailed(uuid) from public;
grant execute on function public.get_my_crew() to authenticated;
grant execute on function public.get_crew_members_detailed(uuid) to authenticated;
```
