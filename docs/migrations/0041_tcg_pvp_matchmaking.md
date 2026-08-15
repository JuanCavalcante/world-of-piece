# 0041 — Duelo Jogador vs Jogador (matchmaking + partida autoritativa)

> **Execute este SQL no SQL Editor do Supabase.** Execute os blocos na ordem apresentada.
> Nenhuma tabela ou função existente é alterada. O JxIA continua funcionando sem esta migração;
> apenas o modo JxJ depende dela.

## Variáveis de ambiente necessárias (Vercel)

O motor autoritativo roda em Server Functions e precisa das variáveis **de servidor** abaixo
(além das `VITE_*` já existentes):

```
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

Sem elas o JxJ retorna erro ao iniciar a partida (o JxIA não é afetado).

---

## 1. Tabela `tcg_pvp_matches`

```sql
CREATE TABLE IF NOT EXISTS public.tcg_pvp_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  p1_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  p2_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  p1_name text NOT NULL DEFAULT 'Jogador',
  p2_name text NOT NULL DEFAULT 'Jogador',
  p1_deck_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  p2_deck_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'PREPARING'
    CHECK (status IN ('PREPARING','ACTIVE','FINISHED','CANCELLED')),
  state jsonb,
  state_version integer NOT NULL DEFAULT 1,
  version integer NOT NULL DEFAULT 0,
  turn_user_id uuid,
  turn_started_at timestamptz NOT NULL DEFAULT now(),
  turn_count integer NOT NULL DEFAULT 1,
  winner_id uuid,
  rewarded_at timestamptz,
  p1_seen_at timestamptz NOT NULL DEFAULT now(),
  p2_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- O cliente NUNCA recebe a coluna `state` (contém a mão dos dois jogadores).
GRANT SELECT (id, p1_id, p2_id, p1_name, p2_name, status, turn_user_id, turn_count,
              winner_id, version, created_at, updated_at)
  ON public.tcg_pvp_matches TO authenticated;
GRANT ALL ON public.tcg_pvp_matches TO service_role;

ALTER TABLE public.tcg_pvp_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pvp match participants read" ON public.tcg_pvp_matches;
CREATE POLICY "pvp match participants read" ON public.tcg_pvp_matches
  FOR SELECT TO authenticated
  USING (auth.uid() = p1_id OR auth.uid() = p2_id);

CREATE INDEX IF NOT EXISTS tcg_pvp_matches_p1_live
  ON public.tcg_pvp_matches (p1_id) WHERE status IN ('PREPARING','ACTIVE');
CREATE INDEX IF NOT EXISTS tcg_pvp_matches_p2_live
  ON public.tcg_pvp_matches (p2_id) WHERE status IN ('PREPARING','ACTIVE');
CREATE INDEX IF NOT EXISTS tcg_pvp_matches_status_updated
  ON public.tcg_pvp_matches (status, updated_at);
```

## 2. Tabela `tcg_pvp_queue`

```sql
CREATE TABLE IF NOT EXISTS public.tcg_pvp_queue (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id uuid,
  deck_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  player_name text NOT NULL DEFAULT 'Jogador',
  status text NOT NULL DEFAULT 'SEARCHING' CHECK (status IN ('SEARCHING','MATCHED')),
  match_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tcg_pvp_queue TO authenticated;
GRANT ALL ON public.tcg_pvp_queue TO service_role;

ALTER TABLE public.tcg_pvp_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pvp queue self read" ON public.tcg_pvp_queue;
CREATE POLICY "pvp queue self read" ON public.tcg_pvp_queue
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS tcg_pvp_queue_searching
  ON public.tcg_pvp_queue (status, updated_at);
```

## 3. Tabela `tcg_pvp_match_actions` (auditoria / base de replay)

```sql
CREATE TABLE IF NOT EXISTS public.tcg_pvp_match_actions (
  id bigserial PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES public.tcg_pvp_matches(id) ON DELETE CASCADE,
  player_id uuid,
  action_type text NOT NULL,
  action_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  turn_number integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tcg_pvp_match_actions TO authenticated;
GRANT ALL ON public.tcg_pvp_match_actions TO service_role;

ALTER TABLE public.tcg_pvp_match_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pvp actions participants read" ON public.tcg_pvp_match_actions;
CREATE POLICY "pvp actions participants read" ON public.tcg_pvp_match_actions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tcg_pvp_matches m
    WHERE m.id = match_id AND (m.p1_id = auth.uid() OR m.p2_id = auth.uid())
  ));

CREATE INDEX IF NOT EXISTS tcg_pvp_actions_match ON public.tcg_pvp_match_actions (match_id, id);
```

## 4. Limpeza / resolução de partidas paradas

```sql
CREATE OR REPLACE FUNCTION public.tcg_pvp_resolve_stale(_limit integer DEFAULT 20)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m record;
  n integer := 0;
  grace interval := interval '30 seconds';
  hard_cap interval := interval '2 hours';
  p1_out boolean;
  p2_out boolean;
BEGIN
  DELETE FROM public.tcg_pvp_queue
   WHERE status = 'SEARCHING' AND updated_at < now() - interval '60 seconds';

  FOR m IN
    SELECT * FROM public.tcg_pvp_matches
     WHERE status IN ('PREPARING','ACTIVE')
       AND (created_at < now() - hard_cap
            OR (p1_seen_at < now() - grace AND updated_at < now() - grace)
            OR (p2_seen_at < now() - grace AND updated_at < now() - grace))
     ORDER BY updated_at
     LIMIT GREATEST(1, _limit)
     FOR UPDATE SKIP LOCKED
  LOOP
    p1_out := m.p1_seen_at < now() - grace;
    p2_out := m.p2_seen_at < now() - grace;

    IF m.created_at < now() - hard_cap OR (p1_out AND p2_out) THEN
      UPDATE public.tcg_pvp_matches
         SET status = 'CANCELLED', winner_id = NULL,
             rewarded_at = COALESCE(rewarded_at, now()), updated_at = now()
       WHERE id = m.id AND rewarded_at IS NULL;
      n := n + 1;
    ELSIF p1_out OR p2_out THEN
      UPDATE public.tcg_pvp_matches
         SET status = 'FINISHED',
             winner_id = CASE WHEN p1_out THEN m.p2_id ELSE m.p1_id END,
             rewarded_at = now(), updated_at = now()
       WHERE id = m.id AND rewarded_at IS NULL;
      IF FOUND THEN
        PERFORM public.tcg_finish_match(
          CASE WHEN p1_out THEN m.p2_id ELSE m.p1_id END,
          CASE WHEN p1_out THEN m.p1_id ELSE m.p2_id END,
          m.turn_count,
          CASE WHEN p1_out THEN m.p2_name ELSE m.p1_name END,
          CASE WHEN p1_out THEN m.p1_name ELSE m.p2_name END);
        n := n + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tcg_pvp_resolve_stale(integer) TO authenticated, service_role;
```

## 5. Fila: entrar, sair, status

```sql
CREATE OR REPLACE FUNCTION public.tcg_pvp_join_queue(_deck_id uuid)
RETURNS TABLE (out_status text, out_match_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  my_name text;
  snap jsonb;
  live uuid;
  foe record;
  new_match uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  PERFORM public.tcg_pvp_resolve_stale(20);

  SELECT id INTO live FROM public.tcg_pvp_matches
   WHERE (p1_id = me OR p2_id = me) AND status IN ('PREPARING','ACTIVE') LIMIT 1;
  IF live IS NOT NULL THEN
    RETURN QUERY SELECT 'IN_MATCH'::text, live; RETURN;
  END IF;

  SELECT COALESCE(NULLIF(username, ''), 'Jogador') INTO my_name
    FROM public.tcg_players WHERE user_id = me;
  my_name := COALESCE(my_name, 'Jogador');

  -- Congela o baralho escolhido: [{card_id, quantity}, ...]
  SELECT COALESCE(jsonb_agg(jsonb_build_object('card_id', dc.card_id, 'quantity', dc.quantity)), '[]'::jsonb)
    INTO snap
    FROM public.tcg_deck_cards dc
    JOIN public.tcg_decks d ON d.id = dc.deck_id
   WHERE d.id = _deck_id AND d.user_id = me;

  IF snap IS NULL OR jsonb_array_length(snap) = 0 THEN
    RAISE EXCEPTION 'invalid_deck';
  END IF;

  INSERT INTO public.tcg_pvp_queue (user_id, deck_id, deck_snapshot, player_name, status, match_id, updated_at)
  VALUES (me, _deck_id, snap, my_name, 'SEARCHING', NULL, now())
  ON CONFLICT (user_id) DO UPDATE
    SET deck_id = EXCLUDED.deck_id,
        deck_snapshot = EXCLUDED.deck_snapshot,
        player_name = EXCLUDED.player_name,
        status = 'SEARCHING',
        match_id = NULL,
        updated_at = now();

  SELECT * INTO foe FROM public.tcg_pvp_queue
   WHERE status = 'SEARCHING'
     AND user_id <> me
     AND updated_at > now() - interval '60 seconds'
   ORDER BY random()
   LIMIT 1
   FOR UPDATE SKIP LOCKED;

  IF foe IS NULL THEN
    RETURN QUERY SELECT 'SEARCHING'::text, NULL::uuid; RETURN;
  END IF;

  INSERT INTO public.tcg_pvp_matches
    (p1_id, p2_id, p1_name, p2_name, p1_deck_snapshot, p2_deck_snapshot, status, turn_user_id)
  VALUES (me, foe.user_id, my_name, foe.player_name, snap, foe.deck_snapshot, 'PREPARING', me)
  RETURNING id INTO new_match;

  UPDATE public.tcg_pvp_queue SET status = 'MATCHED', match_id = new_match, updated_at = now()
   WHERE user_id IN (me, foe.user_id);

  RETURN QUERY SELECT 'MATCHED'::text, new_match;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tcg_pvp_join_queue(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.tcg_pvp_leave_queue()
RETURNS TABLE (out_status text, out_match_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); row_q record;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO row_q FROM public.tcg_pvp_queue WHERE user_id = me FOR UPDATE;
  IF row_q IS NULL THEN RETURN QUERY SELECT 'IDLE'::text, NULL::uuid; RETURN; END IF;
  IF row_q.status = 'MATCHED' THEN
    RETURN QUERY SELECT 'ALREADY_MATCHED'::text, row_q.match_id; RETURN;
  END IF;
  DELETE FROM public.tcg_pvp_queue WHERE user_id = me;
  RETURN QUERY SELECT 'IDLE'::text, NULL::uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tcg_pvp_leave_queue() TO authenticated;

CREATE OR REPLACE FUNCTION public.tcg_pvp_queue_status()
RETURNS TABLE (out_status text, out_match_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); row_q record;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  UPDATE public.tcg_pvp_queue SET updated_at = now()
   WHERE user_id = me AND status = 'SEARCHING';
  SELECT * INTO row_q FROM public.tcg_pvp_queue WHERE user_id = me;
  IF row_q IS NULL THEN RETURN QUERY SELECT 'IDLE'::text, NULL::uuid; RETURN; END IF;
  RETURN QUERY SELECT row_q.status, row_q.match_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tcg_pvp_queue_status() TO authenticated;
```

## 6. Partida ativa, presença e leitura redigida

```sql
CREATE OR REPLACE FUNCTION public.tcg_pvp_active_match()
RETURNS TABLE (out_match_id uuid, out_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); m record;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  PERFORM public.tcg_pvp_resolve_stale(20);
  SELECT id, status INTO m FROM public.tcg_pvp_matches
   WHERE (p1_id = me OR p2_id = me) AND status IN ('PREPARING','ACTIVE')
   ORDER BY created_at DESC LIMIT 1;
  IF m IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT m.id, m.status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tcg_pvp_active_match() TO authenticated;

CREATE OR REPLACE FUNCTION public.tcg_pvp_ping(_match_id uuid)
RETURNS TABLE (out_status text, out_version integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); m record;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO m FROM public.tcg_pvp_matches WHERE id = _match_id;
  IF m IS NULL THEN RAISE EXCEPTION 'match_not_found'; END IF;
  IF me <> m.p1_id AND me <> m.p2_id THEN RAISE EXCEPTION 'not_a_participant'; END IF;

  UPDATE public.tcg_pvp_matches
     SET p1_seen_at = CASE WHEN me = p1_id THEN now() ELSE p1_seen_at END,
         p2_seen_at = CASE WHEN me = p2_id THEN now() ELSE p2_seen_at END
   WHERE id = _match_id;

  PERFORM public.tcg_pvp_resolve_stale(5);

  SELECT status, version INTO m FROM public.tcg_pvp_matches WHERE id = _match_id;
  RETURN QUERY SELECT m.status, m.version;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tcg_pvp_ping(uuid) TO authenticated;

-- Leitura REDIGIDA: a mão e o deck do adversário viram apenas contagem.
CREATE OR REPLACE FUNCTION public.tcg_pvp_match_view(_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  m record;
  st jsonb;
  mine jsonb;
  theirs jsonb;
  swap boolean;
  turn text;
  fx jsonb;
  logs jsonb;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO m FROM public.tcg_pvp_matches WHERE id = _match_id;
  IF m IS NULL THEN RAISE EXCEPTION 'match_not_found'; END IF;
  IF me <> m.p1_id AND me <> m.p2_id THEN RAISE EXCEPTION 'not_a_participant'; END IF;

  IF m.state IS NULL THEN
    RETURN jsonb_build_object(
      'match_id', m.id, 'status', m.status, 'version', m.version,
      'winner_id', m.winner_id, 'opponent_name',
      CASE WHEN me = m.p1_id THEN m.p2_name ELSE m.p1_name END,
      'opponent_id', CASE WHEN me = m.p1_id THEN m.p2_id ELSE m.p1_id END,
      'is_my_turn', false, 'state', NULL);
  END IF;

  st := m.state;
  swap := (me = m.p2_id);
  mine   := CASE WHEN swap THEN st->'foe' ELSE st->'you' END;
  theirs := CASE WHEN swap THEN st->'you' ELSE st->'foe' END;

  theirs := theirs
    || jsonb_build_object(
         'handCount', COALESCE(jsonb_array_length(theirs->'hand'), 0),
         'deckCount', COALESCE(jsonb_array_length(theirs->'deck'), 0),
         'hand', '[]'::jsonb,
         'deck', '[]'::jsonb);
  mine := mine
    || jsonb_build_object(
         'handCount', COALESCE(jsonb_array_length(mine->'hand'), 0),
         'deckCount', COALESCE(jsonb_array_length(mine->'deck'), 0));

  turn := st->>'turn';
  IF swap THEN turn := CASE WHEN turn = 'you' THEN 'foe' ELSE 'you' END; END IF;

  fx := COALESCE(st->'fx', '{}'::jsonb);
  IF swap AND fx ? 'target' AND fx->>'target' IS NOT NULL THEN
    fx := jsonb_set(fx, '{target}',
      to_jsonb(CASE WHEN fx->>'target' = 'you' THEN 'foe' ELSE 'you' END));
  END IF;

  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'id', e->'id',
             'side', CASE
                       WHEN e->>'side' = 'system' THEN 'system'
                       WHEN swap THEN CASE WHEN e->>'side' = 'you' THEN 'foe' ELSE 'you' END
                       ELSE e->>'side' END,
             'text', CASE
                       WHEN e->>'side' <> 'system'
                        AND ((swap AND e->>'side' = 'you') OR (NOT swap AND e->>'side' = 'foe'))
                        AND e->>'text' ILIKE '%descartou%'
                       THEN 'O adversário descartou uma carta (mão cheia).'
                       ELSE e->>'text' END)
           ORDER BY (e->>'id')::bigint), '[]'::jsonb)
    INTO logs
    FROM jsonb_array_elements(COALESCE(st->'log', '[]'::jsonb)) e;

  RETURN jsonb_build_object(
    'match_id', m.id,
    'status', m.status,
    'version', m.version,
    'winner_id', m.winner_id,
    'opponent_id', CASE WHEN swap THEN m.p1_id ELSE m.p2_id END,
    'opponent_name', CASE WHEN swap THEN m.p1_name ELSE m.p2_name END,
    'opponent_seen_at', CASE WHEN swap THEN m.p1_seen_at ELSE m.p2_seen_at END,
    'is_my_turn', (m.turn_user_id = me AND m.status = 'ACTIVE'),
    'state', jsonb_build_object(
      'state_version', COALESCE(st->'state_version', to_jsonb(1)),
      'you', mine,
      'foe', theirs,
      'turn', turn,
      'turnCount', COALESCE(st->'turnCount', to_jsonb(1)),
      'over', COALESCE(st->'over', 'false'::jsonb),
      'winner', CASE
                  WHEN st->>'winner' IS NULL THEN NULL
                  WHEN swap THEN to_jsonb(CASE WHEN st->>'winner' = 'you' THEN 'foe' ELSE 'you' END)
                  ELSE st->'winner' END,
      'fx', fx,
      'log', logs));
END;
$$;

GRANT EXECUTE ON FUNCTION public.tcg_pvp_match_view(uuid) TO authenticated;
```

## 7. Motor autoritativo (somente `service_role`)

Estas duas funções carregam/gravam o estado completo e **não** são concedidas a `authenticated`:
só a Server Function (service role) as usa.

```sql
CREATE OR REPLACE FUNCTION public.tcg_pvp_lock_match(_match_id uuid, _actor uuid)
RETURNS public.tcg_pvp_matches
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.tcg_pvp_matches;
BEGIN
  SELECT * INTO m FROM public.tcg_pvp_matches WHERE id = _match_id FOR UPDATE;
  IF m IS NULL THEN RAISE EXCEPTION 'match_not_found'; END IF;
  IF _actor IS NOT NULL AND _actor <> m.p1_id AND _actor <> m.p2_id THEN
    RAISE EXCEPTION 'not_a_participant';
  END IF;
  RETURN m;
END;
$$;

REVOKE ALL ON FUNCTION public.tcg_pvp_lock_match(uuid, uuid) FROM public, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.tcg_pvp_lock_match(uuid, uuid) TO service_role;

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
DECLARE m public.tcg_pvp_matches; new_version integer; rewarded boolean := false;
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

  IF _over AND m.rewarded_at IS NULL AND _winner_id IS NOT NULL THEN
    PERFORM public.tcg_finish_match(
      _winner_id,
      CASE WHEN _winner_id = m.p1_id THEN m.p2_id ELSE m.p1_id END,
      GREATEST(_turn_count, 0),
      CASE WHEN _winner_id = m.p1_id THEN m.p1_name ELSE m.p2_name END,
      CASE WHEN _winner_id = m.p1_id THEN m.p2_name ELSE m.p1_name END);
    rewarded := true;
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

## 8. Recompensa do duelo (retorno para o cliente)

```sql
CREATE OR REPLACE FUNCTION public.tcg_pvp_my_reward(_match_id uuid)
RETURNS TABLE (out_won boolean, out_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); m record;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO m FROM public.tcg_pvp_matches WHERE id = _match_id;
  IF m IS NULL THEN RAISE EXCEPTION 'match_not_found'; END IF;
  IF me <> m.p1_id AND me <> m.p2_id THEN RAISE EXCEPTION 'not_a_participant'; END IF;
  RETURN QUERY SELECT (m.winner_id = me), m.status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tcg_pvp_my_reward(uuid) TO authenticated;
```

## 9. Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.tcg_pvp_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tcg_pvp_queue;
```

## 10. (Opcional) limpeza agendada com `pg_cron`

```sql
-- Só execute se a extensão pg_cron estiver habilitada no seu projeto.
-- select cron.schedule('tcg_pvp_cleanup', '* * * * *', $$select public.tcg_pvp_resolve_stale(100)$$);
```

---

## Testes rápidos (SQL Editor)

```sql
-- 1. Fila vazia
select * from public.tcg_pvp_queue;
-- 2. Partidas vivas
select id, status, p1_name, p2_name, turn_count from public.tcg_pvp_matches order by created_at desc limit 10;
-- 3. Limpeza manual
select public.tcg_pvp_resolve_stale(100);
-- 4. Conferir que `state` não é legível pelo cliente:
--    no app (sessão autenticada) rodar `select state from tcg_pvp_matches` deve falhar por permissão.
```

## Rollback

```sql
DROP FUNCTION IF EXISTS public.tcg_pvp_my_reward(uuid);
DROP FUNCTION IF EXISTS public.tcg_pvp_apply_state(uuid, uuid, integer, jsonb, uuid, integer, boolean, uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.tcg_pvp_lock_match(uuid, uuid);
DROP FUNCTION IF EXISTS public.tcg_pvp_match_view(uuid);
DROP FUNCTION IF EXISTS public.tcg_pvp_ping(uuid);
DROP FUNCTION IF EXISTS public.tcg_pvp_active_match();
DROP FUNCTION IF EXISTS public.tcg_pvp_queue_status();
DROP FUNCTION IF EXISTS public.tcg_pvp_leave_queue();
DROP FUNCTION IF EXISTS public.tcg_pvp_join_queue(uuid);
DROP FUNCTION IF EXISTS public.tcg_pvp_resolve_stale(integer);
DROP TABLE IF EXISTS public.tcg_pvp_match_actions CASCADE;
DROP TABLE IF EXISTS public.tcg_pvp_queue CASCADE;
DROP TABLE IF EXISTS public.tcg_pvp_matches CASCADE;
```
