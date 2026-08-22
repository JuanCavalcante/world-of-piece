# 0060 — Loja do TCG (Essência → Pack)

Cria a Loja do WOP TCG: produtos cadastrados no banco, compra 100% server-side via
RPC `tcg_purchase_shop_product` (SECURITY DEFINER), histórico com snapshot de preço
e RLS/grants alinhados ao hardening das migrations 0056–0059.

Escrito no estilo **locksafe** da 0059: sem transação única, `lock_timeout` curto,
passos independentes e reexecutáveis. Rode os passos **um de cada vez** no SQL Editor.

---

## Passo 1 — Tabelas e índices

```sql
set lock_timeout = '10s';

create table if not exists public.tcg_shop_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  product_type text not null default 'PACK'
    check (product_type in ('PACK','COSMETIC','AVATAR','BANNER','ITEM','SPECIAL')),
  pack_size integer check (pack_size is null or pack_size > 0),
  price_essence integer not null check (price_essence > 0),
  image_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tcg_shop_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.tcg_shop_products(id) on delete set null,
  product_name_snapshot text not null,
  price_essence integer not null,
  quantity integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists tcg_shop_products_active_idx
  on public.tcg_shop_products (active, sort_order);
create index if not exists tcg_shop_purchases_user_idx
  on public.tcg_shop_purchases (user_id, created_at desc);
```

## Passo 2 — Grants

```sql
set lock_timeout = '5s';

-- Produtos: leitura para jogadores; escrita existe mas a RLS restringe a admin.
grant select, insert, update, delete on public.tcg_shop_products to authenticated;
grant all on public.tcg_shop_products to service_role;

-- Histórico: jogador só LÊ as próprias compras. Insert acontece só dentro da RPC.
grant select on public.tcg_shop_purchases to authenticated;
grant all on public.tcg_shop_purchases to service_role;
```

## Passo 3 — RLS

```sql
set lock_timeout = '5s';

alter table public.tcg_shop_products enable row level security;
alter table public.tcg_shop_purchases enable row level security;
```

## Passo 4 — Policies

```sql
set lock_timeout = '5s';

-- Produtos visíveis: ativo e dentro da janela de disponibilidade
drop policy if exists "shop_products_player_select" on public.tcg_shop_products;
create policy "shop_products_player_select" on public.tcg_shop_products
  for select to authenticated
  using (
    active
    and (starts_at is null or now() >= starts_at)
    and (ends_at is null or now() <= ends_at)
  );

-- Admin: acesso total (select irrestrito + insert/update/delete)
drop policy if exists "shop_products_admin_all" on public.tcg_shop_products;
create policy "shop_products_admin_all" on public.tcg_shop_products
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Histórico: somente as próprias compras
drop policy if exists "shop_purchases_own_select" on public.tcg_shop_purchases;
create policy "shop_purchases_own_select" on public.tcg_shop_purchases
  for select to authenticated
  using (user_id = auth.uid());
```

## Passo 5 — RPC de compra (núcleo, atômica)

```sql
set lock_timeout = '5s';

create or replace function public.tcg_purchase_shop_product(_product_id uuid)
returns table(
  out_purchase_id uuid,
  out_product_name text,
  out_price integer,
  out_packs_added integer,
  out_packs_total integer,
  out_essence_left integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _p public.tcg_shop_products%rowtype;
  _packs int;
begin
  if _uid is null then
    raise exception 'Usuário não autenticado.';
  end if;

  -- 1) Produto: lock da linha serializa compras concorrentes do mesmo produto
  select * into _p from public.tcg_shop_products where id = _product_id for update;
  if not found then
    raise exception 'Produto indisponível.';
  end if;
  if not _p.active then
    raise exception 'Produto indisponível.';
  end if;
  if _p.starts_at is not null and now() < _p.starts_at then
    raise exception 'Este produto ainda não está disponível.';
  end if;
  if _p.ends_at is not null and now() > _p.ends_at then
    raise exception 'Este produto não está mais disponível.';
  end if;
  if _p.product_type <> 'PACK' then
    raise exception 'Tipo de produto não suportado.';
  end if;

  -- pack_size = cartas entregues; cada pacote abre 5 cartas (tcg_open_pack)
  _packs := greatest(1, ceil(coalesce(_p.pack_size, 5)::numeric / 5)::int);

  -- 2) Débito ATÔMICO: a condição no WHERE é o anti-race-condition.
  --    Duas requests simultâneas serializam no lock da linha da carteira;
  --    a segunda vê saldo insuficiente e falha. CHECK (essence >= 0) é backstop.
  update public.tcg_wallets
     set essence = essence - _p.price_essence,
         updated_at = now()
   where user_id = _uid
     and essence >= _p.price_essence
  returning essence into out_essence_left;
  if not found then
    raise exception 'Essência insuficiente.';
  end if;

  -- 3) Entrega: incrementa o contador de packs existente (tcg_players.packs)
  insert into public.tcg_players (user_id) values (_uid)
  on conflict (user_id) do nothing;
  update public.tcg_players
     set packs = coalesce(packs, 0) + _packs
   where user_id = _uid
  returning packs into out_packs_total;

  -- 4) Histórico com snapshot do preço pago
  insert into public.tcg_shop_purchases
    (user_id, product_id, product_name_snapshot, price_essence, quantity)
  values (_uid, _p.id, _p.name, _p.price_essence, 1)
  returning id into out_purchase_id;

  -- 5) Notificação (insert direto: função definer; tcg_notify segue revogada)
  insert into public.notifications (user_id, title, message, type)
  values (
    _uid,
    'Compra realizada!',
    'Você comprou ' || _p.name || ' por ' || _p.price_essence || ' de essência. ' ||
      _packs || ' pacote(s) adicionado(s) à sua conta.',
    'TCG_SHOP'
  );

  -- 6) Rastro de evento para conquistas futuras (defensivo: só se a função existir)
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'tcg_track_event'
  ) then
    perform public.tcg_track_event('SHOP_PURCHASE', 1);
  end if;

  out_product_name := _p.name;
  out_price := _p.price_essence;
  out_packs_added := _packs;
  return next;
end;
$$;
```

## Passo 6 — Grants da RPC

```sql
set lock_timeout = '5s';

revoke all on function public.tcg_purchase_shop_product(uuid) from public, anon;
grant execute on function public.tcg_purchase_shop_product(uuid) to authenticated;
grant execute on function public.tcg_purchase_shop_product(uuid) to service_role;
```

## Passo 7 — Produto inicial (opcional, pode ajustar/rodar depois)

```sql
insert into public.tcg_shop_products
  (name, description, product_type, pack_size, price_essence, sort_order, active)
values
  ('Pack Básico', 'Contém 5 cartas aleatórias.', 'PACK', 5, 100, 1, true);
```

## Passo 8 — Recarregar o schema da API

```sql
notify pgrst, 'reload schema';
```

---

## Garantias da compra

- **Autoridade no servidor**: o cliente envia apenas `_product_id`. Preço, tipo,
  quantidade de packs e comprador (`auth.uid()`) vêm 100% do banco.
- **Atomicidade**: a função roda em uma única transação — qualquer exceção faz
  ROLLBACK total (nunca essência sem pack, nem pack sem essência).
- **Anti-duplicação**: `update ... where essence >= preço` é o ponto único de
  verdade; requests simultâneas serializam no lock da carteira e a segunda falha
  com "Essência insuficiente."
- **Sem funções vulneráveis**: não usa `tcg_grant_pack`, `tcg_add_fragments`,
  `tcg_ensure_wallet(uuid)` nem `tcg_notify` (bloqueadas no hotfix 0056).

## Rollback (destrutivo — pedir aprovação antes)

```sql
drop function if exists public.tcg_purchase_shop_product(uuid);
drop table if exists public.tcg_shop_purchases;
drop table if exists public.tcg_shop_products;
```
