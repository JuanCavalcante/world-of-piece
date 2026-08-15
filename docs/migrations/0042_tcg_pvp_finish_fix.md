# 0042 — Correção: fim de partida PvP ("not authenticated")

Rode este SQL no SQL Editor do Supabase.

## Problema

`public.tcg_pvp_apply_state` (executada pelo motor autoritativo com `service_role`)
chama `public.tcg_finish_match`, que exigia `auth.uid()`. Como não há sessão de
usuário nessa chamada interna, a função lançava `not authenticated` e a transação
era revertida — por isso não era possível vencer nem se render em partidas JxJ.

## Correção

```sql
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
  -- Chamadas internas (motor PvP autoritativo via service_role / SECURITY DEFINER)
  -- não possuem auth.uid(); nesse caso a autorização já foi feita pelo chamador.
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

```

Nada mais muda: a chamada direta do cliente continua exigindo sessão válida e
que o usuário seja um dos participantes.
