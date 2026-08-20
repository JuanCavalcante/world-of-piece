# 0056 — HOTFIX de segurança econômica (somente revogações e bloqueios)

Fecha os vetores críticos da auditoria **sem alterar nenhuma regra de jogo** e **sem exigir
mudanças no frontend**: o app só lê essas tabelas (escrita real acontece dentro de funções
`SECURITY DEFINER`), então revogar a escrita direta não quebra nada.

O que este hotfix faz:

1. Revoga `INSERT/UPDATE/DELETE` direto de `authenticated` nas tabelas de economia
   (`user_cards`, `tcg_wallets`, `tcg_players`, `tcg_player_stats`, `daily_rewards`,
   `tcg_duel_matches`, `tcg_packs*`, `tcg_user_achievements`, filas/partidas PvP, mercado).
2. Devolve a `tcg_players` **apenas** o `UPDATE` de colunas cosméticas (`username`,
   `avatar_url`, `banner_url`) — que é o único write direto que o app faz.
3. Revoga `EXECUTE` de RPCs de concessão arbitrária expostas a `authenticated`
   (`tcg_grant_xp`, `tcg_grant_pack`, `tcg_add_fragments`, `tcg_spend_fragments`,
   `tcg_ensure_wallet(uuid)`, `tcg_track_event_owner`, `tcg_notify`).
4. Mantém intactos: `decks`/`deck_cards` (montagem de baralho), todas as RPCs de gameplay
   usadas pelo app e as RPCs de admin (que já checam `has_role`).

> Pendente para a próxima etapa (fora do hotfix, exige mudança de código):
> tornar `tcg_finish_match` / `tcg_record_duel_result` autoritativos no servidor para o JxIA.

```sql
begin;

-- ============================================================
-- 1) Revogar escrita direta nas tabelas de economia
-- ============================================================
do $$
declare
  t text;
  tables text[] := array[
    'user_cards',
    'cards',
    'tcg_wallets',
    'tcg_players',
    'tcg_player_stats',
    'tcg_stats',
    'daily_rewards',
    'tcg_duel_matches',
    'tcg_duel_xp_rules',
    'tcg_packs',
    'tcg_user_packs',
    'tcg_achievements',
    'tcg_user_achievements',
    'tcg_event_counters',
    'tcg_daily_missions',
    'tcg_user_daily_missions',
    'tcg_banners',
    'tcg_market_listings',
    'tcg_trade_offers',
    'tcg_trade_offer_cards',
    'tcg_pvp_matches',
    'tcg_pvp_queue',
    'tcg_pvp_match_actions'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is not null then
      execute format('revoke insert, update, delete, truncate on public.%I from authenticated, anon', t);
      execute format('grant select on public.%I to authenticated', t);
      execute format('grant all on public.%I to service_role', t);
    end if;
  end loop;
end $$;

-- `cards` continua editável por admin, mas via RPC/`service_role` (RLS de admin permanece).
-- Se o painel admin de cartas usar escrita direta, reative apenas para admins com:
--   grant insert, update, delete on public.cards to authenticated;  -- RLS "cards admin write" filtra

-- ============================================================
-- 2) tcg_players: devolver somente UPDATE de colunas cosméticas
-- ============================================================
do $$
begin
  if to_regclass('public.tcg_players') is not null then
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='tcg_players' and column_name='username') then
      execute 'grant update (username) on public.tcg_players to authenticated';
    end if;
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='tcg_players' and column_name='avatar_url') then
      execute 'grant update (avatar_url) on public.tcg_players to authenticated';
    end if;
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='tcg_players' and column_name='banner_url') then
      execute 'grant update (banner_url) on public.tcg_players to authenticated';
    end if;
  end if;
end $$;

-- Garante que o UPDATE cosmético continue restrito ao próprio jogador.
do $$
begin
  if to_regclass('public.tcg_players') is not null then
    execute 'alter table public.tcg_players enable row level security';
    execute 'drop policy if exists "tcg_players self update" on public.tcg_players';
    execute 'create policy "tcg_players self update" on public.tcg_players
               for update to authenticated
               using (user_id = auth.uid())
               with check (user_id = auth.uid())';
  end if;
end $$;

-- ============================================================
-- 3) Revogar RPCs de concessão arbitrária expostas ao cliente
-- ============================================================
do $$
declare
  f record;
  blocked text[] := array[
    'tcg_grant_xp',
    'tcg_grant_pack',
    'tcg_add_fragments',
    'tcg_spend_fragments',
    'tcg_ensure_wallet',        -- versão com _user_id; tcg_ensure_wallet_self permanece
    'tcg_track_event_owner',
    'tcg_notify',
    'tcg_pvp_lock_match',
    'tcg_decline_trade_offer_inner',
    'tcg_expire_listings'
  ];
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any(blocked)
  loop
    -- preserva tcg_ensure_wallet_self() (nome diferente) e a variante sem argumentos
    if f.proname = 'tcg_ensure_wallet' and f.sig::text like '%()' then
      continue;
    end if;
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

-- ============================================================
-- 4) Bloquear execução pública por padrão em novas funções TCG
-- ============================================================
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.proname like 'tcg\_%' or p.proname like 'admin\_tcg\_%')
  loop
    -- remove o EXECUTE implícito de PUBLIC/anon; os GRANTs explícitos a
    -- `authenticated` feitos nas migrations anteriores continuam válidos.
    execute format('revoke execute on function %s from public, anon', f.sig);
  end loop;
end $$;

-- Exceção: histórico PvP é público (perfil aberto).
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p
           join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and p.proname in ('tcg_pvp_history','tcg_public_profile','tcg_ranking','tcg_display_name')
  loop
    execute format('grant execute on function %s to anon, authenticated', f.sig);
  end loop;
end $$;

commit;
```

## Verificação rápida (opcional)

```sql
-- Nenhuma escrita direta de authenticated nas tabelas de economia:
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'authenticated'
  and table_schema = 'public'
  and privilege_type in ('INSERT','UPDATE','DELETE')
order by table_name;
```

Esperado: apenas `decks`, `deck_cards` (e o `UPDATE` de colunas cosméticas em `tcg_players`,
que aparece em `information_schema.column_privileges`).

## Rollback

```sql
-- Reverte para o estado anterior (NÃO recomendado — reabre as falhas críticas)
grant select, insert, update, delete on public.user_cards, public.tcg_wallets,
  public.tcg_players, public.daily_rewards to authenticated;
grant insert on public.tcg_duel_matches to authenticated;
```
