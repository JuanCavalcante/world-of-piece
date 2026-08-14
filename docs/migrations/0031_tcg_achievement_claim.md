# 0031 — Resgate manual de conquistas

Execute no **SQL Editor** do Supabase.

A sincronização passa a apenas **marcar** a conquista como concluída; as recompensas
só são entregues quando o jogador clicar em "Resgatar".

## 1. Sync sem entrega automática de recompensa

```sql
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
        out_id := a.id; out_title := a.title; out_category := a.category;
        out_xp := a.xp_reward; out_packs := a.pack_reward;
        return next;
      end if;
    end loop;
  end loop;
end $$;

grant execute on function public.tcg_achievements_sync() to authenticated;
```

## 2. Resgatar recompensas (uma ou todas)

```sql
create or replace function public.tcg_claim_achievements(_achievement_id uuid default null)
returns table(out_id uuid, out_title text, out_xp integer, out_packs integer)
language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  r record;
begin
  if _uid is null then raise exception 'not authenticated'; end if;
  insert into public.tcg_players (user_id) values (_uid) on conflict (user_id) do nothing;

  for r in
    select a.id, a.title, a.xp_reward, a.pack_reward
    from public.user_achievements ua
    join public.achievements a on a.id = ua.achievement_id
    where ua.user_id = _uid
      and ua.completed
      and not ua.reward_claimed
      and (_achievement_id is null or ua.achievement_id = _achievement_id)
  loop
    update public.user_achievements
      set reward_claimed = true
      where user_id = _uid and achievement_id = r.id and reward_claimed = false;
    if found then
      if r.xp_reward > 0 then perform public.tcg_grant_xp(_uid, r.xp_reward); end if;
      if r.pack_reward > 0 then perform public.tcg_grant_pack(_uid, r.pack_reward * 5); end if;
      out_id := r.id; out_title := r.title; out_xp := r.xp_reward; out_packs := r.pack_reward;
      return next;
    end if;
  end loop;
end $$;

grant execute on function public.tcg_claim_achievements(uuid) to authenticated;
```

## 3. (Opcional) Permitir resgatar conquistas já concluídas antes desta mudança

Se quiser que conquistas antigas (já entregues automaticamente) apareçam de novo como
resgatáveis, rode:

```sql
-- CUIDADO: isso libera o resgate novamente para todas as conquistas concluídas.
-- UPDATE public.user_achievements SET reward_claimed = false WHERE completed;
```
