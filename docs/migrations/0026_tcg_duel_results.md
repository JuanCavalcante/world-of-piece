# 0026 — Resultado dos duelos (histórico + vitórias/derrotas do jogador)

Execute no **SQL Editor** do Supabase.

## 1. Coluna `won` no histórico de duelos

```sql
ALTER TABLE public.tcg_duel_matches ADD COLUMN IF NOT EXISTS won boolean;
```

## 2. Função que registra o duelo e atualiza vitórias/derrotas

```sql
CREATE OR REPLACE FUNCTION public.tcg_record_duel_result(
  _winner text,
  _loser text,
  _turns integer,
  _won boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  INSERT INTO public.tcg_duel_matches (user_id, winner, loser, turns, won)
  VALUES (_user_id, _winner, _loser, GREATEST(COALESCE(_turns, 0), 0), COALESCE(_won, false));

  INSERT INTO public.tcg_players (user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.tcg_players
  SET wins = wins + CASE WHEN _won THEN 1 ELSE 0 END,
      losses = losses + CASE WHEN _won THEN 0 ELSE 1 END
  WHERE user_id = _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tcg_record_duel_result(text, text, integer, boolean) TO authenticated;
```

## 3. (Opcional) Backfill do campo `won` dos duelos antigos

```sql
UPDATE public.tcg_duel_matches SET won = (winner = 'Você') WHERE won IS NULL;
```
