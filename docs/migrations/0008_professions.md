# 0008 — Professions (Tier / XP / Specialization / Domain)

Adiciona campos para o sistema de profissões nos slots 1 e 2 do personagem.

```sql
alter table public.characters
  add column if not exists profession_1_tier text,
  add column if not exists profession_1_xp_current integer not null default 0,
  add column if not exists profession_1_xp_max integer not null default 0,
  add column if not exists profession_1_specialization text,
  add column if not exists profession_1_domain text,
  add column if not exists profession_2_tier text,
  add column if not exists profession_2_xp_current integer not null default 0,
  add column if not exists profession_2_xp_max integer not null default 0,
  add column if not exists profession_2_specialization text,
  add column if not exists profession_2_domain text;
```

Valores esperados para `tier`: `INICIAL`, `TIER_I`, `TIER_II`, `TIER_III`, `TIER_IV`, `TIER_V`, `TIER_VI`, `TIER_VII`, `TIER_VIII`, `TIER_IX`, `TIER_X`, `TIER_XX`.
