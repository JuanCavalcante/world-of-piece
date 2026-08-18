# 0050 — Histórico unificado (JxIA + JxJ) e nomes com fallback de e-mail

Rode este SQL no **SQL Editor** do Supabase (depois do 0049).

## O que muda

- `tcg_duel_matches` passa a marcar se o duelo foi JxJ (`is_pvp`) e a guardar o `opponent_id`.
- Nova função `tcg_duel_history` devolve **os dois históricos** (JxIA e JxJ) para `/tcggame/duels`,
  resolvendo o nome do oponente: nick → parte local do e-mail → nome salvo.
- `tcg_pvp_history` corrigida: agora o e-mail vem **antes** do nome salvo na partida
  (que muitas vezes era o genérico "Jogador").

```sql
-- ============================================================
-- 1. Colunas novas
-- ============================================================
alter table public.tcg_duel_matches
  add column if not exists is_pvp boolean not null default false,
  add column if not exists opponent_id uuid;

-- ============================================================
-- 2. tcg_finish_match: grava is_pvp e opponent_id
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

    insert into public.tcg_duel_matches (user_id, winner, loser, turns, won, is_pvp, opponent_id)
    values (
      _id, _winner_name, _loser_name, greatest(coalesce(_turns, 0), 0), _won,
      _is_pvp,
      case when _won then _loser_id else _winner_id end
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
-- 3. Nome exibível de um jogador (nick → e-mail → 'Jogador')
-- ============================================================
create or replace function public.tcg_display_name(_user_id uuid)
returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    nullif(trim(p.username), ''),
    split_part(u.email, '@', 1),
    'Jogador'
  )
  from auth.users u
  left join public.tcg_players p on p.user_id = u.id
  where u.id = _user_id;
$$;

grant execute on function public.tcg_display_name(uuid) to authenticated, anon;

-- ============================================================
-- 4. Histórico completo (JxIA + JxJ) para /tcggame/duels
-- ============================================================
create or replace function public.tcg_duel_history(_user_id uuid, _limit integer default 20)
returns table (
  out_match_id uuid,
  out_opponent_name text,
  out_won boolean,
  out_turns integer,
  out_is_pvp boolean,
  out_created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    m.id,
    coalesce(
      case when m.opponent_id is not null then public.tcg_display_name(m.opponent_id) end,
      nullif(case when m.won then m.loser else m.winner end, ''),
      'Adversário'
    ),
    coalesce(m.won, m.winner = 'Você'),
    coalesce(m.turns, 0),
    coalesce(m.is_pvp, false),
    m.created_at
  from public.tcg_duel_matches m
  where m.user_id = _user_id
  order by m.created_at desc
  limit greatest(1, least(coalesce(_limit, 20), 100));
$$;

grant execute on function public.tcg_duel_history(uuid, integer) to authenticated;

-- ============================================================
-- 5. tcg_pvp_history: e-mail antes do nome salvo na partida
-- ============================================================
create or replace function public.tcg_pvp_history(_user_id uuid, _limit integer default 20)
returns table (
  out_match_id uuid,
  out_opponent_id uuid,
  out_opponent_name text,
  out_won boolean,
  out_turns integer,
  out_created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    m.id,
    case when m.p1_id = _user_id then m.p2_id else m.p1_id end,
    coalesce(
      public.tcg_display_name(case when m.p1_id = _user_id then m.p2_id else m.p1_id end),
      nullif(case when m.p1_id = _user_id then m.p2_name else m.p1_name end, ''),
      'Jogador'
    ),
    (m.winner_id = _user_id),
    coalesce(m.turn_count, 0),
    coalesce(m.updated_at, m.created_at)
  from public.tcg_pvp_matches m
  where m.status = 'FINISHED'
    and m.winner_id is not null
    and (m.p1_id = _user_id or m.p2_id = _user_id)
  order by coalesce(m.updated_at, m.created_at) desc
  limit greatest(1, least(coalesce(_limit, 20), 100));
$$;

grant execute on function public.tcg_pvp_history(uuid, integer) to authenticated, anon;

NOTIFY pgrst, 'reload schema';
```
