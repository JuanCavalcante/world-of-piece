# 0027 — Perfil do jogador no TCG (username + avatar)

Adiciona `username` e `avatar_url` na tabela `public.tcg_players`.
A policy "tcg_players self all" (migração 0014) já permite o jogador atualizar a própria linha.

```sql
alter table public.tcg_players
  add column if not exists username text,
  add column if not exists avatar_url text;

-- Preenche o username inicial com a parte local do e-mail, quando vazio
update public.tcg_players p
set username = split_part(u.email, '@', 1)
from auth.users u
where u.id = p.user_id
  and (p.username is null or p.username = '');
```
