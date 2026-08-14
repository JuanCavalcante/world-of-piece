# 0010 — EDL, Akuma no Mi e Misceâneas

Adiciona três colunas JSONB na ficha do personagem para guardar o Estilo de Luta, Akuma no Mi e Misceâneas (com movimentos ilimitados).

```sql
alter table public.characters
  add column if not exists edl_data jsonb not null default '{}'::jsonb,
  add column if not exists akuma_data jsonb not null default '{}'::jsonb,
  add column if not exists misc_data jsonb not null default '{}'::jsonb;
```

Formato esperado de cada coluna:

```json
{
  "image_url": "https://...",
  "name": "Nome",
  "tier": "TIER_I",
  "extra_points": "0",
  "current_user": "Nome do personagem",
  "description": "Texto",
  "moves": [
    { "id": "uuid", "image_url": "https://...", "name": "Golpe", "type": "Físico", "tier": "TIER_I", "cost": "10 SP" }
  ]
}
```
