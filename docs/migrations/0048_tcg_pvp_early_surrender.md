# 0048 — Rendição antecipada no JxJ (menos de 10 turnos)

Rode este SQL no SQL Editor do Supabase (depois do 0047).

## O que muda

- Se um jogador **se render antes do turno 10** em um duelo JxJ:
  - quem se rendeu perde VR normalmente (`-20`) e **não ganha XP**;
  - o vencedor **não ganha VR nem XP** (a vitória ainda é registrada no histórico).
- A partir do **turno 10**, a rendição concede VR e XP normalmente para os dois lados.
- Duelos JxIA (`_ranked => false`) continuam sem VR.

```sql
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

    -- Duelos não ranqueados (JxIA) não movem VR.
    if not coalesce(_ranked, true) then
      _vr_delta := 0;
    end if;

    -- Rendição antes de 10 turnos: vencedor não ganha nada; perdedor só perde VR.
    if coalesce(_early_surrender, false) then
      if _won then
        _xp := 0;
        _vr_delta := 0;
      else
        _xp := 0;
      end if;
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

    insert into public.tcg_duel_matches (user_id, winner, loser, turns, won)
    values (_id, _winner_name, _loser_name, greatest(coalesce(_turns, 0), 0), _won);

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
```

## Aplicação do estado PvP (detecta a rendição antecipada)

```sql
CREATE OR REPLACE FUNCTION public.tcg_pvp_apply_state(
  _match_id uuid,
  _actor uuid,
  _expected_version integer,
  _state jsonb,
  _turn_user_id uuid,
  _turn_count integer,
  _over boolean,
  _winner_id uuid,
  _action_type text,
  _action_data jsonb
)
RETURNS TABLE (out_ok boolean, out_version integer, out_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.tcg_pvp_matches; new_version integer; early boolean := false;
BEGIN
  SELECT * INTO m FROM public.tcg_pvp_matches WHERE id = _match_id FOR UPDATE;
  IF m IS NULL THEN RAISE EXCEPTION 'match_not_found'; END IF;
  IF m.version <> _expected_version THEN
    RETURN QUERY SELECT false, m.version, m.status; RETURN;
  END IF;
  IF m.status NOT IN ('PREPARING','ACTIVE') THEN
    RETURN QUERY SELECT false, m.version, m.status; RETURN;
  END IF;

  new_version := m.version + 1;

  UPDATE public.tcg_pvp_matches
     SET state = _state,
         version = new_version,
         turn_user_id = _turn_user_id,
         turn_count = GREATEST(_turn_count, 1),
         turn_started_at = CASE WHEN _turn_user_id IS DISTINCT FROM m.turn_user_id
                                THEN now() ELSE turn_started_at END,
         status = CASE WHEN _over THEN 'FINISHED' ELSE 'ACTIVE' END,
         winner_id = CASE WHEN _over THEN _winner_id ELSE NULL END,
         rewarded_at = CASE WHEN _over AND rewarded_at IS NULL THEN now() ELSE rewarded_at END,
         p1_seen_at = CASE WHEN _actor = p1_id THEN now() ELSE p1_seen_at END,
         p2_seen_at = CASE WHEN _actor = p2_id THEN now() ELSE p2_seen_at END,
         updated_at = now()
   WHERE id = _match_id;

  INSERT INTO public.tcg_pvp_match_actions (match_id, player_id, action_type, action_data, turn_number)
  VALUES (_match_id, _actor, COALESCE(_action_type,'UNKNOWN'), COALESCE(_action_data,'{}'::jsonb), GREATEST(_turn_count,0));

  early := COALESCE(_action_type, '') = 'SURRENDER' AND GREATEST(COALESCE(_turn_count, 0), 0) < 10;

  IF _over AND m.rewarded_at IS NULL AND _winner_id IS NOT NULL THEN
    PERFORM public.tcg_finish_match(
      _winner_id,
      CASE WHEN _winner_id = m.p1_id THEN m.p2_id ELSE m.p1_id END,
      GREATEST(_turn_count, 0),
      CASE WHEN _winner_id = m.p1_id THEN m.p1_name ELSE m.p2_name END,
      CASE WHEN _winner_id = m.p1_id THEN m.p2_name ELSE m.p1_name END,
      true,
      early);
  END IF;

  UPDATE public.tcg_pvp_queue SET status = 'MATCHED' WHERE match_id = _match_id AND status = 'SEARCHING';
  IF _over THEN
    DELETE FROM public.tcg_pvp_queue WHERE match_id = _match_id;
  END IF;

  RETURN QUERY SELECT true, new_version, CASE WHEN _over THEN 'FINISHED' ELSE 'ACTIVE' END;
END;
$$;

REVOKE ALL ON FUNCTION public.tcg_pvp_apply_state(uuid, uuid, integer, jsonb, uuid, integer, boolean, uuid, text, jsonb)
  FROM public, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.tcg_pvp_apply_state(uuid, uuid, integer, jsonb, uuid, integer, boolean, uuid, text, jsonb)
  TO service_role;
```
