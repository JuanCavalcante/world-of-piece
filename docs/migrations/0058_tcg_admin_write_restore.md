# Migração 0058 — Restaurar escrita direta que a 0056 quebrou (painéis de admin)

O hotfix 0056 revogou `INSERT/UPDATE/DELETE` de `authenticated` em todas as
tabelas de economia. Duas dessas tabelas ainda são escritas **diretamente pelo
painel de admin** (não via RPC), então quebraram:

- `public.cards` → `/admin/woptcg/cartas` ("permission denied for table cards")
- `public.tcg_banners` → `/admin/woptcg/bannerduelo` ("permission denied for table tcg_banners")

A solução é devolver o GRANT e deixar a RLS filtrar: só quem passa em
`public.has_role(auth.uid(), 'admin')` consegue escrever. Todas as outras
revogações do hotfix permanecem.

Esta migração substitui/engloba a 0057 (é idempotente, pode rodar mesmo que a
0057 já tenha sido aplicada).

Execute no **SQL Editor** do Supabase.

```sql
begin;

-- ============================================================
-- 1) cards — leitura pública, escrita só de admin (via RLS)
-- ============================================================
grant select on public.cards to anon;
grant select, insert, update, delete on public.cards to authenticated;
grant all on public.cards to service_role;

alter table public.cards enable row level security;

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

-- ============================================================
-- 2) tcg_banners — mesma regra
-- ============================================================
do $$
begin
  if to_regclass('public.tcg_banners') is null then
    return;
  end if;

  execute 'grant select on public.tcg_banners to anon';
  execute 'grant select, insert, update, delete on public.tcg_banners to authenticated';
  execute 'grant all on public.tcg_banners to service_role';

  execute 'alter table public.tcg_banners enable row level security';

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

-- ============================================================
-- 3) tcg_players — reforçar o UPDATE cosmético do próprio jogador
--    (perfil/nick/avatar/banner continuam funcionando)
-- ============================================================
do $$
declare
  col text;
begin
  if to_regclass('public.tcg_players') is null then
    return;
  end if;
  foreach col in array array['username','avatar_url','banner_url'] loop
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='tcg_players' and column_name=col) then
      execute format('grant update (%I) on public.tcg_players to authenticated', col);
    end if;
  end loop;
end $$;

-- ============================================================
-- 4) decks / deck_cards — garantir que a montagem de baralho segue livre
-- ============================================================
do $$
declare
  t text;
begin
  foreach t in array array['decks','deck_cards'] loop
    if to_regclass('public.' || t) is not null then
      execute format('grant select, insert, update, delete on public.%I to authenticated', t);
      execute format('grant all on public.%I to service_role', t);
    end if;
  end loop;
end $$;

-- ============================================================
-- 5) notifications — leitura/baixa das próprias notificações
-- ============================================================
do $$
begin
  if to_regclass('public.notifications') is not null then
    execute 'grant select, update on public.notifications to authenticated';
    execute 'grant all on public.notifications to service_role';
  end if;
end $$;

commit;

notify pgrst, 'reload schema';
```

## O que continua bloqueado (intencional)

`user_cards`, `tcg_wallets`, `tcg_player_stats`, `tcg_duel_matches`,
`tcg_user_achievements`, `tcg_packs*`, filas/partidas PvP e mercado seguem sem
escrita direta — só mudam por funções `SECURITY DEFINER` / `service_role`.

## Se aparecer o mesmo erro em outra tabela

O padrão é sempre o mesmo: `GRANT` para `authenticated` + política RLS exigindo
`public.has_role(auth.uid(), 'admin')` (ou `user_id = auth.uid()` quando for
dado do próprio jogador). Me diga qual tabela apareceu na mensagem que eu gero
o bloco correspondente.
