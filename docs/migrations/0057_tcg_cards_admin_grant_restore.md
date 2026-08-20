# Migração 0057 — Restaurar escrita de cartas para admins

O hotfix 0056 revogou `INSERT/UPDATE/DELETE` de `authenticated` em
`public.cards`, o que quebrou o painel `/admin/woptcg/cartas`
("permission denied for table cards").

A segurança continua garantida pelas políticas RLS, que só permitem escrita
quando `public.has_role(auth.uid(), 'admin')` é verdadeiro. Basta devolver os
GRANTs para a Data API conseguir chegar na tabela.

Execute no **SQL Editor** do Supabase.

```sql
-- 1. Data API: leitura pública, escrita autenticada (filtrada por RLS)
GRANT SELECT ON public.cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT ALL ON public.cards TO service_role;

-- 2. Garantir RLS ativo e políticas de admin (idempotente)
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cards_select_all" ON public.cards;
CREATE POLICY "cards_select_all" ON public.cards FOR SELECT USING (true);

DROP POLICY IF EXISTS "cards_admin_insert" ON public.cards;
CREATE POLICY "cards_admin_insert" ON public.cards FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "cards_admin_update" ON public.cards;
CREATE POLICY "cards_admin_update" ON public.cards FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "cards_admin_delete" ON public.cards;
CREATE POLICY "cards_admin_delete" ON public.cards FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

NOTIFY pgrst, 'reload schema';
```

## Observação

Se outras telas de admin apresentarem o mesmo erro em outras tabelas
(`tcg_banners`, `items`, etc.), aplique o mesmo padrão: GRANT para
`authenticated` + política RLS exigindo `has_role(auth.uid(), 'admin')`.
