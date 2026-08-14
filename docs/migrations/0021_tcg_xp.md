# Migração — Sistema de XP do TCG

Execute no **SQL Editor** do Supabase.

Regras:
- XP por carta: Comum 5, Rara 12, Épica 30, Lendária 80
- Bônus por carta inédita: +15 / +40 / +100 / +250
- Sequência diária: 3 dias +5%, 7 dias +10%, 14 dias +15%, 30 dias +25%
- Progressão: `xpParaProximoNivel = 100 + (nivelAtual - 1) * 25`
- Tabela `tcg_duel_xp_rules` preparada para duelos (participar 20, vitória +30, primeira vitória do dia +20)

```sql
CREATE TABLE IF NOT EXISTS public.tcg_duel_xp_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  label text NOT NULL,
  xp integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tcg_duel_xp_rules TO authenticated;
GRANT ALL ON public.tcg_duel_xp_rules TO service_role;
ALTER TABLE public.tcg_duel_xp_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "duel xp rules read" ON public.tcg_duel_xp_rules;
CREATE POLICY "duel xp rules read" ON public.tcg_duel_xp_rules
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "duel xp rules admin write" ON public.tcg_duel_xp_rules;
CREATE POLICY "duel xp rules admin write" ON public.tcg_duel_xp_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.tcg_duel_xp_rules (rule_key, label, xp) VALUES
  ('duel_participate', 'Participar de um duelo', 20),
  ('duel_win', 'Vencer um duelo', 30),
  ('duel_first_win_of_day', 'Primeira vitória do dia', 20)
ON CONFLICT (rule_key) DO UPDATE SET label = EXCLUDED.label, xp = EXCLUDED.xp, updated_at = now();

CREATE OR REPLACE FUNCTION public.tcg_xp_to_next_level(_level integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT 100 + (GREATEST(_level, 1) - 1) * 25;
$$;

CREATE OR REPLACE FUNCTION public.tcg_grant_xp(_user_id uuid, _amount integer)
RETURNS TABLE(out_level integer, out_xp integer, out_gained integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _level int; _xp int; _need int;
BEGIN
  INSERT INTO public.tcg_players (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT level, xp INTO _level, _xp FROM public.tcg_players WHERE user_id = _user_id;
  _level := GREATEST(COALESCE(_level, 1), 1);
  _xp := GREATEST(COALESCE(_xp, 0), 0) + GREATEST(COALESCE(_amount, 0), 0);
  LOOP
    _need := public.tcg_xp_to_next_level(_level);
    EXIT WHEN _xp < _need;
    _xp := _xp - _need;
    _level := _level + 1;
  END LOOP;
  UPDATE public.tcg_players SET level = _level, xp = _xp WHERE user_id = _user_id;
  out_level := _level; out_xp := _xp; out_gained := GREATEST(COALESCE(_amount, 0), 0);
  RETURN NEXT;
END; $$;

GRANT EXECUTE ON FUNCTION public.tcg_xp_to_next_level(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tcg_grant_xp(uuid, integer) TO authenticated;

DROP FUNCTION IF EXISTS public.tcg_claim_daily_reward();
CREATE OR REPLACE FUNCTION public.tcg_claim_daily_reward()
RETURNS TABLE(out_card_id uuid, out_name text, out_rarity text, out_image_url text, out_is_new boolean, out_xp integer, out_total_xp integer, out_streak integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    _user_id uuid := auth.uid();
    _last_claim timestamptz; _now timestamptz := now();
    _card record; _count int; _slot int; _r numeric; _rarity text; _pool text[];
    _streak int; _mult numeric; _is_new boolean; _base int; _bonus int; _card_xp int; _total_xp int := 0;
BEGIN
    IF _user_id IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;

    SELECT last_claim INTO _last_claim FROM public.daily_rewards WHERE user_id = _user_id;
    IF _last_claim IS NOT NULL AND _now < _last_claim + interval '12 hours' THEN
        RAISE EXCEPTION 'Aguarde 12 horas entre os resgates.';
    END IF;

    SELECT count(*) INTO _count FROM public.cards WHERE status = 'ACTIVE';
    IF _count = 0 THEN RAISE EXCEPTION 'Nenhuma carta ativa disponível para recompensa no momento.'; END IF;

    INSERT INTO public.daily_rewards (user_id, last_claim, streak)
    VALUES (_user_id, _now, 1)
    ON CONFLICT (user_id) DO UPDATE
    SET streak = CASE WHEN daily_rewards.last_claim > _now - interval '48 hours' THEN daily_rewards.streak + 1 ELSE 1 END,
        last_claim = _now
    RETURNING streak INTO _streak;

    UPDATE public.tcg_players SET last_daily_reward_at = _now WHERE user_id = _user_id;

    _mult := CASE WHEN _streak >= 30 THEN 1.25 WHEN _streak >= 14 THEN 1.15
                  WHEN _streak >= 7 THEN 1.10 WHEN _streak >= 3 THEN 1.05 ELSE 1.00 END;

    FOR _slot IN 1..4 LOOP
        _r := random() * 100;
        IF _slot <= 2 THEN
            _rarity := 'COMUM'; _pool := ARRAY['COMUM','RARA','EPICA','LENDARIA'];
        ELSIF _slot = 3 THEN
            _rarity := CASE WHEN _r < 82 THEN 'RARA' WHEN _r < 99 THEN 'EPICA' ELSE 'LENDARIA' END;
            _pool := ARRAY['RARA','EPICA','LENDARIA','COMUM'];
        ELSE
            _rarity := CASE WHEN _r < 70 THEN 'COMUM' WHEN _r < 93 THEN 'RARA' WHEN _r < 99 THEN 'EPICA' ELSE 'LENDARIA' END;
            _pool := ARRAY['COMUM','RARA','EPICA','LENDARIA'];
        END IF;

        SELECT c.id, c.name, c.rarity, c.image_url INTO _card
        FROM public.cards c WHERE c.status = 'ACTIVE' AND c.rarity = _rarity ORDER BY random() LIMIT 1;
        IF NOT FOUND THEN
            SELECT c.id, c.name, c.rarity, c.image_url INTO _card FROM public.cards c
            WHERE c.status = 'ACTIVE' AND c.rarity = ANY(_pool)
            ORDER BY array_position(_pool, c.rarity), random() LIMIT 1;
        END IF;
        IF NOT FOUND THEN
            SELECT c.id, c.name, c.rarity, c.image_url INTO _card
            FROM public.cards c WHERE c.status = 'ACTIVE' ORDER BY random() LIMIT 1;
        END IF;

        SELECT NOT EXISTS (SELECT 1 FROM public.user_cards uc WHERE uc.user_id = _user_id AND uc.card_id = _card.id) INTO _is_new;

        INSERT INTO public.user_cards (user_id, card_id, quantity)
        VALUES (_user_id, _card.id, 1)
        ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = user_cards.quantity + 1;

        _base := CASE _card.rarity WHEN 'COMUM' THEN 5 WHEN 'RARA' THEN 12 WHEN 'EPICA' THEN 30 WHEN 'LENDARIA' THEN 80 ELSE 5 END;
        _bonus := CASE WHEN NOT _is_new THEN 0
                       WHEN _card.rarity = 'COMUM' THEN 15 WHEN _card.rarity = 'RARA' THEN 40
                       WHEN _card.rarity = 'EPICA' THEN 100 WHEN _card.rarity = 'LENDARIA' THEN 250 ELSE 15 END;
        _card_xp := floor((_base + _bonus) * _mult)::int;
        _total_xp := _total_xp + _card_xp;

        out_card_id := _card.id; out_name := _card.name; out_rarity := _card.rarity;
        out_image_url := _card.image_url; out_is_new := _is_new; out_xp := _card_xp;
        out_total_xp := _total_xp; out_streak := _streak;
        RETURN NEXT;
    END LOOP;

    PERFORM public.tcg_grant_xp(_user_id, _total_xp);
END; $$;

GRANT EXECUTE ON FUNCTION public.tcg_claim_daily_reward() TO authenticated;
```
