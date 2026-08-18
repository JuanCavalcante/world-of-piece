# 0052 — Card de recompensa no duelo JxJ

Persiste XP/VR de cada duelo e faz `tcg_pvp_my_reward` devolver a recompensa
completa do jogador, para exibir o mesmo modal de fim de duelo usado no JxIA.

```sql
-- ============================================================
-- 1. Colunas de recompensa no histórico
-- ============================================================
alter table public.tcg_duel_matches add column if not exists xp integer not null default 0;
alter table public.tcg_duel_matches add column if not exists vr_delta integer not null default 0;
alter table public.tcg_duel_matches add column if not exists vr_after integer not null default 0;
alter table public.tcg_duel_matches add column if not exists win_streak integer not null default 0;
alter table public.tcg_duel_matches add column if not exists loss_streak integer not null default 0;
alter table public.tcg_duel_matches add column if not exists best_win_streak integer not null default 0;

-- ============================================================
-- 2. tcg_finish_match grava as recompensas
-- ============================================================
create or replace function public.tcg_finish_match(
  _winner_id uuid,
  _loser_id uuid,
  _turns integer default 0,
  _winner_name text default 'Você',
  _loser_name text default 'Adversário',
  _ranked boolean default true,
  _early_surrender boolean default false
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
  _is_pvp boolean := (_winner_id is not null and _loser_id is not null);
begin
  if _uid is null then
    if current_user not in ('postgres', 'service_role', 'supabase_admin') then
      raise exception 'not authenticated';
    end if;
  elsif not (_uid = any(_ids)) then
    raise exception 'forbidden';
  end if;

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

    if not coalesce(_ranked, true) then
      _vr_delta := 0;
    end if;

    if coalesce(_early_surrender, false) then
      _xp := 0;
      if _won then _vr_delta := 0; end if;
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

    insert into public.tcg_duel_matches (
      user_id, winner, loser, turns, won, is_pvp, opponent_id,
      xp, vr_delta, vr_after, win_streak, loss_streak, best_win_streak
    )
    values (
      _id, _winner_name, _loser_name, greatest(coalesce(_turns, 0), 0), _won,
      _is_pvp,
      case when _won then _loser_id else _winner_id end,
      _xp, _st.vr - _old_vr, _st.vr, _st.win_streak, _st.loss_streak, _st.best_win_streak
    );

    update public.tcg_players set
      wins = wins + case when _won then 1 else 0 end,
      losses = losses + case when _won then 0 else 1 end
    where user_id = _id;

    if _xp > 0 then perform public.tcg_grant_xp(_id, _xp); end if;

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

grant execute on function public.tcg_finish_match(uuid, uuid, integer, text, text, boolean, boolean) to authenticated;

-- ============================================================
-- 3. tcg_pvp_my_reward devolve a recompensa completa
-- ============================================================
drop function if exists public.tcg_pvp_my_reward(uuid);

create or replace function public.tcg_pvp_my_reward(_match_id uuid)
returns table (
  out_won boolean,
  out_status text,
  out_turns integer,
  out_xp integer,
  out_vr_delta integer,
  out_vr integer,
  out_win_streak integer,
  out_loss_streak integer,
  out_best_win_streak integer
)
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  m record;
  d record;
  s record;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  select * into m from public.tcg_pvp_matches where id = _match_id;
  if m is null then raise exception 'match_not_found'; end if;
  if me <> m.p1_id and me <> m.p2_id then raise exception 'not_a_participant'; end if;

  select * into d
  from public.tcg_duel_matches
  where user_id = me
    and is_pvp
    and created_at >= coalesce(m.rewarded_at, m.updated_at, m.created_at) - interval '2 minutes'
  order by created_at desc
  limit 1;

  select * into s from public.tcg_player_stats where user_id = me;

  out_won := (m.winner_id = me);
  out_status := m.status;
  out_turns := coalesce(d.turns, m.turn_count, 0);
  out_xp := coalesce(d.xp, 0);
  out_vr_delta := coalesce(d.vr_delta, 0);
  out_vr := coalesce(d.vr_after, s.vr, 0);
  out_win_streak := coalesce(d.win_streak, s.win_streak, 0);
  out_loss_streak := coalesce(d.loss_streak, s.loss_streak, 0);
  out_best_win_streak := coalesce(d.best_win_streak, s.best_win_streak, 0);
  return next;
end $$;

grant execute on function public.tcg_pvp_my_reward(uuid) to authenticated;
```


