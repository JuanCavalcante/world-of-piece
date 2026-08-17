# 0047 — Histórico de duelos JxJ no perfil público

Execute no **SQL Editor** do Supabase.

```sql
CREATE OR REPLACE FUNCTION public.tcg_pvp_history(_user_id uuid, _limit integer DEFAULT 20)
RETURNS TABLE (
  out_match_id uuid,
  out_opponent_id uuid,
  out_opponent_name text,
  out_won boolean,
  out_turns integer,
  out_created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id,
    CASE WHEN m.p1_id = _user_id THEN m.p2_id ELSE m.p1_id END,
    COALESCE(
      NULLIF(
        (SELECT p.username FROM public.tcg_players p
          WHERE p.user_id = CASE WHEN m.p1_id = _user_id THEN m.p2_id ELSE m.p1_id END),
        ''
      ),
      NULLIF(CASE WHEN m.p1_id = _user_id THEN m.p2_name ELSE m.p1_name END, ''),
      split_part(
        (SELECT u.email FROM auth.users u
          WHERE u.id = CASE WHEN m.p1_id = _user_id THEN m.p2_id ELSE m.p1_id END),
        '@', 1
      ),
      'Jogador'
    ),
    (m.winner_id = _user_id),
    COALESCE(m.turn_count, 0),
    COALESCE(m.updated_at, m.created_at)
  FROM public.tcg_pvp_matches m
  WHERE m.status = 'FINISHED'
    AND m.winner_id IS NOT NULL
    AND (m.p1_id = _user_id OR m.p2_id = _user_id)
  ORDER BY COALESCE(m.updated_at, m.created_at) DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 20), 100));
$$;

GRANT EXECUTE ON FUNCTION public.tcg_pvp_history(uuid, integer) TO authenticated, anon;
```
