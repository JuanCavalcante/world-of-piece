# 0037 — Correção: forjar não consumia fragmentos

`tcg_add_fragments` clampava o valor recebido com `GREATEST(_amount, 0)`, o que
transformava qualquer débito (ex.: `-10` ao forjar) em `+0`. Resultado: o jogador
podia forjar infinitamente sem gastar fragmentos.

Esta migração corrige a função para aplicar deltas negativos, nunca deixando o
saldo abaixo de zero, e faz o `tcg_forge_card` debitar de forma atômica
(com trava por linha e verificação do saldo no próprio UPDATE).

Rode no SQL Editor do Supabase:

```sql
-- 1) Corrige a aplicação do delta (permite débito)
CREATE OR REPLACE FUNCTION public.tcg_add_fragments(_user_id uuid, _rarity text, _amount int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _col text;
BEGIN
  _col := CASE _rarity
    WHEN 'COMUM' THEN 'common_fragments'
    WHEN 'INCOMUM' THEN 'uncommon_fragments'
    WHEN 'RARA' THEN 'rare_fragments'
    WHEN 'EPICA' THEN 'epic_fragments'
    WHEN 'LENDARIA' THEN 'legendary_fragments'
    ELSE NULL END;
  IF _col IS NULL THEN RAISE EXCEPTION 'Raridade inválida: %', _rarity; END IF;
  PERFORM public.tcg_ensure_wallet(_user_id);
  EXECUTE format(
    'UPDATE public.tcg_wallets SET %I = GREATEST(0, COALESCE(%I,0) + $1), updated_at = now() WHERE user_id = $2',
    _col, _col
  ) USING _amount, _user_id;
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_add_fragments(uuid, text, int) TO service_role;

-- 2) Débito atômico de N fragmentos (retorna false se não houver saldo)
CREATE OR REPLACE FUNCTION public.tcg_spend_fragments(_user_id uuid, _rarity text, _amount int)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _col text; _ok boolean;
BEGIN
  IF _amount <= 0 THEN RETURN true; END IF;
  _col := CASE _rarity
    WHEN 'COMUM' THEN 'common_fragments'
    WHEN 'INCOMUM' THEN 'uncommon_fragments'
    WHEN 'RARA' THEN 'rare_fragments'
    WHEN 'EPICA' THEN 'epic_fragments'
    WHEN 'LENDARIA' THEN 'legendary_fragments'
    ELSE NULL END;
  IF _col IS NULL THEN RAISE EXCEPTION 'Raridade inválida: %', _rarity; END IF;
  PERFORM public.tcg_ensure_wallet(_user_id);
  EXECUTE format(
    'UPDATE public.tcg_wallets SET %I = %I - $1, updated_at = now()
       WHERE user_id = $2 AND %I >= $1 RETURNING true',
    _col, _col, _col
  ) INTO _ok USING _amount, _user_id;
  RETURN COALESCE(_ok, false);
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_spend_fragments(uuid, text, int) TO service_role;

-- 3) Forjar agora debita de forma atômica
CREATE OR REPLACE FUNCTION public.tcg_forge_card(_rarity text)
RETURNS TABLE(out_card_id uuid, out_name text, out_rarity text, out_image_url text, out_is_new boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _card record; _is_new boolean; _paid boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;
  IF _rarity NOT IN ('COMUM','INCOMUM','RARA','EPICA','LENDARIA') THEN
    RAISE EXCEPTION 'Raridade inválida.'; END IF;

  SELECT c.id, c.name, c.rarity, c.image_url INTO _card
  FROM public.cards c WHERE c.status = 'ACTIVE' AND c.rarity = _rarity
  ORDER BY random() LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nenhuma carta ativa da raridade % disponível para forjar.', _rarity; END IF;

  -- consumir 10 fragmentos (falha se não houver saldo)
  _paid := public.tcg_spend_fragments(_uid, _rarity, 10);
  IF NOT _paid THEN
    RAISE EXCEPTION 'Fragmentos insuficientes. Necessário 10 de %.', _rarity; END IF;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_cards uc WHERE uc.user_id = _uid AND uc.card_id = _card.id) INTO _is_new;
  INSERT INTO public.user_cards (user_id, card_id, quantity) VALUES (_uid, _card.id, 1)
  ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = public.user_cards.quantity + 1;

  PERFORM public.tcg_track_event('CARDS_FORGED', 1);
  PERFORM public.tcg_notify(_uid, 'Carta Forjada!',
    'Você forjou uma carta ' || _card.rarity || ': ' || _card.name, 'TCG_CRAFT');

  out_card_id := _card.id; out_name := _card.name; out_rarity := _card.rarity;
  out_image_url := _card.image_url; out_is_new := _is_new;
  RETURN NEXT;
END $$;
GRANT EXECUTE ON FUNCTION public.tcg_forge_card(text) TO authenticated;
```
