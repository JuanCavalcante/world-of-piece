# Modo PvP (JxJ) no WOP TCG — plano técnico

Nenhum arquivo foi alterado. Este documento é apenas análise + plano.

## 1. Arquitetura atual encontrada

**Motor de duelo (puro, TypeScript):** `src/lib/tcg/duel.ts`
- Tipos `DuelState`, `Side`, `InPlayCard`, `AttackTarget`, `SideKey = "you" | "foe"`.
- Regras: `createDuel`, `startTurn`, `playCard`, `applyEffect`, `canAttack`, `isValidTarget`, `hasGuard`, `attackWith`, `endTurn`, `surrender`, `draw`, `pushLog`.
- Constantes: `START_HP = 30`, `FIELD_SLOTS = 7`, `MAX_AP = 10`, mão inicial 4, compra 2/turno, ataques só a partir de `turnCount > 2`.
- IA isolada em uma única função: `runAiTurn(s)` (joga cartas caras, escolhe alvo, encerra turno).
- O log fica dentro do próprio estado (`state.log`), não persistido.

**Tela de duelo:** `src/routes/tcggame.duels.tsx` (804 linhas)
- Estado da partida vive só no React: `useState<DuelState|null>`, mutação via `apply(fn)` com `structuredClone`.
- Baralho: `listMyDecks(user.id)` + `listCards("ACTIVE")` → `buildDeckCards()` expande quantidades → `createDuel(pool, "Você", deckCards)`. O adversário (IA) recebe um deck aleatório do pool global.
- Turno da IA: `useEffect` observando `game.turn === "foe"` com `setTimeout(1000)`.
- Áudio/FX: `useBattleMusic`, `audioManager`, `state.fx`.
- Fim de partida: `useEffect` em `game.over` → `finishMatch()` (uma vez, guardado por `savedRef`), depois `progression.daily(...)`, `progression.sync()` e invalidação de queries.
- Abandono: `beforeunload` + cleanup registram derrota via `finishMatch({winnerId: null, loserId: me})`.

**Recompensas:** `src/lib/tcg/rank.ts` → RPC `tcg_finish_match(_winner_id, _loser_id, _turns, _winner_name, _loser_name)` (migração `0040_tcg_vr_ranking.md`). Já aceita **dois** user_ids reais — ou seja, já suporta PvP sem alteração de assinatura. Retorna `DuelReward[]` por jogador (xp, vr_delta, vr, streaks). Gatilhos de conquistas (`WIN_STREAK_*`, `VR_*`) são disparados dentro dela.

**Outros:** histórico `tcg_duel_matches`, `ensureTcgPlayer`, conquistas `src/lib/tcg/achievements.ts`, modal `src/components/tcg/duel-result-dialog.tsx`.

## 2. Limitações para JxJ

1. Estado 100% no navegador → nenhuma autoridade servidora, tudo manipulável via DevTools.
2. `SideKey` é `"you" | "foe"` — perspectiva fixa do jogador local. Para PvP é preciso mapear "quem sou eu" no estado.
3. `createDuel` cria os dois lados de uma vez, com o lado inimigo montado a partir do pool global (não do baralho do adversário real).
4. `runAiTurn` é acionado por efeito de turno — em PvP esse efeito precisa ficar desligado.
5. Refresh perde a partida; abandono é registrado unilateralmente pelo cliente.
6. Nada é persistido durante a partida; não há Realtime no fluxo de duelo hoje.
7. `state.log`, `fx` e as mãos estão todos no mesmo objeto — enviar o estado inteiro ao oponente vazaria a mão dele.

## 3. Arquitetura proposta

**Autoridade = servidor, motor = o mesmo `duel.ts`.**

Reescrever as regras em PL/pgSQL duplicaria ~400 linhas de lógica já testada e criaria duas fontes de verdade. Em vez disso:

```
DUEL ENGINE (src/lib/tcg/duel.ts)  ← intocado, puro
├── JxIA: roda no navegador (como hoje)
└── JxJ : roda em TanStack server functions (Cloudflare Worker),
          estado persistido em Postgres (JSONB), lock por linha
```

- Matchmaking e criação de partida: **RPC PL/pgSQL atômica** (é onde as race conditions realmente vivem).
- Aplicação de ações: **server function** `submitPvpAction` que, com `supabaseAdmin`, faz `SELECT ... FOR UPDATE` na partida, desserializa o `DuelState`, valida (jogador pertence à partida, é o turno dele, carta é dele, ação legal via as mesmas funções `canPlay`/`canAttack`/`isValidTarget`), aplica, grava e registra a ação no log.
- O cliente **nunca** envia dano, PA ou estado — só `{matchId, type, payload}`.
- Cada jogador lê o estado por um RPC que **redige** (redact) o lado do oponente: mão vira apenas contagem, deck vira apenas contagem.
- Realtime: os clientes assinam `postgres_changes` em `tcg_pvp_matches` (filtro `id=eq.<match>`) e em `tcg_pvp_queue` (filtro `user_id=eq.<me>`); ao receber o evento, refazem o `fetch` do estado redigido (o payload do Realtime não carrega o JSONB completo por RLS de coluna — ver seção 8).

## 4. Fluxo de matchmaking

1. `/tcggame/duels` ganha dois botões: **Duelo JxIA** (fluxo atual, inalterado) e **Duelo JxJ**.
2. JxJ → escolhe baralho → `tcg_pvp_join_queue(_deck_id)`:
   - valida sessão, baralho existente/válido, ausência de partida ativa, ausência de fila ativa;
   - insere/atualiza a linha do jogador na fila com status `SEARCHING`;
   - **na mesma transação** tenta parear: `SELECT ... FROM tcg_pvp_queue WHERE status='SEARCHING' AND user_id <> auth.uid() ORDER BY random() LIMIT 1 FOR UPDATE SKIP LOCKED`;
   - se achar: cria a partida em `tcg_pvp_matches` (status `PREPARING`), marca ambos como `MATCHED` com `match_id`, retorna o match.
   - `SKIP LOCKED` + `FOR UPDATE` resolve corrida e pareamento duplo; um índice único parcial garante uma única fila ativa por jogador.
3. Se ninguém disponível → tela "⚔️ BUSCANDO OPONENTE / [CANCELAR]", Realtime na própria linha da fila.
4. Quando o outro jogador parear, a linha do primeiro muda para `MATCHED` → evento Realtime → tela "OPONENTE ENCONTRADO! Preparando duelo..." → navega para a partida.
5. Cancelar: `tcg_pvp_leave_queue()` — `DELETE ... WHERE user_id=auth.uid() AND status='SEARCHING'`; se já estiver `MATCHED`, retorna `already_matched` e o cliente entra na partida (matchmaking tem prioridade).
6. Fila abandonada: linhas `SEARCHING` com `updated_at` antigo (> 60s sem heartbeat) são ignoradas no pareamento e limpas de forma preguiçosa a cada `join`.

## 5. Fluxo da partida JxJ

1. Criação (`PREPARING`): a server function `startPvpMatch` monta o `DuelState` inicial com `createDuel`, usando os **dois baralhos reais** (via `p1_deck_id` / `p2_deck_id`), sorteia quem começa, grava o JSONB e passa para `ACTIVE`.
2. `state.you` = jogador `p1`, `state.foe` = `p2` no armazenamento; o RPC de leitura **inverte a perspectiva** para `p2`, de forma que o front continue usando "you/foe" sem alteração de componentes.
3. Ações do jogador da vez: `PLAY_CARD`, `ATTACK`, `END_TURN`, `SURRENDER`. Cada uma valida e chama a função correspondente de `duel.ts`.
4. Fim: quando `state.over`, a server function chama a RPC existente `tcg_finish_match(winner_id, loser_id, turns, ...)` **uma única vez**, protegida por `status = 'FINISHED'` + `rewarded_at IS NOT NULL` na mesma transação. Ambos os jogadores recebem seu `DuelReward` e veem o `DuelResultDialog` já existente.
5. Timeout de turno (opcional, recomendado): 90s por turno; se estourar, o próximo `submit`/poll aplica `END_TURN` automático.

## 6. Desconexão e reconexão

- Heartbeat: o cliente chama `tcg_pvp_ping(match_id)` a cada 10s → atualiza `p1_seen_at`/`p2_seen_at`.
- Tolerância de **30 segundos**. Antes disso, nada acontece; o oponente vê "Adversário reconectando...".
- Passado o prazo, qualquer chamada de `tcg_pvp_ping`/ação do oponente detecta o abandono e finaliza a partida declarando o presente como vencedor, com recompensas normais (mesmo caminho da seção 5.4).
- Refresh: ao entrar em `/tcggame/duels`, um `getActivePvpMatch()` verifica partida `ACTIVE` do usuário → retoma direto para o tabuleiro, reassinando o Realtime. Nunca cria partida nova.
- Sair da fila ao fechar a página: `navigator.sendBeacon` não serve para RPC autenticado; usamos o timeout de heartbeat da fila (60s) como garantia.

## 7. Tabelas necessárias

- `tcg_pvp_queue` — fila (`user_id` PK, `deck_id`, `status`, `match_id`, `created_at`, `updated_at`).
- `tcg_pvp_matches` — partida (`id`, `p1_id`, `p2_id`, `p1_deck_id`, `p2_deck_id`, `status`, `state jsonb`, `turn_user_id`, `winner_id`, `turn_count`, `p1_seen_at`, `p2_seen_at`, `rewarded_at`, timestamps).
- `tcg_pvp_match_actions` — log de auditoria (`id`, `match_id`, `player_id`, `action_type`, `action_data jsonb`, `turn_number`, `created_at`). Sem replay agora, só base para o futuro.

Reaproveitados sem alteração: `tcg_players`, `tcg_player_stats`, `tcg_duel_matches`, `tcg_decks`, `tcg_finish_match`, conquistas.

## 8. Segurança

- RLS em todas as tabelas novas: `SELECT` apenas se `auth.uid() IN (p1_id, p2_id)`; **nenhum** `INSERT/UPDATE/DELETE` direto para `authenticated` — só via RPC `SECURITY DEFINER` e server functions com service role.
- A coluna `state` (JSONB com as duas mãos) **nunca** é lida diretamente pelo cliente: o `SELECT` do cliente usa uma view/RPC `tcg_pvp_match_view` que devolve o estado redigido (mão e deck do oponente como contagem). O `postgres_changes` é assinado numa tabela-espelho leve (`tcg_pvp_matches` sem `state`, ou usando `REPLICA IDENTITY` + coluna `version`), servindo apenas de sinal para refetch — o payload em si não contém informação oculta.
- Toda validação (dono da carta, turno, PA, alvo, carta viva) roda no servidor; o cliente só nomeia `card_uid` e alvo.
- Double submit: cada ação envia `expected_version`; a server function rejeita se a versão do estado não bater (optimistic concurrency) — resolve replay de requisição e clique duplo.
- Recompensa única garantida por `rewarded_at` + `UPDATE ... WHERE rewarded_at IS NULL RETURNING`.

## 9. SQL necessário no Supabase

Será entregue em **`docs/migrations/0041_tcg_pvp_matchmaking.md`**, com aviso "Execute este SQL no SQL Editor do Supabase", contendo em ordem:

1. `CREATE TABLE tcg_pvp_matches` + GRANTs + RLS + policies + índices.
2. `CREATE TABLE tcg_pvp_queue` + GRANTs + RLS + policies + índice único parcial de fila ativa.
3. `CREATE TABLE tcg_pvp_match_actions` + GRANTs + RLS (somente leitura dos participantes).
4. RPCs `SECURITY DEFINER`: `tcg_pvp_join_queue`, `tcg_pvp_leave_queue`, `tcg_pvp_queue_status`, `tcg_pvp_active_match`, `tcg_pvp_match_view`, `tcg_pvp_ping`.
5. `ALTER PUBLICATION supabase_realtime ADD TABLE tcg_pvp_matches, tcg_pvp_queue;`
6. Bloco de testes (SQL manual: dois usuários entram, pareiam, cancelam) e bloco de rollback (`DROP FUNCTION ... / DROP TABLE ... CASCADE`), que não toca em nada pré-existente.

Nenhuma tabela/função existente é alterada; `tcg_finish_match` é reutilizada como está.

## 10. Frontend

**Novos**
- `src/lib/tcg/pvp.ts` — tipos + wrappers das RPCs e das server functions.
- `src/lib/tcg/pvp.functions.ts` — server functions autoritativas (`startPvpMatch`, `submitPvpAction`, `resolvePvpTimeout`).
- `src/lib/tcg/pvp-engine.server.ts` — carga/serialização do `DuelState`, validações, redação de dados ocultos.
- `src/hooks/use-pvp-match.ts` — assinatura Realtime, refetch, heartbeat, reconexão.
- `src/components/tcg/matchmaking-dialog.tsx` — "Buscando oponente" / "Oponente encontrado".

**Alterados**
- `src/routes/tcggame.duels.tsx` — seleção de modo (JxIA / JxJ), retomada de partida ativa, e o tabuleiro passa a receber ações por callback (no modo IA continua chamando `apply(...)` local; no PvP chama `submitPvpAction`).
- Extrair o tabuleiro atual para `src/components/tcg/duel-board.tsx` (movimento puro de JSX, sem mudança de regra) para os dois modos compartilharem a mesma UI.

**Intocados:** `src/lib/tcg/duel.ts` (incluindo `runAiTurn`), `rank.ts`, `duel-result-dialog.tsx`, conquistas.

## 11. Preservação do JxIA

- `duel.ts` não muda. O efeito da IA fica condicionado a `mode === "AI"`.
- Nenhuma chamada nova de rede no caminho JxIA; `finishMatch` continua igual.
- Checklist de regressão do JxIA no fim da implementação (iniciar, jogar, atacar, guarda, render-se, abandonar por refresh, recompensa).

## 12. Testes

Matriz cobrindo: entrar na fila; cancelar; 2/3/4 jogadores; pareamento aleatório; entrada dupla do mesmo jogador; jogador já em partida; cancelamentos simultâneos; fechar página na fila; fechar página em duelo; reconexão; ação fora do turno; carta de outro jogador; tentativa de forjar PA/dano; dois submits simultâneos (teste de versão); fim de partida; recompensa aplicada uma única vez; conquistas processadas; JxIA intacto. Testes de corrida via script Playwright/Node com duas sessões paralelas; testes de RPC via SQL manual documentado na migração.

## 13. Riscos

- Latência do Worker por ação (~100–300ms) — mitigada com atualização otimista visual apenas de seleção, nunca de estado de jogo.
- Realtime pode perder eventos → heartbeat de 10s também funciona como poll de segurança.
- Serialização do `DuelState` precisa ser estável; qualquer mudança futura em `duel.ts` exige `state_version` no JSONB (já incluído no schema).
- Abandono simultâneo dos dois jogadores → partida expira e é finalizada como derrota dupla sem VR (tratada explicitamente).

## 14. Ordem de implementação

1. Migração SQL 0041 (você executa no Supabase).
2. `pvp.ts` + RPC wrappers + fila e tela de busca/cancelar (sem partida ainda).
3. Extração do `duel-board.tsx` + seletor de modo (JxIA validado intacto).
4. Motor autoritativo (`pvp-engine.server.ts` + server functions) e partida jogável.
5. Realtime, heartbeat, reconexão e refresh.
6. Finalização, recompensas via `tcg_finish_match`, conquistas, modal de resultado.
7. Bateria de testes e checklist de regressão do JxIA.
