# Migração — Fase 3 (Personagens)

Como este projeto usa Supabase externo (não Lovable Cloud), rode o SQL abaixo
no **SQL Editor** do seu projeto Supabase (New query → colar → Run).

```sql
-- ENUM de Organização (extensível com ALTER TYPE ... ADD VALUE)
do $$ begin
  create type public.character_organization as enum (
    'Pirata',
    'Marinheiro',
    'Governo',
    'Revolucionário',
    'Rosa Negra',
    'Caçador',
    'Nenhuma Afiliação'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  is_active boolean not null default false,

  name text,
  title text,
  level int not null default 1,
  xp_current int not null default 0,
  xp_max int not null default 100,
  gender text,
  age int,
  coins bigint not null default 0,

  crew text,               -- futuro: FK crews(id)
  fighting_style text,     -- futuro: FK fighting_styles(id)
  sexuality text,
  organization public.character_organization,

  portrait_url text,
  wanted_poster_url text,
  flag_url text,

  profession_1 text,
  profession_2 text,
  race text,
  history text,
  notes text,

  attr_forca_base int not null default 0, attr_forca_passivo int not null default 0, attr_forca_equip int not null default 0, attr_forca_treino int not null default 0,
  attr_combate_base int not null default 0, attr_combate_passivo int not null default 0, attr_combate_equip int not null default 0, attr_combate_treino int not null default 0,
  attr_agilidade_base int not null default 0, attr_agilidade_passivo int not null default 0, attr_agilidade_equip int not null default 0, attr_agilidade_treino int not null default 0,
  attr_precisao_base int not null default 0, attr_precisao_passivo int not null default 0, attr_precisao_equip int not null default 0, attr_precisao_treino int not null default 0,
  attr_vigor_base int not null default 0, attr_vigor_passivo int not null default 0, attr_vigor_equip int not null default 0, attr_vigor_treino int not null default 0,
  attr_inteligencia_base int not null default 0, attr_inteligencia_passivo int not null default 0, attr_inteligencia_equip int not null default 0, attr_inteligencia_treino int not null default 0,
  attr_percepcao_base int not null default 0, attr_percepcao_passivo int not null default 0, attr_percepcao_equip int not null default 0, attr_percepcao_treino int not null default 0,
  attr_vontade_base int not null default 0, attr_vontade_passivo int not null default 0, attr_vontade_equip int not null default 0, attr_vontade_treino int not null default 0,
  attr_espirito_base int not null default 0, attr_espirito_passivo int not null default 0, attr_espirito_equip int not null default 0, attr_espirito_treino int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slot)
);

create unique index if not exists characters_one_active_per_user
  on public.characters (user_id) where is_active;

alter table public.characters enable row level security;

drop policy if exists "characters own read"   on public.characters;
drop policy if exists "characters own insert" on public.characters;
drop policy if exists "characters own update" on public.characters;
drop policy if exists "characters own delete" on public.characters;

create policy "characters own read"   on public.characters for select using (auth.uid() = user_id);
create policy "characters own insert" on public.characters for insert with check (auth.uid() = user_id);
create policy "characters own update" on public.characters for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "characters own delete" on public.characters for delete using (auth.uid() = user_id);

create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists characters_touch on public.characters;
create trigger characters_touch
  before update on public.characters
  for each row execute function public.tg_touch_updated_at();

create or replace function public.set_active_character(_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.characters set is_active = false
    where user_id = auth.uid() and id <> _id and is_active;
  update public.characters set is_active = true
    where user_id = auth.uid() and id = _id;
end $$;

revoke all on function public.set_active_character(uuid) from public;
grant execute on function public.set_active_character(uuid) to authenticated;
```
