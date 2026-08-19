# Migração 0055 — Corrigir "Falha ao salvar a carta" no painel de cartas

O painel agora mostra a mensagem real do banco no toast. As duas causas comuns
são: coluna ausente na tabela `public.cards` ou falta de política/GRANT de
INSERT/UPDATE para administradores.

Execute no **SQL Editor** do Supabase.

```sql
-- 1. Garantir que todas as colunas usadas pelo painel existem
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS atk          int      NOT NULL DEFAULT 10;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS power        int      NOT NULL DEFAULT 0;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS cost         int      NOT NULL DEFAULT 0;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS effect_code  text     NOT NULL DEFAULT 'NONE';
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS effect       text;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS image_url    text;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS type         text;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS organization text;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS race         text;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS status       text     NOT NULL DEFAULT 'WAITING';

-- 2. Data API: leitura pública, escrita autenticada (restrita por RLS abaixo)
GRANT SELECT ON public.cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT ALL ON public.cards TO service_role;

-- 3. RLS: apenas admin escreve
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

Se o toast continuar falhando, ele agora exibe `message — details — hint` do
Postgres: use essa mensagem para identificar a coluna/política exata.
