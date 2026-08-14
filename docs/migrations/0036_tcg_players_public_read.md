# 0036 — Nomes de jogadores visíveis no Mercado

Sem esta migração a aba **Mercado** fica vazia: a consulta tentava juntar
`tcg_players` (que só o próprio jogador podia ler) e falhava.

Execute no **SQL Editor** do Supabase (New query → colar → Run).

```sql
-- Permite que qualquer usuário autenticado leia o perfil público do TCG
-- (username, avatar, level, wins/losses). Não expõe e-mail nem dados sensíveis.
DROP POLICY IF EXISTS "tcg_players public read" ON public.tcg_players;
CREATE POLICY "tcg_players public read"
  ON public.tcg_players FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON public.tcg_players TO authenticated;

NOTIFY pgrst, 'reload schema';
```

> Depois de rodar, recarregue o app: os anúncios de outros jogadores aparecem no Mercado.
