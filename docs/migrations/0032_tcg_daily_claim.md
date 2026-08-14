# 0032 — Resgate manual das missões diárias + reset de conquistas

Execute no **SQL Editor** do Supabase.

## 1. Coluna de resgate nas missões diárias

```sql
alter table public.user_daily_missions
  add column if not exists reward_claimed boolean not null default false;
```

## 2. Track sem entrega automática

```sql
create or replace function public.tcg_daily_track(_trigger text, _amount int default 1)
returns table(out_mission_id uuid, out_title text, out_xp integer, out_bonus boolean)
language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _today date := (now() at time zone 'America/Sao_Paulo')::date;
  m record; _prog int;
begin
  if _uid is null then raise exception 'not authenticated'; end if;
  perform public.tcg_daily_bootstrap();

  for m in select * from public.daily_missions where is_active and trigger_type = _trigger loop
    select progress into _prog from public.user_daily_missions
      where user_id = _uid and mission_id = m.id and mission_date = _today;
    if _prog is null then _prog := 0; end if;
    if _prog >= m.target_value then continue; end if;
    _prog := least(_prog + greatest(coalesce(_amount, 1), 1), m.target_value);
    update public.user_daily_missions
      set progress = _prog,
          completed = (_prog >= m.target_value),
          completed_at = case when _prog >= m.target_value then now() else null end
      where user_id = _uid and mission_id = m.id and mission_date = _today;
    if _prog >= m.target_value then
      out_mission_id := m.id; out_title := m.title; out_xp := m.xp_reward; out_bonus := false;
      return next;
    end if;
  end loop;
end $$;

grant execute on function public.tcg_daily_track(text, int) to authenticated;
```

## 3. Resgatar missões diárias (uma ou todas) + bônus

```sql
create or replace function public.tcg_claim_daily(_mission_id uuid default null)
returns table(out_mission_id uuid, out_title text, out_xp integer, out_bonus boolean)
language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _today date := (now() at time zone 'America/Sao_Paulo')::date;
  r record; _total int; _done int; _bonus_date date;
begin
  if _uid is null then raise exception 'not authenticated'; end if;
  insert into public.tcg_players (user_id) values (_uid) on conflict (user_id) do nothing;

  for r in
    select m.id, m.title, m.xp_reward
    from public.user_daily_missions udm
    join public.daily_missions m on m.id = udm.mission_id
    where udm.user_id = _uid
      and udm.mission_date = _today
      and udm.completed
      and not udm.reward_claimed
      and (_mission_id is null or udm.mission_id = _mission_id)
  loop
    update public.user_daily_missions
      set reward_claimed = true
      where user_id = _uid and mission_id = r.id and mission_date = _today and reward_claimed = false;
    if found then
      if r.xp_reward > 0 then perform public.tcg_grant_xp(_uid, r.xp_reward); end if;
      out_mission_id := r.id; out_title := r.title; out_xp := r.xp_reward; out_bonus := false;
      return next;
    end if;
  end loop;

  -- bônus diário: só quando todas concluídas E resgatadas
  select count(*)::int into _total from public.daily_missions where is_active;
  select count(*)::int into _done from public.user_daily_missions
    where user_id = _uid and mission_date = _today and completed and reward_claimed;
  select bonus_claimed_date into _bonus_date from public.daily_streaks where user_id = _uid;

  if _total > 0 and _done >= _total and (_bonus_date is null or _bonus_date < _today) then
    update public.daily_streaks set bonus_claimed_date = _today where user_id = _uid;
    perform public.tcg_grant_pack(_uid, 5);
    out_mission_id := null; out_title := 'Bônus Diário'; out_xp := 0; out_bonus := true;
    return next;
  end if;
end $$;

grant execute on function public.tcg_claim_daily(uuid) to authenticated;
```

## 4. Reset de conta do TCG também limpa conquistas e diárias

```sql
create or replace function public.admin_tcg_reset_account(_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Apenas administradores podem resetar contas.';
  end if;

  delete from public.deck_cards where deck_id in (select id from public.decks where user_id = _user_id);
  delete from public.decks where user_id = _user_id;
  delete from public.user_cards where user_id = _user_id;
  delete from public.daily_rewards where user_id = _user_id;

  -- progressão: conquistas, missões diárias, sequência e contadores
  delete from public.user_achievements where user_id = _user_id;
  delete from public.user_daily_missions where user_id = _user_id;
  delete from public.daily_streaks where user_id = _user_id;
  delete from public.tcg_event_counters where user_id = _user_id;
  delete from public.tcg_duel_matches where user_id = _user_id;

  update public.tcg_players
  set level = 1, xp = 0, wins = 0, losses = 0, last_daily_reward_at = null
  where user_id = _user_id;
end $$;

grant execute on function public.admin_tcg_reset_account(uuid) to authenticated;
```
