# Migração 0023 — Custo da carta (0 a 10)

Execute no **SQL Editor** do Supabase.

```sql
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS cost integer NOT NULL DEFAULT 0;
ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_cost_range;
ALTER TABLE public.cards ADD CONSTRAINT cards_cost_range CHECK (cost >= 0 AND cost <= 10);
```