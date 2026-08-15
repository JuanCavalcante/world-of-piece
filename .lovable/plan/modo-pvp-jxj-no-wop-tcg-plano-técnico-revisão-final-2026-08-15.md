# Modo PvP (JxJ) no WOP TCG — plano técnico (revisão final)

Nenhum arquivo foi alterado. Este documento é apenas análise + plano.

## 1. Arquitetura atual encontrada

**Motor de duelo (puro, TypeScript):** `src/lib/tcg/duel.ts`
- Tipos `DuelState`, `Side`, `InPlayCard`, `AttackTarget`, `SideKey = "you" | "foe"`.
- Regras: `createDuel`, `startTurn`, `playCard`, `applyEffect`, `canPlay`, `canAttack`, `isValidTarget`, `hasGuard`, `attackWith`, `endTurn`, `surrender`, `draw`, `pushLog`.
- Constantes: `START_HP = 30`, `FIELD_SLOTS = 7`, `MAX_AP = 10`, mão inicial 4, compra 2/turno, ataques só a partir de `turnCount > 2`.
- IA isolada em uma única função: `runAiTurn(s)`.
- Log dentro do próprio estado (`state.log`), não persistido.

**Tela de duelo:** `src/routes/tcggame.duels.tsx`
- Estado só no React (`useState<DuelState|null>`, mutação via `structuredClone`).
- Baralho: `listMyDecks` + `listCards("ACTIVE")` → `buildDeckCards()` → `createDuel(pool, "Você", deckCards)`; a IA recebe deck aleatório do pool global.
- Turno da IA: `useEffect` sobre `game.turn === "foe"` com `setTimeout(1000)`.
- Fim de partida: `useEffect` em `game.over` → `finishMatch()` (guardado por `savedRef`) → missões diárias, `progression.sync()`, invalidação de queries.
- Abandono: `beforeunload` registra derrota.

**Recompensas:** `src/lib/tcg/rank.ts` → RPC `tcg_finish_match(_winner_id, _loser_id, _turns, _winner_name, _loser_name)` (migração 0040). Já aceita dois `user_id` reais — serve PvP sem mudança de assinatura. Retorna `DuelReward[]`, dispara conquistas (`WIN_STREAK_*`, `VR_*`).

## 2. Limitações para JxJ

1. Estado 100% no navegador → sem autoridade servidora.
2. `SideKey` é `"you" | "foe"` (perspectiva local).
3. `createDuel` monta os dois lados; o inimigo vem do pool global, não de um baralho real.
4. `runAiTurn` disparado por efeito de turno — precisa ficar desligado em PvP.
5. Refresh perde a partida; abandono é decidido pelo cliente.
6. Nada persistido durante a partida; Realtime não é usado no duelo hoje.
7. Mãos dos dois lados vivem no mesmo objeto — enviar o estado inteiro vazaria a mão do oponente.

## 3. Confirmação de compatibilidade do Duel Engine (item 1 da revisão)

Auditoria de `src/lib/tcg/duel.ts`:

| Dependência | Situação |
| --- | --- |
| `window`, `document`, `localStorage`, `navigator` | **Nenhuma ocorrência.** |
| React / hooks | Nenhuma. |
| Áudio (`audioManager`) | Nenhuma — o áudio vive só na rota. |
| Supabase client | Nenhuma em runtime. |
| Imports | Apenas `import type { TcgCard } from "@/lib/tcg/api"` — import **type-only**, apagado na compilação; não arrasta o client Supabase. |
| `Math.random()` | Usado em `uid()`, `shuffle()` e `runAiTurn` — sempre **dentro de funções**, nunca em escopo de módulo. Seguro no Worker (a proibição do Cloudflare vale só para escopo global). |
| `Date.now()` | Usado em `state.fx` — disponível no Worker. |
| `structuredClone` | Usado na rota, não no motor; existe no Worker de qualquer forma. |

**Conclusão: o motor é puro e roda no Worker como está.** Duas refatorações mínimas, sem tocar em regra alguma:

1. **Contadores de módulo** (`uidSeq`, `logSeq`): em servidor stateless eles reiniciam a cada requisição, o que quebraria a unicidade de `log.id` entre ações. Refatoração mínima: passar a derivar as sequências do próprio estado (`state.seq.uid`, `state.seq.log`), inicializadas em `createDuel` e persistidas no JSONB. `uid()` mantém o sufixo aleatório. Nenhuma regra muda.
2. **Import type-only**: mover `TcgCard` (ou um subtipo `EngineCard`) para `src/lib/tcg/types.ts`, eliminando qualquer aresta do motor para `api.ts`. Puramente organizacional, protege contra alguém trocar `import type` por `import` no futuro.

Ambas são pré-requisito da etapa 4 da implementação e serão validadas com o JxIA antes de seguir.

## 4. Arquitetura proposta

```
DUEL ENGINE (src/lib/tcg/duel.ts)  ← regras intocadas
├── JxIA: roda no navegador (como hoje)
└── JxJ : roda em TanStack server functions (Cloudflare Worker),
          estado persistido em Postgres (JSONB) sob lock de linha
```

- Reescrever as regras em PL/pgSQL duplicaria ~400 linhas já testadas e criaria duas fontes de verdade — descartado.
- Matchmaking e criação de partida: **RPC PL/pgSQL atômica** (é onde vivem as corridas reais).
- Ações: server function `submitPvpAction` que, com `supabaseAdmin`, executa a RPC `tcg_pvp_lock_match` (`SELECT ... FOR UPDATE`), desserializa o `DuelState`, valida com as próprias funções do motor, aplica, grava estado + versão e insere o log da ação.
- Leitura: RPC `tcg_pvp_match_view` devolve estado **redigido**.
- Realtime: apenas sinal de mudança (ver seção 10).

## 5. Estado da partida e versionamento (item 2)

`tcg_pvp_matches.state jsonb` guarda o `DuelState` serializado, acrescido de:

```jsonc
{
  "state_version": 1,      // versão do FORMATO do estado (schema do motor)
  "seq": { "uid": 42, "log": 87 },
  "you": { ... }, "foe": { ... }, "turn": "you", "turnCount": 5, ...
}
```

Além disso a **linha** tem `version integer NOT NULL DEFAULT 0` (contador de revisão, incrementado a cada ação) — usado para concorrência otimista e como gatilho de refetch. São duas coisas distintas: `state_version` = formato; `version` = revisão.

Regras de compatibilidade:
- `ENGINE_STATE_VERSION` fica em `duel.ts` como constante exportada.
- Ao carregar uma partida, se `state.state_version !== ENGINE_STATE_VERSION`: para o MVP a partida é **encerrada como CANCELLED** (sem recompensa) e ambos voltam ao lobby, com aviso. Nada de migração silenciosa em partida em andamento.
- Quando futuras mudanças de regra forem retrocompatíveis, incrementa-se a versão e adiciona-se um `migrateState(state)` puro em `duel.ts`, aplicado no carregamento antes da validação.
- Partidas finalizadas mantêm o estado histórico como está; nada é reprocessado.

## 6. Dados privados (item 3)

A ocultação é **servidora**, nunca de frontend:
- O cliente **não tem `SELECT` na coluna `state`**. A policy de RLS de `tcg_pvp_matches` concede leitura apenas de colunas públicas por meio da RPC/view; para eliminar qualquer brecha, o acesso do cliente à tabela é feito exclusivamente pela RPC `tcg_pvp_match_view` (`SECURITY DEFINER`), e o `GRANT SELECT` direto na tabela é limitado às colunas não sensíveis (`id, p1_id, p2_id, status, turn_user_id, winner_id, turn_count, version, updated_at`) — `state` não é concedida a `authenticated`.
- O `match_view` devolve, para o oponente: `hand_count`, `deck_count`, HP, PA, campo (que é público por regra) e log. **Nunca** os objetos de carta da mão nem a ordem do deck.
- O próprio log é filtrado: entradas que revelem compra/descarte específicos do oponente viram texto genérico ("Adversário comprou 1 carta").
- Consequência: mesmo abrindo DevTools, Network ou o cache do React Query, não existe no cliente nenhuma informação oculta do adversário.

## 7. Deck congelado na fila (item 4)

- `tcg_pvp_queue.deck_id` guarda a escolha, e `tcg_pvp_join_queue` **materializa** o baralho no momento da entrada: a lista expandida de `card_id`s vai para `tcg_pvp_queue.deck_snapshot jsonb`.
- Ao parear, o snapshot é copiado para `tcg_pvp_matches.p1_deck_snapshot` / `p2_deck_snapshot`.
- Alterar/excluir o baralho enquanto espera não afeta a partida: o motor monta o duelo a partir do snapshot, não do baralho atual.
- O snapshot guarda só `card_id` + quantidade; os atributos (ATK/PS/custo/efeito) são lidos das cartas no momento de criar a partida, garantindo que ambos usem os mesmos valores vigentes.

## 8. Fluxo de matchmaking

1. `/tcggame/duels` ganha **Duelo JxIA** (inalterado) e **Duelo JxJ**.
2. JxJ → escolhe baralho → `tcg_pvp_join_queue(_deck_id)`:
   - valida sessão, baralho existente e válido, ausência de partida ativa, ausência de fila ativa;
   - grava o snapshot e insere a linha com status `SEARCHING`;
   - na mesma transação tenta parear: `SELECT ... WHERE status='SEARCHING' AND user_id <> auth.uid() AND updated_at > now() - interval '60 seconds' ORDER BY random() LIMIT 1 FOR UPDATE SKIP LOCKED`;
   - se achar, cria a partida (`PREPARING`), marca ambos como `MATCHED` com `match_id` e retorna.
3. Sem oponente → tela "⚔️ BUSCANDO OPONENTE / [CANCELAR]" com Realtime na própria linha da fila e heartbeat de 10s.
4. Ao ser pareado, a linha muda para `MATCHED` → evento → "OPONENTE ENCONTRADO! Preparando duelo..." → entra na partida.
5. `tcg_pvp_leave_queue()`: remove se `SEARCHING`; se já `MATCHED`, retorna `already_matched` e o cliente entra na partida (matchmaking tem prioridade).
6. Filas mortas (`updated_at` > 60s) são ignoradas no pareamento e apagadas preguiçosamente a cada `join`/`leave`.

## 9. Fluxo da partida, abandono e limpeza (itens 5 e 6)

Criação (`PREPARING`) → `startPvpMatch` monta o `DuelState` com `createDuel` a partir dos **dois snapshots**, sorteia quem começa, grava e passa para `ACTIVE`. O armazenamento fixa `you = p1`, `foe = p2`; a leitura **inverte a perspectiva** para `p2`, então os componentes continuam falando "you/foe".

Ações: `PLAY_CARD`, `ATTACK`, `END_TURN`, `SURRENDER`.

Presença: `tcg_pvp_ping(match_id)` a cada 10s atualiza `p1_seen_at`/`p2_seen_at`. Tolerância de **30 segundos**; antes disso o oponente vê "Adversário reconectando...". Timeout de turno de 90s aplica `END_TURN` automático.

Resolução de abandono (`tcg_pvp_resolve_stale`, idempotente):
- **Um ausente, um presente** → presente vence, ausente perde, `tcg_finish_match` roda normalmente (XP/VR/streak/conquistas).
- **Ambos ausentes além da tolerância** → `status = 'CANCELLED'`, `winner_id = NULL`, **nenhuma** recompensa, nenhuma vitória/derrota/streak, `rewarded_at` marcado para impedir processamento posterior. Não existe "derrota dupla".
- Rendição explícita continua sendo derrota normal de quem se rendeu.

Limpeza de partidas `ACTIVE` órfãs (nenhum cliente fazendo requisição):
1. **Lazy (MVP, sempre ativo):** toda chamada de `tcg_pvp_join_queue`, `tcg_pvp_active_match` e `tcg_pvp_ping` executa antes um `tcg_pvp_resolve_stale(_limit := 20)` que varre partidas `ACTIVE` com ambos os `seen_at` vencidos e as resolve conforme as regras acima. Como qualquer entrada no lobby aciona a varredura, órfãs somem no primeiro acesso de qualquer jogador.
2. **Teto absoluto:** partidas `ACTIVE` com `created_at` acima de 2 horas são canceladas incondicionalmente pela mesma função.
3. **Recomendado (opcional):** agendar `select public.tcg_pvp_resolve_stale(100)` a cada minuto via `pg_cron`, o que remove a dependência de tráfego. O SQL do cron vai comentado na migração, para você habilitar se `pg_cron` estiver disponível no seu projeto.

## 10. Recompensas — fonte única (item 7)

`tcg_finish_match` continua sendo **a única** função que altera XP, VR, wins, losses, streaks e dispara conquistas — tanto no JxIA quanto no JxJ. Nada de lógica de recompensa duplicada no PvP.

Execução única por partida garantida por três camadas:
1. `tcg_pvp_matches.rewarded_at timestamptz` — a finalização faz `UPDATE ... SET status='FINISHED', winner_id=..., rewarded_at=now() WHERE id=$1 AND rewarded_at IS NULL RETURNING id`; se não retornar linha, **não** chama `tcg_finish_match`.
2. Tudo dentro da mesma transação da RPC de finalização, com a linha já travada por `FOR UPDATE`.
3. `CHECK (status <> 'FINISHED' OR rewarded_at IS NOT NULL)` como rede de segurança de consistência.

## 11. Segurança (item 8)

| Ataque | Defesa |
| --- | --- |
| Alterar PA | PA só existe no JSONB servidor; o cliente não tem `UPDATE` na tabela nem `SELECT` em `state`. O payload da ação não carrega PA. |
| Alterar PS / dano manual | Dano é calculado por `attackWith` no servidor a partir do ATK persistido; o cliente envia apenas `card_uid` + alvo. |
| Jogar carta que não possui | A mão vive no estado servidor, montada do snapshot do baralho do próprio jogador; um `uid` inexistente na mão dele é rejeitado. |
| Jogar fora do turno | `turn_user_id` na linha + `state.turn`; ambos conferidos antes de qualquer aplicação. |
| Ataque duplicado | `attacker.attacked` e `attacker.ready` já existem no motor e são avaliados no servidor. |
| Submissão duplicada / replay | `expected_version` obrigatório no payload; `UPDATE ... WHERE version = $expected` — a segunda chamada falha com `stale_state` e o cliente refaz a leitura. |
| Ler estado privado do adversário | Coluna `state` sem `GRANT` para `authenticated`; leitura exclusivamente via `tcg_pvp_match_view` redigida. |
| Manipular `match_id` | Toda RPC valida `auth.uid() IN (p1_id, p2_id)`; caso contrário `not_a_participant`. |
| Manipular `player_id` | Nenhuma RPC aceita `player_id` como parâmetro — a identidade vem sempre de `auth.uid()`. |
| Escrita direta nas tabelas | Sem `INSERT/UPDATE/DELETE` para `authenticated`; tudo por RPC `SECURITY DEFINER` com `SET search_path = public`. |
| Corrida no pareamento | `FOR UPDATE SKIP LOCKED` + índice único parcial de fila ativa + checagem de partida ativa. |

## 12. Realtime (item 9)

Realtime é **apenas notificação**. Os clientes assinam `postgres_changes`:
- `tcg_pvp_queue` filtrado por `user_id=eq.<me>` (para saber que foi pareado);
- `tcg_pvp_matches` filtrado por `id=eq.<match>`.

O payload é tratado como sinal opaco — o cliente só olha `version`/`status` e imediatamente refaz `tcg_pvp_match_view`. Como `state` não é concedida a `authenticated`, o Realtime (que respeita RLS/GRANT por coluna) não entrega o JSONB. Nenhuma decisão de jogo é tomada com base no payload. Se o evento se perder, o heartbeat de 10s funciona como poll de segurança.

## 13. Estrutura final do SQL — `docs/migrations/0041_tcg_pvp_matchmaking.md` (item 10)

Cabeçalho do arquivo: **"Execute este SQL no SQL Editor do Supabase."** Ordem exata abaixo; nenhuma tabela ou função existente é alterada.

**1. `tcg_pvp_matches`**
- Finalidade: partida PvP e seu estado autoritativo.
- Colunas: `id uuid PK`, `p1_id`, `p2_id` (FK `auth.users`), `p1_deck_snapshot jsonb`, `p2_deck_snapshot jsonb`, `status text` (`PREPARING|ACTIVE|FINISHED|CANCELLED`), `state jsonb`, `state_version int`, `version int default 0`, `turn_user_id uuid`, `turn_started_at`, `turn_count int`, `winner_id uuid`, `rewarded_at timestamptz`, `p1_seen_at`, `p2_seen_at`, `created_at`, `updated_at`.
- RLS: ligada. Policy `SELECT` para `authenticated` com `auth.uid() IN (p1_id,p2_id)`. Sem policies de escrita.
- GRANT: `GRANT SELECT (id,p1_id,p2_id,status,turn_user_id,turn_count,winner_id,version,updated_at) ON ... TO authenticated;` (**`state` fora**) e `GRANT ALL ... TO service_role`.
- Índices: `(p1_id) WHERE status IN ('PREPARING','ACTIVE')`, `(p2_id) WHERE status IN ('PREPARING','ACTIVE')`, `(status, updated_at)`.
- Dependências: `auth.users`. Conflitos: nome novo, não colide com `tcg_duel_matches`.
- Riscos: JSONB grande — mitigado por partida curta e limite de 80 entradas de log já existente no motor.

**2. `tcg_pvp_queue`**
- Finalidade: fila de matchmaking.
- Colunas: `user_id uuid PK`, `deck_id uuid`, `deck_snapshot jsonb`, `status text` (`SEARCHING|MATCHED`), `match_id uuid`, `created_at`, `updated_at`.
- RLS: `SELECT` só da própria linha. Sem escrita direta.
- GRANT: `SELECT` para `authenticated`, `ALL` para `service_role`.
- Índices: PK; `(status, updated_at)`; único parcial `(user_id) WHERE status='SEARCHING'`.
- Riscos: linhas zumbis — resolvidas pelo corte de 60s + limpeza preguiçosa.

**3. `tcg_pvp_match_actions`**
- Finalidade: auditoria e base futura de replay.
- Colunas: `id bigserial PK`, `match_id uuid FK`, `player_id uuid`, `action_type text`, `action_data jsonb`, `turn_number int`, `created_at`.
- RLS: `SELECT` para participantes da partida. Sem escrita direta.
- Índices: `(match_id, id)`.
- Riscos: crescimento — retenção de 30 dias sugerida (delete opcional documentado).

**4. RPCs (todas `SECURITY DEFINER`, `SET search_path = public`, `GRANT EXECUTE ... TO authenticated`)**

| RPC | Parâmetros | Retorno | Validações | Riscos |
| --- | --- | --- | --- | --- |
| `tcg_pvp_join_queue` | `_deck_id uuid` | `(status, match_id)` | auth, baralho do usuário e válido, sem partida ativa, sem fila ativa; congela snapshot; pareia com `FOR UPDATE SKIP LOCKED` | corrida de pareamento — coberta pelo lock |
| `tcg_pvp_leave_queue` | — | `(status)` | remove se `SEARCHING`; `already_matched` caso contrário | corrida cancelar × parear — matchmaking vence |
| `tcg_pvp_queue_status` | — | `(status, match_id)` | própria linha; atualiza `updated_at` (heartbeat da fila) | — |
| `tcg_pvp_active_match` | — | `(match_id, status)` | partida `PREPARING`/`ACTIVE` do `auth.uid()`; roda `resolve_stale` antes | — |
| `tcg_pvp_match_view` | `_match_id uuid` | estado **redigido** + `version` | participante; redige mão/deck do oponente; inverte perspectiva para p2 | maior risco do sistema — redação testada explicitamente |
| `tcg_pvp_ping` | `_match_id uuid` | `(status, version)` | participante; atualiza `seen_at`; chama `resolve_stale` | — |
| `tcg_pvp_resolve_stale` | `_limit int default 20` | `int` (quantidade resolvida) | interna/idempotente; aplica regras de abandono e o teto de 2h; chama `tcg_finish_match` quando há vencedor | dupla recompensa — barrada por `rewarded_at IS NULL` |
| `tcg_pvp_lock_match` | `_match_id uuid` | linha completa travada | usada só pelo service role dentro da server function | deadlock — evitado por lock de linha única |
| `tcg_pvp_apply_state` | `_match_id, _state jsonb, _expected_version int, _action jsonb, ...` | `(ok, version)` | grava estado + incrementa versão + registra ação; finaliza e recompensa quando `over` | concorrência — `WHERE version = _expected_version` |

**5. Realtime:** `ALTER PUBLICATION supabase_realtime ADD TABLE public.tcg_pvp_matches, public.tcg_pvp_queue;`

**6. `pg_cron` opcional (comentado):** `select cron.schedule('tcg_pvp_cleanup','* * * * *', $$select public.tcg_pvp_resolve_stale(100)$$);`

**7. Testes SQL manuais** e **8. Rollback** (`DROP FUNCTION`/`DROP TABLE ... CASCADE` das 3 tabelas e 9 funções novas; nada pré-existente é tocado).

## 14. Frontend

**Novos**
- `src/lib/tcg/pvp.ts` — tipos + wrappers de RPC/server functions.
- `src/lib/tcg/pvp.functions.ts` — server functions autoritativas (`startPvpMatch`, `submitPvpAction`).
- `src/lib/tcg/pvp-engine.server.ts` — (de)serialização do estado, validação, redação.
- `src/hooks/use-pvp-match.ts` — Realtime, refetch, heartbeat, reconexão.
- `src/components/tcg/matchmaking-dialog.tsx` — "Buscando oponente" / "Oponente encontrado".

**Alterados**
- `src/routes/tcggame.duels.tsx` — seletor de modo, retomada de partida ativa, ações por callback.
- Extração do tabuleiro para `src/components/tcg/duel-board.tsx` (movimento de JSX, sem mudança de regra).
- `src/lib/tcg/duel.ts` — apenas as duas refatorações da seção 3 (sequências no estado + tipo próprio).

**Intocados:** `runAiTurn`, `rank.ts`, `duel-result-dialog.tsx`, conquistas, `tcg_finish_match`.

## 15. Preservação do JxIA

Efeito da IA condicionado a `mode === "AI"`; nenhuma chamada de rede nova no caminho JxIA; `finishMatch` igual. Checklist de regressão ao final: iniciar, jogar, atacar, guarda, render-se, abandonar por refresh, recompensa, histórico.

## 16. Testes

Fila: entrar, cancelar, 2/3/4 jogadores, pareamento aleatório, entrada dupla do mesmo jogador, jogador já em partida, cancelamentos simultâneos, fechar página na fila.
Partida: fechar página em duelo, reconexão, refresh, ação fora do turno, carta alheia, forjar PA/PS/dano, ataque duplicado, dois submits simultâneos (`stale_state`), rendição, abandono unilateral, abandono bilateral (CANCELLED sem recompensa), teto de 2h.
Recompensa: aplicada exatamente uma vez, conquistas processadas, VR/streak corretos, `tcg_finish_match` não chamada em partida cancelada.
Privacidade: inspecionar payload de `tcg_pvp_match_view` e do Realtime e confirmar ausência da mão/deck do oponente.
Regressão: bateria completa do JxIA.
Ferramentas: script Playwright/Node com duas sessões paralelas; testes de RPC em SQL documentados na migração.

## 17. Riscos

- Latência por ação (~100–300ms) — nada de otimismo no estado de jogo, só feedback visual de seleção.
- Perda de evento Realtime — coberta pelo heartbeat.
- Redação incompleta em `match_view` é o risco de segurança número um — teste dedicado.
- Mudança futura em `duel.ts` sem bump de `state_version` — mitigada pela checagem de versão no carregamento.

## 18. Ordem de implementação

1. Migração SQL 0041 (executada por você no Supabase).
2. Refatorações mínimas do motor (seção 3) + regressão do JxIA.
3. `pvp.ts` + fila + telas de busca/cancelar.
4. Extração do `duel-board.tsx` + seletor de modo.
5. Motor autoritativo (server functions) e partida jogável.
6. Realtime, heartbeat, reconexão, refresh.
7. Finalização via `tcg_finish_match`, abandono/cancelamento, modal de resultado.
8. Bateria de testes e checklist final do JxIA.
