# Effect Engine v2 — checklist de migração e deploy

Ordem recomendada. Nada aqui é destrutivo; o motor só age em cartas que tenham
linhas em `card_effects` (ativação gradual).

## 1. Banco (janela sem partidas JxJ ativas)

1. Rodar `docs/migrations/0062_tcg_effect_engine_catalog.md` (tabelas `effects`,
   `card_effects`, `status_effects`, coluna `cards.family`, grants/RLS e seeds).
2. Rodar `docs/migrations/0063_tcg_effects_catalog_tuning.md` (ajustes de alvos e
   parâmetros do catálogo).
3. Conferir:
   ```sql
   select count(*) from public.effects;        -- 23
   select count(*) from public.status_effects; -- 10
   ```

## 2. Deploy do app

Deploy normal na Vercel. O código já está preparado:

- `ENGINE_STATE_VERSION = 2` com `normalizeState()` migrando estados v1 em curso.
- PvP carrega as habilidades pelo servidor (`pvp-engine.server.ts`) e as congela
  no estado da partida; o cliente nunca envia ATK/HP/status.
- Ação autoritativa `RESOLVE_CHOICE` para efeitos com alvo escolhido.

## 3. Cadastro dos efeitos

Seguir `docs/tcg-effects-45-mapping.md` no admin, carta por carta (até 3 slots).
Sugestão: começar por 3–5 cartas de teste e duelar JxIA antes de liberar o resto.

## 4. Liberar os efeitos no beta

Hoje `toInPlay()` força `effect_code = "NONE"` (efeitos legados desligados). As
habilidades novas (`card_effects`) **não** passam por essa trava — cadastrar um
efeito no admin já o ativa em partida. Remover a trava legada só quando o texto
dos efeitos voltar a ser exibido aos jogadores.

## 5. Smoke test

- JxIA: jogar uma carta com efeito de dano, uma com aura e uma com status.
- JxJ: iniciar partida entre duas contas, validar sincronia e escolha de alvo.
- Fim de partida: card de recompensa (XP/VR) em ambos os modos.

## 6. Rollback

- Desativar um efeito problemático: `update public.effects set active=false where effect_key='X';`
  (o admin deixa de oferecê-lo) e remover as linhas correspondentes em `card_effects`.
- Rollback total das habilidades: `delete from public.card_effects;` — o jogo volta
  ao comportamento atual sem redeploy. As tabelas e o `effect_code` legado permanecem.
