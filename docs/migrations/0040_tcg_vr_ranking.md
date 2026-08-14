# 0040 — Recompensas Pós-Duelo, Valor de Recompensa (VR) e Rankings

Execute no **SQL Editor** do Supabase (New query → colar → Run).

> Observações:
> - `VR` é apenas pontuação competitiva (prestígio/ranking). Nunca é usado como moeda.
> - O nickname (`tcg_players.username`) passa a ser **único** (case-insensitive).
> - As conquistas de sequência usam o gatilho `BEST_WIN_STREAK` e as de VR usam `VR_TOTAL`
>   (assim a barra de progresso mostra o valor real, ex. 380/500 VR).

```sql
-- ============================================================
-- 1. TABELA DE ESTATÍSTICAS COMPETITIVAS
-- ============================================================
create table if not exists public.tcg_player_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  wins integer not null default 0,
  losses integer not null default 0,
  vr integer not null default 0,
  win_streak integer not null default 0,
  loss_streak integer not null default 0,
  best_win_streak integer not null default 0,
  updated_at timestamptz not null default now()
);

grant select on public.tcg_player_stats to authenticated;
grant all on public.tcg_player_stats to service_role;

alter table public.tcg_player_stats enable row level security;

drop policy if exists "tcg_player_stats own read" on public.tcg_player_stats;
create policy "tcg_player_stats own read" on public.tcg_player_stats
  for select to authenticated using (auth.uid() = user_id);

-- popula com quem já joga
insert into public.tcg_player_stats (user_id, wins, losses)
select p.user_id, coalesce(p.wins, 0), coalesce(p.losses, 0)
from public.tcg_players p
on conflict (user_id) do nothing;

-- ============================================================
-- 2. NICKNAME ÚNICO
-- ============================================================
-- Se este índice falhar, existem nicknames repetidos: ajuste-os e rode de novo.
create unique index if not exists tcg_players_username_unique
  on public.tcg_players (lower(username)) where username is not null;

-- ============================================================
-- 3. RPC ATÔMICA DE FIM DE DUELO
-- ============================================================
-- Duelos contra a IA passam NULL no id do oponente.
create or replace function public.tcg_finish_match(
  _winner_id uuid,
  _loser_id uuid,
  _turns integer default 0,
  _winner_name text default 'Você',
  _loser_name text default 'Adversário'
)
returns table (
  out_user_id uuid,
  out_won boolean,
  out_xp integer,
  out_vr_delta integer,
  out_vr integer,
  out_win_streak integer,
  out_loss_streak integer,
  out_best_win_streak integer
)
language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _ids uuid[] := array_remove(array[_winner_id, _loser_id], null);
  _id uuid;
  _won boolean;
  _st record;
  _bonus int;
  _xp int;
  _vr_delta int;
  _old_vr int;
begin
  if _uid is null then raise exception 'not authenticated'; end if;
  if not (_uid = any(_ids)) then raise exception 'forbidden'; end if;

  foreach _id in array _ids loop
    _won := (_id = _winner_id);

    insert into public.tcg_players (user_id) values (_id) on conflict (user_id) do nothing;
    insert into public.tcg_player_stats (user_id) values (_id) on conflict (user_id) do nothing;

    select * into _st from public.tcg_player_stats where user_id = _id for update;

    _old_vr := coalesce(_st.vr, 0);

    if _won then
      _bonus := least(coalesce(_st.win_streak, 0), 3);
      _xp := 20 + 5 * _bonus;
      _vr_delta := 20 + 5 * _bonus;
    else
      _bonus := least(coalesce(_st.loss_streak, 0), 3);
      _xp := 10 + 5 * _bonus;
      _vr_delta := -20;
    end if;


    update public.tcg_player_stats set
      wins = wins + case when _won then 1 else 0 end,
      losses = losses + case when _won then 0 else 1 end,
      vr = greatest(0, vr + _vr_delta),
      win_streak = case when _won then win_streak + 1 else 0 end,
      loss_streak = case when _won then 0 else loss_streak + 1 end,
      best_win_streak = greatest(best_win_streak, case when _won then win_streak + 1 else 0 end),
      updated_at = now()
    where user_id = _id
    returning * into _st;

    -- histórico + contadores legados de vitórias/derrotas
    insert into public.tcg_duel_matches (user_id, winner, loser, turns, won)
    values (_id, _winner_name, _loser_name, greatest(coalesce(_turns, 0), 0), _won);

    update public.tcg_players set
      wins = wins + case when _won then 1 else 0 end,
      losses = losses + case when _won then 0 else 1 end
    where user_id = _id;

    -- XP
    if _xp > 0 then perform public.tcg_grant_xp(_id, _xp); end if;

    -- gatilhos de conquistas
    insert into public.tcg_event_counters (user_id, trigger_type, value)
    values (_id, 'BEST_WIN_STREAK', _st.best_win_streak)
    on conflict (user_id, trigger_type) do update
      set value = greatest(public.tcg_event_counters.value, excluded.value);

    insert into public.tcg_event_counters (user_id, trigger_type, value)
    values (_id, 'VR_TOTAL', _st.vr)
    on conflict (user_id, trigger_type) do update set value = excluded.value;

    out_user_id := _id;
    out_won := _won;
    out_xp := _xp;
    out_vr_delta := _st.vr - _old_vr;
    out_vr := _st.vr;
    out_win_streak := _st.win_streak;
    out_loss_streak := _st.loss_streak;
    out_best_win_streak := _st.best_win_streak;
    return next;
  end loop;
end $$;

grant execute on function public.tcg_finish_match(uuid, uuid, integer, text, text) to authenticated;

-- ============================================================
-- 4. RANKINGS (RANK() OVER)
-- ============================================================
create or replace view public.tcg_ranking_base
with (security_invoker = off) as
select
  p.user_id,
  coalesce(nullif(p.username, ''), 'Jogador') as username,
  p.avatar_url,
  p.level,
  p.xp,
  coalesce(s.vr, 0) as vr,
  coalesce(s.wins, p.wins) as wins,
  coalesce(s.losses, p.losses) as losses,
  coalesce(s.win_streak, 0) as win_streak,
  coalesce(s.best_win_streak, 0) as best_win_streak,
  coalesce(c.total_cards, 0) as total_cards,
  coalesce(c.unique_cards, 0) as unique_cards
from public.tcg_players p
left join public.tcg_player_stats s on s.user_id = p.user_id
left join (
  select user_id, sum(quantity)::int as total_cards, count(*)::int as unique_cards
  from public.user_cards group by user_id
) c on c.user_id = p.user_id;

revoke all on public.tcg_ranking_base from anon, authenticated;

create or replace function public.tcg_ranking(_kind text, _limit integer default 10)
returns table (
  out_rank integer,
  out_user_id uuid,
  out_username text,
  out_avatar_url text,
  out_level integer,
  out_xp integer,
  out_vr integer,
  out_wins integer,
  out_losses integer,
  out_win_streak integer,
  out_best_win_streak integer,
  out_total_cards integer,
  out_unique_cards integer
)
language sql stable security definer set search_path = public as $$
  with ranked as (
    select b.*,
      case _kind
        when 'WINS'  then rank() over (order by b.wins desc, b.losses asc)
        when 'CARDS' then rank() over (order by b.total_cards desc, b.unique_cards desc)
        when 'VR'    then rank() over (order by b.vr desc, b.wins desc)
        else              rank() over (order by b.level desc, b.xp desc)
      end as rk
    from public.tcg_ranking_base b
  )
  select rk::int, user_id, username, avatar_url, level, xp, vr, wins, losses,
         win_streak, best_win_streak, total_cards, unique_cards
  from ranked
  order by rk asc, username asc
  limit greatest(coalesce(_limit, 10), 1);
$$;

create or replace function public.tcg_my_ranking(_kind text)
returns table (
  out_rank integer,
  out_total integer,
  out_username text,
  out_avatar_url text,
  out_level integer,
  out_xp integer,
  out_vr integer,
  out_wins integer,
  out_losses integer,
  out_win_streak integer,
  out_best_win_streak integer,
  out_total_cards integer,
  out_unique_cards integer
)
language sql stable security definer set search_path = public as $$
  with ranked as (
    select b.*,
      case _kind
        when 'WINS'  then rank() over (order by b.wins desc, b.losses asc)
        when 'CARDS' then rank() over (order by b.total_cards desc, b.unique_cards desc)
        when 'VR'    then rank() over (order by b.vr desc, b.wins desc)
        else              rank() over (order by b.level desc, b.xp desc)
      end as rk
    from public.tcg_ranking_base b
  )
  select rk::int, (select count(*)::int from ranked), username, avatar_url, level, xp, vr,
         wins, losses, win_streak, best_win_streak, total_cards, unique_cards
  from ranked where user_id = auth.uid();
$$;

-- Perfil público por nickname (sem e-mail, essência, fragmentos ou dados privados)
create or replace function public.tcg_public_profile(_nickname text)
returns table (
  out_user_id uuid,
  out_username text,
  out_avatar_url text,
  out_banner_url text,
  out_level integer,
  out_xp integer,
  out_vr integer,
  out_wins integer,
  out_losses integer,
  out_win_streak integer,
  out_best_win_streak integer,
  out_total_cards integer,
  out_unique_cards integer,
  out_rank_wins integer,
  out_rank_cards integer,
  out_rank_vr integer,
  out_rank_level integer
)
language sql stable security definer set search_path = public as $$
  with ranked as (
    select b.*,
      rank() over (order by b.wins desc, b.losses asc) as rk_wins,
      rank() over (order by b.total_cards desc, b.unique_cards desc) as rk_cards,
      rank() over (order by b.vr desc, b.wins desc) as rk_vr,
      rank() over (order by b.level desc, b.xp desc) as rk_level
    from public.tcg_ranking_base b
  )
  select r.user_id, r.username, r.avatar_url, p.banner_url, r.level, r.xp, r.vr, r.wins, r.losses,
         r.win_streak, r.best_win_streak, r.total_cards, r.unique_cards,
         r.rk_wins::int, r.rk_cards::int, r.rk_vr::int, r.rk_level::int
  from ranked r
  join public.tcg_players p on p.user_id = r.user_id
  where lower(r.username) = lower(trim(coalesce(_nickname, '')))
  limit 1;
$$;

create or replace function public.tcg_search_players(_q text, _limit integer default 5)
returns table (out_user_id uuid, out_username text, out_avatar_url text, out_level integer)
language sql stable security definer set search_path = public as $$
  select p.user_id, p.username, p.avatar_url, p.level
  from public.tcg_players p
  where p.username is not null and p.username <> ''
    and p.username ilike '%' || trim(coalesce(_q, '')) || '%'
  order by (lower(p.username) = lower(trim(coalesce(_q, '')))) desc, p.level desc, p.username asc
  limit greatest(coalesce(_limit, 5), 1);
$$;

grant execute on function public.tcg_ranking(text, integer) to authenticated;
grant execute on function public.tcg_my_ranking(text) to authenticated;
grant execute on function public.tcg_public_profile(text) to authenticated;
grant execute on function public.tcg_search_players(text, integer) to authenticated;

-- Estatísticas competitivas do próprio jogador (cria a linha se não existir)
create or replace function public.tcg_my_stats()
returns table (
  out_vr integer, out_wins integer, out_losses integer,
  out_win_streak integer, out_loss_streak integer, out_best_win_streak integer
)
language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid();
begin
  if _uid is null then raise exception 'not authenticated'; end if;
  insert into public.tcg_player_stats (user_id) values (_uid) on conflict (user_id) do nothing;
  return query
    select vr, wins, losses, win_streak, loss_streak, best_win_streak
    from public.tcg_player_stats where user_id = _uid;
end $$;

grant execute on function public.tcg_my_stats() to authenticated;

-- ============================================================
-- 5. NOVAS CONQUISTAS
-- ============================================================
insert into public.achievements (title, description, category, icon, xp_reward, pack_reward, target_value, trigger_type) values
  ('Primeira Sequência', 'Vença 3 duelos seguidos.', 'DUEL', 'Flame', 50, 0, 3, 'BEST_WIN_STREAK'),
  ('Maré Favorável', 'Vença 5 duelos seguidos.', 'DUEL', 'Waves', 120, 0, 5, 'BEST_WIN_STREAK'),
  ('Inabalável', 'Vença 10 duelos seguidos.', 'DUEL', 'ShieldCheck', 300, 1, 10, 'BEST_WIN_STREAK'),
  ('Caçador de Recompensas', 'Alcance 500 de Valor de Recompensa.', 'PROGRESSION', 'Trophy', 0, 1, 500, 'VR_TOTAL'),
  ('Temido nos Mares', 'Alcance 1000 de Valor de Recompensa.', 'PROGRESSION', 'Skull', 0, 1, 1000, 'VR_TOTAL'),
  ('Lenda Procurada', 'Alcance 2500 de Valor de Recompensa.', 'PROGRESSION', 'Crown', 0, 2, 2500, 'VR_TOTAL')
on conflict (title) do nothing;

NOTIFY pgrst, 'reload schema';
```

## Reset de contas

Se você usa `admin_tcg_reset_all_accounts` / `admin_tcg_reset_account` (migração 0039),
adicione também a limpeza das estatísticas competitivas:

```sql
-- dentro das funções de reset, ou manualmente:
-- DELETE FROM public.tcg_player_stats;                      -- reset geral
-- DELETE FROM public.tcg_player_stats WHERE user_id = '...';-- reset individual
```
