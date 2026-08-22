# 0061 — Loja do TCG: endurecimento de GRANTs

**Status: JÁ EXECUTADO** pelo agente via Management API em 2026-08-22 (registrado aqui
para manter o histórico de migrations completo).

## Contexto

A 0060 só usava `GRANT` — que **adiciona** privilégios, sem remover os defaults do
Supabase. Ao criar tabelas no schema `public`, os default privileges concedem ALL a
`anon`/`authenticated`/`service_role`. Resultado observado no banco: `anon` tinha ALL
nas duas tabelas e `authenticated` tinha INSERT/UPDATE/DELETE em `tcg_shop_purchases`
e TRIGGER/TRUNCATE em ambas.

A RLS já bloqueava qualquer abuso (não há policies de escrita para não-admin), mas o
plano da Loja exige defense-in-depth: grants mínimos + RLS.

## O que foi executado

```sql
set lock_timeout = '5s';

-- Produtos: jogadores leem; escrita fica protegida pela policy de admin
revoke all on public.tcg_shop_products from anon;
revoke trigger, truncate, references on public.tcg_shop_products from authenticated;

-- Histórico: jogador SÓ lê as próprias compras; insert acontece só dentro da RPC definer
revoke all on public.tcg_shop_purchases from anon;
revoke insert, update, delete, trigger, truncate, references on public.tcg_shop_purchases from authenticated;
```

## Estado final validado no banco

| tabela | authenticated | anon | service_role |
|---|---|---|---|
| tcg_shop_products | SELECT, INSERT, UPDATE, DELETE (escrita barrada pela RLS admin) | — | ALL |
| tcg_shop_purchases | SELECT (somente próprias linhas, via RLS) | — | ALL |

Validação funcional: `select public.tcg_purchase_shop_product(null)` responde
`Usuário não autenticado.` — guarda de auth da RPC OK.

## Observação

O produto seed "Pack Básico" está com `price_essence = 2000` (ajuste manual do admin,
diferente dos 100 do passo 7 da 0060). Mantido como está.
