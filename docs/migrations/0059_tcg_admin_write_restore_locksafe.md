# Migração 0059 — Versão à prova de deadlock da 0058

A 0058 rodava tudo dentro de um único `begin/commit` e usava
`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, que exige `AccessExclusiveLock`.
Com o PostgREST lendo o schema ao mesmo tempo, isso gera
`40P01: deadlock detected`.

Esta versão faz o mesmo resultado final, mas:

- **sem transação única** — cada bloco é autônomo e pode ser reexecutado;
- **sem `ALTER TABLE`** quando a RLS já está ativa (checa `pg_class.relrowsecurity`);
- com `lock_timeout` curto, para falhar rápido em vez de travar.

Execute os passos no **SQL Editor**, um de cada vez. Se um passo der
`lock_timeout`, espere alguns segundos e rode aquele passo de novo.

---

## Passo 1 — GRANTs (não pega lock pesado)

```sql
set lock_timeout = '5s';

grant select on public.cards to anon;
grant select, insert, update, delete on public.cards to authenticated;
grant all on public.cards to service_role;
```

## Passo 2 — GRANTs de tcg_banners

```sql
set lock_timeout = '5s';

do $$
begin
  if to_regclass('public.tcg_banners') is not null then
    execute 'grant select on public.tcg_banners to anon';
    execute 'grant select, insert, update, delete on public.tcg_banners to authenticated';
    execute 'grant all on public.tcg_banners to service_role';
  end if;
end $$;
```

## Passo 3 — Ativar RLS só se ainda não estiver ativa

```sql
set lock_timeout = '5s';

do $$
declare
  t text;
begin
  foreach t in array array['cards','tcg_banners'] loop
    if to_regclass('public.' || t) is not null
       and not (select relrowsecurity from pg_class
                where oid = ('public.' || t)::regclass) then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $$;
```

## Passo 4 — Políticas de `cards`

```sql
set lock_timeout = '5s';

drop policy if exists "cards_select_all" on public.cards;
create policy "cards_select_all" on public.cards for select using (true);

drop policy if exists "cards_admin_insert" on public.cards;
create policy "cards_admin_insert" on public.cards for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "cards_admin_update" on public.cards;
create policy "cards_admin_update" on public.cards for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "cards_admin_delete" on public.cards;
create policy "cards_admin_delete" on public.cards for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));
```

## Passo 5 — Políticas de `tcg_banners`

```sql
set lock_timeout = '5s';

do $$
begin
  if to_regclass('public.tcg_banners') is null then return; end if;

  execute 'drop policy if exists "tcg_banners_select_all" on public.tcg_banners';
  execute 'create policy "tcg_banners_select_all" on public.tcg_banners
             for select using (true)';

  execute 'drop policy if exists "tcg_banners_admin_insert" on public.tcg_banners';
  execute 'create policy "tcg_banners_admin_insert" on public.tcg_banners
             for insert to authenticated
             with check (public.has_role(auth.uid(), ''admin''))';

  execute 'drop policy if exists "tcg_banners_admin_update" on public.tcg_banners';
  execute 'create policy "tcg_banners_admin_update" on public.tcg_banners
             for update to authenticated
             using (public.has_role(auth.uid(), ''admin''))
             with check (public.has_role(auth.uid(), ''admin''))';

  execute 'drop policy if exists "tcg_banners_admin_delete" on public.tcg_banners';
  execute 'create policy "tcg_banners_admin_delete" on public.tcg_banners
             for delete to authenticated
             using (public.has_role(auth.uid(), ''admin''))';
end $$;
```

## Passo 6 — Escrita cosmética do jogador, decks e notificações

```sql
set lock_timeout = '5s';

do $$
declare
  col text;
  t text;
begin
  if to_regclass('public.tcg_players') is not null then
    foreach col in array array['username','avatar_url','banner_url'] loop
      if exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='tcg_players' and column_name=col) then
        execute format('grant update (%I) on public.tcg_players to authenticated', col);
      end if;
    end loop;
  end if;

  foreach t in array array['decks','deck_cards'] loop
    if to_regclass('public.' || t) is not null then
      execute format('grant select, insert, update, delete on public.%I to authenticated', t);
      execute format('grant all on public.%I to service_role', t);
    end if;
  end loop;

  if to_regclass('public.notifications') is not null then
    execute 'grant select, update on public.notifications to authenticated';
    execute 'grant all on public.notifications to service_role';
  end if;
end $$;
```

## Passo 7 — Recarregar o schema da API

```sql
notify pgrst, 'reload schema';
```

---

Depois disso, a 0058 pode ser considerada substituída por esta. As demais
revogações do hotfix 0056 continuam valendo.
