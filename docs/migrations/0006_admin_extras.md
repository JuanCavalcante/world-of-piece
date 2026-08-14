# Migração — Fase 6 (Username no admin + NPCs)

Execute no **SQL Editor** do Supabase.

> Também: **desligue a confirmação de e-mail** no Supabase para evitar o rate-limit
> do plano free em `signUp` (Dashboard → Authentication → Providers → Email →
> desmarque "Confirm email"). Enquanto isso não for feito, novos cadastros vão
> continuar recebendo `429: email rate limit exceeded`.

```sql
-- ============ 1) NPCs na tabela characters ============
-- Esta parte precisa vir ANTES das funções abaixo, porque elas já leem c.is_npc.
alter table public.characters add column if not exists is_npc boolean not null default false;
alter table public.characters alter column is_npc set default false;

-- Garante que personagens antigos sejam tratados como personagens de jogador.
update public.characters set is_npc = false where is_npc is null;
alter table public.characters alter column is_npc set not null;

-- Slot 0 permitido para NPCs; 1..3 continua exigido para personagens de jogador.
alter table public.characters drop constraint if exists characters_slot_check;
alter table public.characters add constraint characters_slot_check
  check (is_npc or (slot between 1 and 3));

-- unique(user_id, slot) só vale para personagens de jogador (não-NPC).
alter table public.characters drop constraint if exists characters_user_id_slot_key;
drop index if exists public.characters_user_slot_player_unique;
create unique index characters_user_slot_player_unique
  on public.characters (user_id, slot) where is_npc = false;

-- Só um personagem ATIVO por jogador: NPC nunca deve ser marcado como ativo.
drop index if exists public.characters_one_active_per_user;
create unique index characters_one_active_per_user
  on public.characters (user_id) where is_active and is_npc = false;

-- ============ 2) admin_list_players / admin_get_player agora retornam username ============
drop function if exists public.admin_list_players();
create or replace function public.admin_list_players()
returns table(
  id uuid,
  email text,
  username text,
  created_at timestamptz,
  is_admin boolean,
  character_count int
)
language sql security definer set search_path = public as $$
  select u.id,
         u.email::text,
         coalesce(u.raw_user_meta_data->>'username', '')::text,
         u.created_at,
         exists(select 1 from public.user_roles r where r.user_id = u.id and r.role = 'admin'),
         (select count(*)::int from public.characters c
            where c.user_id = u.id and coalesce(c.is_npc, false) = false)
  from auth.users u
  where public.has_role(auth.uid(), 'admin')
  order by u.created_at desc
$$;

drop function if exists public.admin_get_player(uuid);
create or replace function public.admin_get_player(_id uuid)
returns table(
  id uuid,
  email text,
  username text,
  created_at timestamptz,
  is_admin boolean
)
language sql security definer set search_path = public as $$
  select u.id,
         u.email::text,
         coalesce(u.raw_user_meta_data->>'username', '')::text,
         u.created_at,
         exists(select 1 from public.user_roles r where r.user_id = u.id and r.role = 'admin')
  from auth.users u
  where u.id = _id and public.has_role(auth.uid(), 'admin')
$$;

revoke all on function public.admin_list_players() from public;
revoke all on function public.admin_get_player(uuid) from public;
grant execute on function public.admin_list_players() to authenticated;
grant execute on function public.admin_get_player(uuid) to authenticated;
```
