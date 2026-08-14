# 0038 — Efeito "Guarda" nas cartas

Execute no **SQL Editor** do Supabase.

```sql
ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_effect_code_valid;
ALTER TABLE public.cards ADD CONSTRAINT cards_effect_code_valid
  CHECK (effect_code IN ('NONE','DRAW_1','GAIN_1_AP','HEAL_DEF_50','BUFF_ATK_25','BUFF_PS_30','SWAP_WITH_DEFENSE','DOUBLE_ATTACK','GUARD'));
```
