# Migração — Fase 5 (Estoque Pessoal, Solicitações e Notificações)

Execute no **SQL Editor** do Supabase.

```sql
-- ============ ENUMS ============
do $$ begin
  create type public.item_tier as enum ('COMUM','INCOMUM','RARO','EPICO','LENDARIO','MITICO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.item_category as enum (
    'EQUIPAMENTO','CONSUMIVEL','AKUMA','LIVRO','TECNICA',
    'MOEDA','MATERIAL','PROFISSAO','PET','NAVIO','RECOMPENSA','PRESENTE','BAU','EVENTO','OUTRO'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inventory_status as enum ('AVAILABLE','PENDING_ACTIVATION','ACTIVATED','REMOVED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.activation_status as enum ('PENDING','APPROVED','REJECTED');
exception when duplicate_object then null; end $$;

-- ============ CATÁLOGO DE ITENS ============
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  image_url text,
  category public.item_category not null default 'OUTRO',
  tier public.item_tier not null default 'COMUM',
  stackable boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.inventory_items enable row level security;

drop policy if exists "items read all"   on public.inventory_items;
drop policy if exists "items admin write" on public.inventory_items;

create policy "items read all"
  on public.inventory_items for select
  to authenticated using (true);

create policy "items admin write"
  on public.inventory_items for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ ESTOQUE DO JOGADOR ============
create table if not exists public.player_inventory (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  quantity int not null default 1 check (quantity > 0),
  status public.inventory_status not null default 'AVAILABLE',
  created_at timestamptz not null default now()
);

create index if not exists player_inventory_player_idx on public.player_inventory(player_id, status);

alter table public.player_inventory enable row level security;

drop policy if exists "inv self read"   on public.player_inventory;
drop policy if exists "inv self update" on public.player_inventory;
drop policy if exists "inv admin all"   on public.player_inventory;

create policy "inv self read"
  on public.player_inventory for select
  to authenticated using (player_id = auth.uid());

-- jogador pode marcar como PENDING (mas atualização "real" acontece via RPC).
create policy "inv self update"
  on public.player_inventory for update
  to authenticated
  using (player_id = auth.uid())
  with check (player_id = auth.uid());

create policy "inv admin all"
  on public.player_inventory for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ SOLICITAÇÕES DE ATIVAÇÃO ============
create table if not exists public.activation_requests (
  id uuid primary key default gen_random_uuid(),
  player_inventory_id uuid not null references public.player_inventory(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  character_name text not null,
  quantity int not null default 1 check (quantity > 0),
  status public.activation_status not null default 'PENDING',
  reject_reason text,
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null
);

create index if not exists activation_requests_status_idx on public.activation_requests(status, requested_at desc);
create index if not exists activation_requests_player_idx on public.activation_requests(player_id);

alter table public.activation_requests enable row level security;

drop policy if exists "req self read"    on public.activation_requests;
drop policy if exists "req self insert"  on public.activation_requests;
drop policy if exists "req admin all"    on public.activation_requests;

create policy "req self read"
  on public.activation_requests for select
  to authenticated using (player_id = auth.uid());

create policy "req self insert"
  on public.activation_requests for insert
  to authenticated with check (player_id = auth.uid());

create policy "req admin all"
  on public.activation_requests for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ NOTIFICAÇÕES ============
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null default '',
  type text not null default 'info',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id, read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notif self read"   on public.notifications;
drop policy if exists "notif self update" on public.notifications;
drop policy if exists "notif admin all"   on public.notifications;

create policy "notif self read"
  on public.notifications for select
  to authenticated using (user_id = auth.uid());

create policy "notif self update"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notif admin all"
  on public.notifications for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ RPCs ============

-- Jogador solicita ativação: cria a request e marca item como PENDING.
create or replace function public.request_activation(
  _inventory_id uuid,
  _character_id uuid,
  _character_name text,
  _quantity int
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  _inv public.player_inventory%rowtype;
  _req_id uuid;
begin
  select * into _inv from public.player_inventory where id = _inventory_id;
  if _inv is null then raise exception 'Item não encontrado'; end if;
  if _inv.player_id <> auth.uid() then raise exception 'Sem permissão'; end if;
  if _inv.status <> 'AVAILABLE' then raise exception 'Item não disponível para ativação'; end if;
  if _quantity < 1 or _quantity > _inv.quantity then raise exception 'Quantidade inválida'; end if;

  update public.player_inventory set status = 'PENDING_ACTIVATION' where id = _inventory_id;

  insert into public.activation_requests(player_inventory_id, player_id, character_id, character_name, quantity)
  values (_inventory_id, _inv.player_id, _character_id, _character_name, _quantity)
  returning id into _req_id;

  return _req_id;
end $$;

-- Admin aprova: decrementa quantidade (ou marca ACTIVATED) e notifica.
create or replace function public.approve_activation(_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  _req public.activation_requests%rowtype;
  _inv public.player_inventory%rowtype;
  _item public.inventory_items%rowtype;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Sem permissão'; end if;

  select * into _req from public.activation_requests where id = _request_id for update;
  if _req is null or _req.status <> 'PENDING' then raise exception 'Solicitação inválida'; end if;

  select * into _inv from public.player_inventory where id = _req.player_inventory_id for update;
  if _inv is null then raise exception 'Estoque não encontrado'; end if;

  select * into _item from public.inventory_items where id = _inv.item_id;

  if _req.quantity >= _inv.quantity then
    update public.player_inventory set status = 'ACTIVATED', quantity = 0 where id = _inv.id;
  else
    update public.player_inventory
      set quantity = _inv.quantity - _req.quantity,
          status = 'AVAILABLE'
      where id = _inv.id;
  end if;

  update public.activation_requests
    set status = 'APPROVED', approved_at = now(), approved_by = auth.uid()
    where id = _request_id;

  insert into public.notifications(user_id, title, message, type)
  values (
    _req.player_id,
    'Item ativado',
    'O item "' || coalesce(_item.name,'item') || '" foi ativado com sucesso em seu personagem.',
    'success'
  );
end $$;

-- Admin rejeita: item volta para AVAILABLE, notifica com motivo.
create or replace function public.reject_activation(_request_id uuid, _reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  _req public.activation_requests%rowtype;
  _inv public.player_inventory%rowtype;
  _item public.inventory_items%rowtype;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Sem permissão'; end if;

  select * into _req from public.activation_requests where id = _request_id for update;
  if _req is null or _req.status <> 'PENDING' then raise exception 'Solicitação inválida'; end if;

  select * into _inv from public.player_inventory where id = _req.player_inventory_id for update;
  select * into _item from public.inventory_items where id = _inv.item_id;

  update public.player_inventory set status = 'AVAILABLE' where id = _inv.id;

  update public.activation_requests
    set status = 'REJECTED', reject_reason = _reason, approved_at = now(), approved_by = auth.uid()
    where id = _request_id;

  insert into public.notifications(user_id, title, message, type)
  values (
    _req.player_id,
    'Solicitação rejeitada',
    'Sua solicitação de ativação do item "' || coalesce(_item.name,'item') || '" foi rejeitada.' ||
      case when _reason is not null and length(_reason) > 0 then E'\n\nMotivo:\n' || _reason else '' end,
    'error'
  );
end $$;

-- Admin lista solicitações pendentes com joins.
create or replace function public.admin_list_activation_requests(_status public.activation_status default 'PENDING')
returns table(
  id uuid,
  status public.activation_status,
  requested_at timestamptz,
  character_name text,
  quantity int,
  player_id uuid,
  player_email text,
  item_id uuid,
  item_name text,
  item_image_url text,
  item_tier public.item_tier
) language sql security definer set search_path = public as $$
  select r.id, r.status, r.requested_at, r.character_name, r.quantity,
         r.player_id, u.email::text,
         it.id, it.name, it.image_url, it.tier
  from public.activation_requests r
  join public.player_inventory pi on pi.id = r.player_inventory_id
  join public.inventory_items it on it.id = pi.item_id
  join auth.users u on u.id = r.player_id
  where public.has_role(auth.uid(), 'admin') and r.status = _status
  order by r.requested_at desc
$$;

revoke all on function public.request_activation(uuid,uuid,text,int) from public;
revoke all on function public.approve_activation(uuid) from public;
revoke all on function public.reject_activation(uuid,text) from public;
revoke all on function public.admin_list_activation_requests(public.activation_status) from public;

grant execute on function public.request_activation(uuid,uuid,text,int) to authenticated;
grant execute on function public.approve_activation(uuid) to authenticated;
grant execute on function public.reject_activation(uuid,text) to authenticated;
grant execute on function public.admin_list_activation_requests(public.activation_status) to authenticated;
```
