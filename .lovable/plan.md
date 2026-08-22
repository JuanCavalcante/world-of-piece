# Loja WOP TCG — Essência → Pack (plano técnico)

## 1. Análise da arquitetura atual (conclusões)

**Packs**: são um contador inteiro `tcg_players.packs`. A abertura é feita por
`tcg_open_pack()` — SECURITY DEFINER, usa `auth.uid()`, decremento atômico com
`UPDATE ... WHERE packs > 0 RETURNING`, sorteia 5 cartas, concede XP. **É segura e
será reutilizada sem alteração.** A Loja só precisa incrementar `tcg_players.packs`;
nenhum sistema paralelo de packs será criado.

**Essência**: vive em `tcg_wallets.essence` com `CHECK (essence >= 0)`. Após o hotfix
0056, nenhum `authenticated` escreve direto na tabela — tudo passa por RPCs
SECURITY DEFINER (`tcg_extract_essence`, compra no mercado em 0035). A Loja seguirá
exatamente esse padrão.

**Funções que NÃO serão reutilizadas** (bloqueadas na auditoria/0056):
- `tcg_grant_pack(uuid, int)` — recebe `user_id` arbitrário; EXECUTE revogado de
  `authenticated`. A RPC de compra fará `UPDATE tcg_players SET packs = packs + n`
  internamente (SECURITY DEFINER), sem depender dela.
- `tcg_add_fragments`, `tcg_spend_fragments`, `tcg_ensure_wallet(uuid)`,
  `tcg_notify` — todas já revogadas; a RPC fará `INSERT INTO notifications`
  diretamente (definer bypassa RLS).

**Notificações**: tabela `notifications` + sino no `tcg-shell` (polling 30s). A RPC
insere a notificação; o frontend também usa `rewardToast`/sonner. Nenhum sistema novo.

**Eventos**: existe `tcg_track_event` (self). A RPC chamará internamente
`tcg_track_event('SHOP_PURCHASE', 1)` apenas se a função existir (bloco defensivo) —
já deixa o rastro para conquistas futuras sem criar conquistas agora.

**Admin**: `/admindev/woptcg/*` espelha `/admin/woptcg/*` via `WopTcgAdminLayout`
(itens extras entram na lista `isDev`, como `bannerduelo`). O CRUD de produtos seguirá
o padrão de `cards`/`tcg_banners` (0059): escrita direta na tabela com GRANT +
política RLS `has_role(auth.uid(), 'admin')`.

## 2. Migration `0060_tcg_shop.md` (schema)

```sql
create table public.tcg_shop_products (
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

create table public.tcg_shop_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.tcg_shop_products(id) on delete set null,
  product_name_snapshot text not null,
  price_essence integer not null,
  quantity integer not null default 1,
  created_at timestamptz not null default now()
);

create index tcg_shop_products_active_idx
  on public.tcg_shop_products (active, sort_order);
create index tcg_shop_purchases_user_idx
  on public.tcg_shop_purchases (user_id, created_at desc);
```

## 3. Grants / RLS

**tcg_shop_products**
- `grant select, insert, update, delete to authenticated; grant all to service_role;`
- RLS: `select` para `authenticated` apenas de produtos visíveis
  (`active and (starts_at is null or now() >= starts_at) and (ends_at is null or now() <= ends_at)`);
  política admin separada (`has_role(auth.uid(),'admin')`) para `select` irrestrito +
  `insert/update/delete`. `anon`: sem acesso.

**tcg_shop_purchases**
- `grant select to authenticated; grant all to service_role;` — **sem** insert/update/delete.
- RLS: `select` apenas `user_id = auth.uid()`. O INSERT acontece só dentro da RPC definer.

## 4. RPC de compra (núcleo)

```sql
create or replace function public.tcg_purchase_shop_product(_product_id uuid)
returns table(out_purchase_id uuid, out_product_name text, out_price integer,
              out_packs_added integer, out_packs_total integer, out_essence_left integer)
language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _p public.tcg_shop_products%rowtype;
  _packs int;
begin
  if _uid is null then raise exception 'Usuário não autenticado.'; end if;

  -- 1) produto (lock da linha serializa compras do mesmo produto)
  select * into _p from public.tcg_shop_products where id = _product_id for update;
  if not found then raise exception 'Produto indisponível.'; end if;
  if not _p.active then raise exception 'Produto indisponível.'; end if;
  if _p.starts_at is not null and now() < _p.starts_at
     then raise exception 'Este produto ainda não está disponível.'; end if;
  if _p.ends_at is not null and now() > _p.ends_at
     then raise exception 'Este produto não está mais disponível.'; end if;
  if _p.product_type <> 'PACK' then raise exception 'Tipo de produto não suportado.'; end if;

  _packs := greatest(1, ceil(coalesce(_p.pack_size, 5)::numeric / 5)::int);

  -- 2) débito ATÔMICO (condição no WHERE = anti race condition; CHECK >= 0 é backstop)
  update public.tcg_wallets
     set essence = essence - _p.price_essence, updated_at = now()
   where user_id = _uid and essence >= _p.price_essence
  returning essence into out_essence_left;
  if not found then
    raise exception 'Essência insuficiente.';
  end if;

  -- 3) entrega (contador de packs existente)
  insert into public.tcg_players (user_id) values (_uid) on conflict (user_id) do nothing;
  update public.tcg_players set packs = coalesce(packs, 0) + _packs
   where user_id = _uid
  returning packs into out_packs_total;

  -- 4) histórico com snapshot do preço
  insert into public.tcg_shop_purchases (user_id, product_id, product_name_snapshot, price_essence, quantity)
  values (_uid, _p.id, _p.name, _p.price_essence, 1)
  returning id into out_purchase_id;

  -- 5) notificação (definer escreve direto; tcg_notify segue revogada)
  insert into public.notifications (user_id, title, message, type)
  values (_uid, 'Compra realizada!',
          'Você comprou ' || _p.name || ' por ' || _p.price_essence || ' de essência. ' ||
          _packs || ' pacote(s) adicionado(s) à sua conta.', 'TCG_SHOP');

  -- 6) rastro de evento para conquistas futuras (opcional/defensivo)
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
             where n.nspname='public' and p.proname='tcg_track_event') then
    perform public.tcg_track_event('SHOP_PURCHASE', 1);
  end if;

  out_product_name := _p.name; out_price := _p.price_essence; out_packs_added := _packs;
  return next;
end $$;

revoke all on function public.tcg_purchase_shop_product(uuid) from public, anon;
grant execute on function public.tcg_purchase_shop_product(uuid) to authenticated;
```

**Atomicidade**: função = 1 transação; qualquer exceção faz ROLLBACK total (nunca
essência sem pack nem pack sem essência).
**Anti-duplicação**: o `UPDATE ... WHERE essence >= preço` é o ponto único de
verdade — duas requests simultâneas serializam no lock da linha da carteira; a segunda
vê saldo insuficiente e falha. Impossível saldo negativo (CHECK + WHERE).
**Autoridade**: o cliente envia apenas `_product_id`. Preço, tipo, quantidade e
comprador (`auth.uid()`) vêm 100% do banco.
**Sem função interna nova**: a entrega é um `UPDATE` direto dentro da definer —
nenhuma `tcg_shop_grant_pack_internal` exposta é necessária.

A migration será escrita no estilo **locksafe da 0059** (passos separados, sem
transação única, `set lock_timeout = '5s'`, `notify pgrst, 'reload schema'` no fim).

## 5. Frontend

- **`src/lib/tcg/shop.ts`** (novo): `listShopProducts()` (select na tabela — RLS já
  filtra visíveis; ordena por `sort_order`), `purchaseShopProduct(productId)` (rpc),
  `listMyPurchases()` (histórico, se quisermos exibir depois — fora do escopo da UI v1).
- **`src/routes/tcggame.shop.tsx`** (novo): `head()` próprio; `TcgPageHeader`; grid de
  cards (imagem, nome, "Contém X cartas", preço em essência com ícone `FlaskConical`,
  botão Comprar). Saldo de essência/fragmentos já aparece no header via `WalletDisplay`.
  Clique em Comprar abre **Dialog de confirmação** (componente `ui/dialog` existente):
  nome, custo, saldo atual, saldo após compra, botões Cancelar/Confirmar. Sucesso:
  `rewardToast` + `toast.success`, invalida queries `tcg-wallet`, `tcg-player`.
  Erros mapeiam a mensagem da RPC ("Essência insuficiente." etc.) para `toast.error`.
- **`src/components/tcg/tcg-shell.tsx`**: novo item `Loja` (ícone `ShoppingBag`,
  rota `/tcggame/shop`) entre **Trocas** e **Rank**; tipo `TcgNavItem` estendido.

## 6. Admin (/admindev)

- Novo item "Loja" na lista **somente dev** do `WopTcgAdminLayout` (mesmo padrão do
  `bannerduelo`), com rotas `admindev.woptcg.loja.tsx` (+ espelho `admin.woptcg.loja.tsx`
  inativo no nav, seguindo o padrão existente).
- Página CRUD: listagem de produtos + formulário (nome, descrição, imagem, preço,
  pack_size, ordem, ativo, starts_at/ends_at) com escrita direta na tabela — protegida
  pela política RLS de admin, idêntico ao CRUD de cartas/banners.
- Produto inicial seed via `insert` (não na migration de schema): "Pack Básico",
  pack_size 5, 100 essência — entrego o INSERT separado para você rodar quando quiser.

## 7. Riscos / observações

- **Nada foi encontrado na reauditoria**: após 0056–0059 não restou nenhuma função com
  EXECUTE público que conceda packs/essência/fragmentos/XP/cartas. As exceções de GRANT
  público são somente leitura (`tcg_ranking`, `tcg_pvp_history`, etc.).
- `tcg_players` também guarda o contador de packs — o UPDATE interno da RPC é definer e
  não conflita com o UPDATE cosmético liberado ao jogador (colunas diferentes).
- Estoque, promoções complexas, cupons e outros `product_type`s ficam fora — o schema já
  tem os campos para o futuro.

## 8. Checklist de testes de segurança (pós-implementação)

Via DevTools/PostgREST com usuário comum — **todos devem falhar**:
1. `update tcg_wallets set essence=99999` → negado (sem grant).
2. `update tcg_players set packs=99` → negado (grant só de colunas cosméticas).
3. `insert user_cards` direto → negado.
4. `update tcg_shop_products set price_essence=1` → negado (RLS admin).
5. `rpc tcg_purchase_shop_product` com saldo < preço → "Essência insuficiente."
6. Dois cliques simultâneos com saldo exato → 1 aprovada, 1 recusada.
7. Comprar produto `active=false` ou fora da janela → "indisponível".
8. Passar `_product_id` de produto inexistente → "indisponível".
9. Campos extras no payload (price, user_id, quantity) → ignorados/inexistentes.
10. `insert tcg_shop_purchases` direto → negado (sem grant de insert).
11. Comprar "em nome de outro" → impossível: RPC ignora qualquer id e usa `auth.uid()`.

Caminho legítimo: apenas `rpc tcg_purchase_shop_product(_product_id)`.
