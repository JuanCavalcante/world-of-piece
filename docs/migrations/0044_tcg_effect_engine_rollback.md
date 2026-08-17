# 0044 — Rollback da fundação do sistema de efeitos

Execute no **SQL Editor** do Supabase apenas se precisar desfazer a migração
`0044_tcg_effect_engine.md`. Não afeta `effect_code`, coleções, baralhos,
partidas, ranking nem o subsistema `tcg_pvp_*`.

```sql
DROP TRIGGER IF EXISTS card_abilities_touch ON public.card_abilities;
DROP FUNCTION IF EXISTS public.touch_card_abilities();
DROP TABLE IF EXISTS public.card_abilities;
DROP TABLE IF EXISTS public.card_tokens;
DROP TABLE IF EXISTS public.effect_definitions;

ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_gender_valid;
ALTER TABLE public.cards DROP COLUMN IF EXISTS race;
ALTER TABLE public.cards DROP COLUMN IF EXISTS affiliation;
ALTER TABLE public.cards DROP COLUMN IF EXISTS crew;
ALTER TABLE public.cards DROP COLUMN IF EXISTS card_type;
ALTER TABLE public.cards DROP COLUMN IF EXISTS gender;
ALTER TABLE public.cards DROP COLUMN IF EXISTS abilities_migrated;
```
