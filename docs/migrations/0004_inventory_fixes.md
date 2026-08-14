# Migração — Fase 5.1 (Fixes: quantidade zero + tiers renomeados)

Execute no **SQL Editor** do Supabase.

```sql
-- 1) Permitir quantity = 0 (usado quando o item é totalmente ativado)
alter table public.player_inventory
  drop constraint if exists player_inventory_quantity_check;

alter table public.player_inventory
  add constraint player_inventory_quantity_check check (quantity >= 0);

-- 2) Renomear valores do enum item_tier para o padrão Tier I..X, XX
alter type public.item_tier rename value 'COMUM'    to 'TIER_I';
alter type public.item_tier rename value 'INCOMUM'  to 'TIER_II';
alter type public.item_tier rename value 'RARO'     to 'TIER_III';
alter type public.item_tier rename value 'EPICO'    to 'TIER_IV';
alter type public.item_tier rename value 'LENDARIO' to 'TIER_V';
alter type public.item_tier rename value 'MITICO'   to 'TIER_VI';

-- Adiciona os tiers restantes
alter type public.item_tier add value if not exists 'TIER_VII';
alter type public.item_tier add value if not exists 'TIER_VIII';
alter type public.item_tier add value if not exists 'TIER_IX';
alter type public.item_tier add value if not exists 'TIER_X';
alter type public.item_tier add value if not exists 'TIER_XX';

-- Atualiza o default da coluna para o novo valor base
alter table public.inventory_items
  alter column tier set default 'TIER_I';
```
