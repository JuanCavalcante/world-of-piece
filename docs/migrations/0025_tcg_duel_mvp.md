# 0025 — Duelos TCG: ATK, efeitos e histórico de partidas

Execute no **SQL Editor** do Supabase.

## 1. Campos de ataque e efeito nas cartas

```sql
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS atk integer NOT NULL DEFAULT 10;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS effect_code text NOT NULL DEFAULT 'NONE';

ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_effect_code_valid;
ALTER TABLE public.cards ADD CONSTRAINT cards_effect_code_valid
  CHECK (effect_code IN ('NONE','DRAW_1','GAIN_1_AP','HEAL_DEF_50','BUFF_ATK_25','BUFF_PS_30','SWAP_WITH_DEFENSE','DOUBLE_ATTACK'));
```

## 2. Tabela de histórico de duelos

```sql
CREATE TABLE IF NOT EXISTS public.tcg_duel_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  winner text NOT NULL,
  loser text NOT NULL,
  turns integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.tcg_duel_matches TO authenticated;
GRANT ALL ON public.tcg_duel_matches TO service_role;

ALTER TABLE public.tcg_duel_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "duel matches self read" ON public.tcg_duel_matches
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "duel matches self insert" ON public.tcg_duel_matches
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
```
