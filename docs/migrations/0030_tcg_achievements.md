# 0030 — Conquistas e Missões Diárias (WOP TCG)

Execute no **SQL Editor** do Supabase (New query → colar → Run).

```sql
-- ============================================================
-- TABELAS
-- ============================================================
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text not null, -- COLLECTION | DUEL | PROGRESSION
  icon text,
  xp_reward integer not null default 0,
  pack_reward integer not null default 0,
  target_value integer not null,
  trigger_type text not null,
  rarity_filter text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists achievements_title_key on public.achievements (title);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  progress integer not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  reward_claimed boolean not null default false,
  primary key (user_id, achievement_id)
);

create table if not exists public.daily_missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  icon text,
  xp_reward integer not null default 0,
  target_value integer not null,
  trigger_type text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists daily_missions_trigger_key on public.daily_missions (trigger_type);

create table if not exists public.user_daily_missions (
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid not null references public.daily_missions(id) on delete cascade,
  progress integer not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  mission_date date not null,
  primary key (user_id, mission_id, mission_date)
);

create table if not exists public.daily_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  last_login_date date,
  bonus_claimed_date date
);
alter table public.daily_streaks add column if not exists bonus_claimed_date date;

-- contadores de eventos que não são deriváveis de outras tabelas
create table if not exists public.tcg_event_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  trigger_type text not null,
  value integer not null default 0,
  primary key (user_id, trigger_type)
);

-- ============================================================
-- GRANTS
-- ============================================================
grant select on public.achievements to anon, authenticated;
grant all on public.achievements to service_role;
grant select on public.daily_missions to anon, authenticated;
grant all on public.daily_missions to service_role;
grant select, insert, update on public.user_achievements to authenticated;
grant all on public.user_achievements to service_role;
grant select, insert, update on public.user_daily_missions to authenticated;
grant all on public.user_daily_missions to service_role;
grant select, insert, update on public.daily_streaks to authenticated;
grant all on public.daily_streaks to service_role;
grant select on public.tcg_event_counters to authenticated;
grant all on public.tcg_event_counters to service_role;

-- ============================================================
-- RLS
-- ============================================================
alter table public.achievements enable row level security;
alter table public.daily_missions enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_daily_missions enable row level security;
alter table public.daily_streaks enable row level security;
alter table public.tcg_event_counters enable row level security;

drop policy if exists "achievements read" on public.achievements;
create policy "achievements read" on public.achievements for select using (true);
drop policy if exists "achievements admin write" on public.achievements;
create policy "achievements admin write" on public.achievements for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "daily_missions read" on public.daily_missions;
create policy "daily_missions read" on public.daily_missions for select using (true);
drop policy if exists "daily_missions admin write" on public.daily_missions;
create policy "daily_missions admin write" on public.daily_missions for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "user_achievements own" on public.user_achievements;
create policy "user_achievements own" on public.user_achievements for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_daily_missions own" on public.user_daily_missions;
create policy "user_daily_missions own" on public.user_daily_missions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "daily_streaks own" on public.daily_streaks;
create policy "daily_streaks own" on public.daily_streaks for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tcg_event_counters own" on public.tcg_event_counters;
create policy "tcg_event_counters own" on public.tcg_event_counters for select to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================
create or replace function public.tcg_grant_pack(_user_id uuid, _size int default 5)
returns int language plpgsql security definer set search_path = public as $$
declare c record; n int := 0;
begin
  for c in select id from public.cards where status = 'ACTIVE' order by random() limit greatest(1, _size) loop
    insert into public.user_cards (user_id, card_id, quantity) values (_user_id, c.id, 1)
    on conflict (user_id, card_id) do update set quantity = public.user_cards.quantity + 1;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.tcg_track_event(_trigger text, _amount int default 1)
returns void language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid();
begin
  if _uid is null then raise exception 'not authenticated'; end if;
  insert into public.tcg_event_counters (user_id, trigger_type, value)
  values (_uid, _trigger, greatest(coalesce(_amount, 1), 0))
  on conflict (user_id, trigger_type)
  do update set value = public.tcg_event_counters.value + greatest(coalesce(_amount, 1), 0);
end $$;

-- ============================================================
-- SINCRONIZAÇÃO DE CONQUISTAS
-- ============================================================
create or replace function public.tcg_achievements_sync()
returns table(out_id uuid, out_title text, out_category text, out_xp integer, out_packs integer)
language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  a record;
  _val int;
  _pass int;
  _prev boolean;
begin
  if _uid is null then raise exception 'not authenticated'; end if;
  insert into public.tcg_players (user_id) values (_uid) on conflict (user_id) do nothing;

  for _pass in 1..2 loop
    for a in select * from public.achievements where is_active order by target_value loop
      select coalesce(completed, false) into _prev from public.user_achievements
        where user_id = _uid and achievement_id = a.id;
      if coalesce(_prev, false) then continue; end if;

      _val := case a.trigger_type
        when 'CARDS_OWNED' then (select coalesce(sum(quantity),0)::int from public.user_cards where user_id = _uid)
        when 'RARE_CARDS_OWNED' then (select coalesce(sum(uc.quantity),0)::int from public.user_cards uc join public.cards c on c.id = uc.card_id where uc.user_id = _uid and c.rarity = 'RARA')
        when 'EPIC_CARDS_OWNED' then (select coalesce(sum(uc.quantity),0)::int from public.user_cards uc join public.cards c on c.id = uc.card_id where uc.user_id = _uid and c.rarity = 'EPICA')
        when 'LEGENDARY_CARDS_OWNED' then (select coalesce(sum(uc.quantity),0)::int from public.user_cards uc join public.cards c on c.id = uc.card_id where uc.user_id = _uid and c.rarity = 'LENDARIA')
        when 'DECKS_CREATED' then (select count(*)::int from public.decks where user_id = _uid)
        when 'FULL_DECK_CREATED' then (select count(*)::int from (
              select d.id from public.decks d join public.deck_cards dc on dc.deck_id = d.id
              where d.user_id = _uid group by d.id having coalesce(sum(dc.quantity),0) >= 20) f)
        when 'MATCHES_PLAYED' then (select count(*)::int from public.tcg_duel_matches where user_id = _uid)
        when 'MATCHES_WON' then (select count(*)::int from public.tcg_duel_matches where user_id = _uid and won)
        when 'WIN_STREAK' then (select count(*)::int from (
              select won, row_number() over (order by created_at desc) rn,
                     sum(case when won then 0 else 1 end) over (order by created_at desc rows between unbounded preceding and current row) brk
              from public.tcg_duel_matches where user_id = _uid) s where s.brk = 0)
        when 'PLAYER_LEVEL' then (select coalesce(level,1)::int from public.tcg_players where user_id = _uid)
        when 'COLLECTION_ACHIEVEMENTS_COMPLETED' then (select count(*)::int from public.user_achievements ua join public.achievements ac on ac.id = ua.achievement_id where ua.user_id = _uid and ua.completed and ac.category = 'COLLECTION')
        when 'DUEL_ACHIEVEMENTS_COMPLETED' then (select count(*)::int from public.user_achievements ua join public.achievements ac on ac.id = ua.achievement_id where ua.user_id = _uid and ua.completed and ac.category = 'DUEL')
        when 'DAILY_MISSIONS_COMPLETED' then (select count(*)::int from public.user_daily_missions where user_id = _uid and completed)
        when 'TOTAL_ACHIEVEMENTS_COMPLETED' then (select count(*)::int from public.user_achievements where user_id = _uid and completed)
        else (select coalesce(value,0)::int from public.tcg_event_counters where user_id = _uid and trigger_type = a.trigger_type)
      end;
      _val := coalesce(_val, 0);

      insert into public.user_achievements (user_id, achievement_id, progress, completed, completed_at, reward_claimed)
      values (_uid, a.id, least(_val, a.target_value), _val >= a.target_value,
              case when _val >= a.target_value then now() else null end, false)
      on conflict (user_id, achievement_id) do update
        set progress = least(_val, a.target_value),
            completed = (_val >= a.target_value),
            completed_at = case when _val >= a.target_value then coalesce(public.user_achievements.completed_at, now()) else null end;

      if _val >= a.target_value then
        update public.user_achievements set reward_claimed = true
          where user_id = _uid and achievement_id = a.id and reward_claimed = false;
        if found then
          if a.xp_reward > 0 then perform public.tcg_grant_xp(_uid, a.xp_reward); end if;
          if a.pack_reward > 0 then perform public.tcg_grant_pack(_uid, a.pack_reward * 5); end if;
          out_id := a.id; out_title := a.title; out_category := a.category;
          out_xp := a.xp_reward; out_packs := a.pack_reward;
          return next;
        end if;
      end if;
    end loop;
  end loop;
end $$;

-- ============================================================
-- MISSÕES DIÁRIAS
-- ============================================================
create or replace function public.tcg_daily_bootstrap()
returns table(out_streak integer, out_best integer, out_new_login boolean)
language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _today date := (now() at time zone 'America/Sao_Paulo')::date;
  _s record; _new boolean := false;
begin
  if _uid is null then raise exception 'not authenticated'; end if;
  insert into public.tcg_players (user_id) values (_uid) on conflict (user_id) do nothing;
  insert into public.daily_streaks (user_id) values (_uid) on conflict (user_id) do nothing;
  select * into _s from public.daily_streaks where user_id = _uid;

  if _s.last_login_date is null or _s.last_login_date < _today then
    _new := true;
    update public.daily_streaks
      set current_streak = case when _s.last_login_date = _today - 1 then least(_s.current_streak + 1, 7) else 1 end,
          best_streak = greatest(_s.best_streak, case when _s.last_login_date = _today - 1 then _s.current_streak + 1 else 1 end),
          last_login_date = _today
      where user_id = _uid;
  end if;

  insert into public.user_daily_missions (user_id, mission_id, mission_date)
  select _uid, m.id, _today from public.daily_missions m where m.is_active
  on conflict do nothing;

  select * into _s from public.daily_streaks where user_id = _uid;
  out_streak := _s.current_streak; out_best := _s.best_streak; out_new_login := _new;
  return next;
end $$;

create or replace function public.tcg_daily_track(_trigger text, _amount int default 1)
returns table(out_mission_id uuid, out_title text, out_xp integer, out_bonus boolean)
language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _today date := (now() at time zone 'America/Sao_Paulo')::date;
  m record; _prog int; _total int; _done int; _bonus_date date;
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
      if m.xp_reward > 0 then perform public.tcg_grant_xp(_uid, m.xp_reward); end if;
      out_mission_id := m.id; out_title := m.title; out_xp := m.xp_reward; out_bonus := false;
      return next;
    end if;
  end loop;

  select count(*)::int into _total from public.daily_missions where is_active;
  select count(*)::int into _done from public.user_daily_missions
    where user_id = _uid and mission_date = _today and completed;
  select bonus_claimed_date into _bonus_date from public.daily_streaks where user_id = _uid;

  if _total > 0 and _done >= _total and (_bonus_date is null or _bonus_date < _today) then
    update public.daily_streaks set bonus_claimed_date = _today where user_id = _uid;
    perform public.tcg_grant_pack(_uid, 5);
    out_mission_id := null; out_title := 'Bônus Diário'; out_xp := 0; out_bonus := true;
    return next;
  end if;
end $$;

grant execute on function public.tcg_grant_pack(uuid, int) to service_role;
grant execute on function public.tcg_track_event(text, int) to authenticated;
grant execute on function public.tcg_achievements_sync() to authenticated;
grant execute on function public.tcg_daily_bootstrap() to authenticated;
grant execute on function public.tcg_daily_track(text, int) to authenticated;

-- ============================================================
-- CONQUISTAS INICIAIS
-- ============================================================
insert into public.achievements (title, description, category, icon, xp_reward, pack_reward, target_value, trigger_type) values
  ('Primeiro Tesouro', 'Obtenha 10 cartas na sua coleção.', 'COLLECTION', 'Coins', 50, 1, 10, 'CARDS_OWNED'),
  ('Colecionador', 'Obtenha 50 cartas na sua coleção.', 'COLLECTION', 'Layers', 150, 2, 50, 'CARDS_OWNED'),
  ('Arquivo do Novo Mundo', 'Obtenha 100 cartas na sua coleção.', 'COLLECTION', 'Library', 300, 3, 100, 'CARDS_OWNED'),
  ('Mestre dos Baralhos', 'Crie 3 baralhos.', 'COLLECTION', 'BookOpen', 100, 1, 3, 'DECKS_CREATED'),
  ('Arsenal Completo', 'Monte um baralho completo.', 'COLLECTION', 'ShieldCheck', 75, 1, 1, 'FULL_DECK_CREATED'),
  ('Primeira Batalha', 'Jogue 1 partida de duelo.', 'DUEL', 'Swords', 25, 0, 1, 'MATCHES_PLAYED'),
  ('Veterano do Mar', 'Jogue 25 partidas de duelo.', 'DUEL', 'Swords', 120, 1, 25, 'MATCHES_PLAYED'),
  ('Lenda dos Duelos', 'Jogue 100 partidas de duelo.', 'DUEL', 'Flame', 400, 3, 100, 'MATCHES_PLAYED'),
  ('Vitória Inicial', 'Vença 1 partida.', 'DUEL', 'Trophy', 40, 0, 1, 'MATCHES_WON'),
  ('Capitão Experiente', 'Vença 10 partidas.', 'DUEL', 'Trophy', 150, 1, 10, 'MATCHES_WON'),
  ('Imperador dos Mares', 'Vença 50 partidas.', 'DUEL', 'Crown', 500, 3, 50, 'MATCHES_WON'),
  ('Novato Promissor', 'Alcance o nível 5.', 'PROGRESSION', 'Star', 0, 1, 5, 'PLAYER_LEVEL'),
  ('Capitão em Ascensão', 'Alcance o nível 10.', 'PROGRESSION', 'Star', 0, 2, 10, 'PLAYER_LEVEL'),
  ('Lenda Viva', 'Alcance o nível 20.', 'PROGRESSION', 'Sparkles', 0, 5, 20, 'PLAYER_LEVEL'),
  ('Colecionador Dedicado', 'Complete 5 conquistas de coleção.', 'PROGRESSION', 'Layers', 0, 1, 5, 'COLLECTION_ACHIEVEMENTS_COMPLETED'),
  ('Guerreiro dos Mares', 'Complete 5 conquistas de duelo.', 'PROGRESSION', 'Swords', 0, 1, 5, 'DUEL_ACHIEVEMENTS_COMPLETED'),
  ('Rotina de Navegador', 'Complete 7 missões diárias.', 'PROGRESSION', 'CalendarCheck', 0, 1, 7, 'DAILY_MISSIONS_COMPLETED'),
  ('Disciplina de Ferro', 'Complete 30 missões diárias.', 'PROGRESSION', 'CalendarCheck', 0, 3, 30, 'DAILY_MISSIONS_COMPLETED'),
  ('Conquistador', 'Complete 25 conquistas.', 'PROGRESSION', 'Medal', 0, 2, 25, 'TOTAL_ACHIEVEMENTS_COMPLETED'),
  ('Rei das Conquistas', 'Complete 50 conquistas.', 'PROGRESSION', 'Crown', 0, 5, 50, 'TOTAL_ACHIEVEMENTS_COMPLETED')
on conflict (title) do update set
  description = excluded.description, category = excluded.category, icon = excluded.icon,
  xp_reward = excluded.xp_reward, pack_reward = excluded.pack_reward,
  target_value = excluded.target_value, trigger_type = excluded.trigger_type;

-- ============================================================
-- MISSÕES DIÁRIAS INICIAIS
-- ============================================================
insert into public.daily_missions (title, description, icon, xp_reward, target_value, trigger_type) values
  ('Fazer login', 'Entre no WOP TCG hoje.', 'LogIn', 20, 1, 'DAILY_LOGIN'),
  ('Abrir um pack', 'Abra um pack de cartas hoje.', 'Package', 20, 1, 'DAILY_CARDS_OBTAINED'),
  ('Jogar 2 partidas', 'Participe de 2 duelos hoje.', 'Swords', 40, 2, 'DAILY_MATCHES_PLAYED'),
  ('Vencer 1 partida', 'Vença um duelo hoje.', 'Trophy', 60, 1, 'DAILY_MATCHES_WON')
on conflict (trigger_type) do update set
  title = excluded.title, description = excluded.description, icon = excluded.icon,
  xp_reward = excluded.xp_reward, target_value = excluded.target_value;

notify pgrst, 'reload schema';
```
