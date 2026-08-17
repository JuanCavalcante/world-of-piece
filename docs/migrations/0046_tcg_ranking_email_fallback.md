# 0046 — Fallback de username no ranking (e-mail quando não houver nick)

Execute no **SQL Editor** do Supabase (New query → colar → Run).

> Quando um jogador ainda não definiu um `username` em `public.tcg_players`, o ranking passa a exibir a parte local do e-mail (`nome@dominio.com` → `nome`).

```sql
-- ============================================================
-- 1. VIEW BASE: inclui fallback do e-mail do auth.users
-- ============================================================
create or replace view public.tcg_ranking_base
with (security_invoker = off) as
select
  p.user_id,
  coalesce(nullif(p.username, ''), split_part(u.email, '@', 1), 'Jogador') as username,
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
left join auth.users u on u.id = p.user_id
left join public.tcg_player_stats s on s.user_id = p.user_id
left join (
  select user_id, sum(quantity)::int as total_cards, count(*)::int as unique_cards
  from public.user_cards group by user_id
) c on c.user_id = p.user_id;

revoke all on public.tcg_ranking_base from anon, authenticated;

-- ============================================================
-- 2. RECRIAR FUNÇÕES DEPENDENTES
-- ============================================================
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

grant execute on function public.tcg_ranking(text, integer) to authenticated;
grant execute on function public.tcg_my_ranking(text) to authenticated;
grant execute on function public.tcg_public_profile(text) to authenticated;

NOTIFY pgrst, 'reload schema';
```
