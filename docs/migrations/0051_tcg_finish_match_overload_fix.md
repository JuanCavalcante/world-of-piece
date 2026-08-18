# 0051 — Corrige ambiguidade de `tcg_finish_match`

## Problema

Ao fim de um duelo JxIA aparecia "Não foi possível salvar o resultado.".

Existem duas versões da função no banco:

- `tcg_finish_match(uuid, uuid, integer, text, text, boolean)` (migração 0043)
- `tcg_finish_match(uuid, uuid, integer, text, text, boolean, boolean)` (migrações 0048/0050)

Como o cliente chama com 6 argumentos nomeados, o PostgREST não consegue
escolher entre as duas assinaturas e devolve o erro `PGRST203`
(*Could not choose the best candidate function*).

## Solução

Remover a assinatura antiga de 6 argumentos. A de 7 argumentos cobre o mesmo
uso (`_early_surrender` tem default `false`).

```sql
drop function if exists public.tcg_finish_match(uuid, uuid, integer, text, text, boolean);

-- garante a permissão na assinatura correta
grant execute on function public.tcg_finish_match(uuid, uuid, integer, text, text, boolean, boolean) to authenticated;
```

## Verificação

```sql
select p.oid::regprocedure
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'tcg_finish_match';
-- deve retornar apenas 1 linha (7 parâmetros)
```
