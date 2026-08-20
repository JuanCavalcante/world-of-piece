import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { audioManager } from "@/lib/audio-manager";
import { useProgression } from "@/hooks/use-progression";
import { useBattleMusic } from "@/hooks/use-audio";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Swords, Play, Flag, History, Trophy, Skull, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TcgPageHeader } from "@/components/tcg/tcg-shell";
import { useAuth } from "@/hooks/use-auth";
import {
  ensureTcgPlayer,
  listCards,
  listMyDecks,
  listDuelHistory,
  getAiBannerUrl,
  getPlayerCosmetics,
  type TcgCard,
} from "@/lib/tcg/api";
import { finishMatch, type DuelReward } from "@/lib/tcg/rank";
import { DuelBoard } from "@/components/tcg/duel-board";
import { usePvpMatch } from "@/hooks/use-pvp-match";
import {
  activeMatch,
  joinQueue,
  leaveQueue,
  myMatchResult,
  queueStatus,
  startMatch,
  submitAction,
  type PvpReward,
} from "@/lib/tcg/pvp";
import {
  createDuel,
  attackWith,
  endTurn,
  playCard,
  runAiTurn,
  surrender,
  FIELD_SLOTS,
  START_HP,
  type AttackTarget,
  type DuelState,
} from "@/lib/tcg/duel";
import { cn } from "@/lib/utils";

const FOE_AVATAR_URL = "https://i.imgur.com/8Km9tLL.jpg";

export const Route = createFileRoute("/tcggame/duels")({
  head: () => ({
    meta: [
      { title: "Duelos — WOP TCG" },
      { name: "description", content: "Desafie a IA ou outros jogadores em duelos do TCG World of Piece." },
      { property: "og:title", content: "Duelos — WOP TCG" },
      {
        property: "og:description",
        content: "Desafie a IA ou outros jogadores em duelos do TCG World of Piece.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DuelsPage,
});

function DuelsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const progression = useProgression();
  const { data: pool, isLoading } = useQuery({ queryKey: ["tcg-cards"], queryFn: () => listCards("ACTIVE") });
  const { data: decks, isLoading: loadingDecks } = useQuery({
    queryKey: ["tcg-user-decks", user?.id],
    queryFn: () => listMyDecks(user!.id),
    enabled: !!user?.id,
  });
  const { data: me } = useQuery({
    queryKey: ["tcg-player", user?.id],
    queryFn: ensureTcgPlayer,
    enabled: !!user?.id,
  });
  const myAvatar = me?.avatar_url ?? null;
  const myBanner = me?.banner_url ?? null;
  const { data: aiBanner } = useQuery({ queryKey: ["tcg-ai-banner"], queryFn: getAiBannerUrl });
  const { data: history } = useQuery({
    queryKey: ["tcg-duel-history", user?.id],
    queryFn: () => listDuelHistory(user!.id),
    enabled: !!user?.id,
  });

  const [game, setGame] = useState<DuelState | null>(null);
  const [deckId, setDeckId] = useState<string | null>(null);
  const [reward, setReward] = useState<DuelReward | null>(null);
  const savedRef = useRef(false);

  /* ---------------- PvP ---------------- */
  const [searching, setSearching] = useState(false);
  const [pvpMatchId, setPvpMatchId] = useState<string | null>(null);
  const [matchFound, setMatchFound] = useState(false);
  const { view: pvpView, refresh: refreshPvp } = usePvpMatch(pvpMatchId);
  const startedRef = useRef<string | null>(null);
  const pvpRewardedRef = useRef<string | null>(null);
  const [pvpReward, setPvpReward] = useState<PvpReward | null>(null);
  const opponentId = pvpView?.opponent_id ?? null;
  const { data: foeProfile } = useQuery({
    queryKey: ["tcg-player-cosmetics", opponentId],
    queryFn: () => getPlayerCosmetics(opponentId!),
    enabled: !!opponentId,
    staleTime: 60_000,
  });

  const cardsMap = useMemo(() => {
    const m = new Map<string, TcgCard>();
    (pool ?? []).forEach((c) => m.set(c.id, c));
    return m;
  }, [pool]);

  const deckCount = (id: string) => {
    const d = decks?.find((x) => x.id === id);
    return d ? d.cards.reduce((a, c) => a + c.quantity, 0) : 0;
  };

  const buildDeckCards = (id: string): TcgCard[] => {
    const d = decks?.find((x) => x.id === id);
    if (!d) return [];
    const out: TcgCard[] = [];
    d.cards.forEach((c) => {
      const card = cardsMap.get(c.card_id);
      if (!card) return;
      for (let i = 0; i < c.quantity; i++) out.push(card);
    });
    return out;
  };

  const apply = (fn: (s: DuelState) => void) =>
    setGame((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev) as DuelState;
      fn(next);
      return next;
    });

  useEffect(() => {
    if (!game || game.over || game.turn !== "foe") return;
    const t = setTimeout(() => apply((s) => runAiTurn(s)), 1000);
    return () => clearTimeout(t);
  }, [game?.turn, game?.over, game?.turnCount]);

  /* ---------- Áudio ---------- */
  const pvpState = pvpView?.state ?? null;
  useBattleMusic((!!game && !game.over) || (!!pvpState && !pvpState.over));

  useEffect(() => {
    const kind = game?.fx.kind;
    if (!game?.fx.stamp || !kind) return;
    audioManager.playSfx("attack");
    if (kind === "hit") {
      const t = setTimeout(() => audioManager.playSfx("damage"), 160);
      return () => clearTimeout(t);
    }
  }, [game?.fx.stamp]);

  useEffect(() => {
    if (!game || game.over) return;
    audioManager.playSfx("turn");
  }, [game?.turn, game?.turnCount]);

  // Mantém referência ao duelo IA em andamento para registrar derrota ao abandonar.
  const liveRef = useRef<{ game: DuelState; userId: string } | null>(null);
  useEffect(() => {
    liveRef.current = game && !game.over && user?.id && !savedRef.current ? { game, userId: user.id } : null;
  }, [game, user?.id]);

  useEffect(() => {
    const abandon = () => {
      const live = liveRef.current;
      if (!live || savedRef.current) return;
      savedRef.current = true;
      liveRef.current = null;
      void finishMatch({
        winnerId: null,
        loserId: live.userId,
        turns: live.game.turnCount,
        winnerName: live.game.foe.name,
        loserName: live.game.you.name,
        ranked: false,
      }).catch(() => undefined);
    };
    const onUnload = () => abandon();
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      abandon();
    };
  }, []);

  useEffect(() => {
    if (!game?.over || savedRef.current || !user?.id) return;
    savedRef.current = true;
    const youWon = game.winner === "you";
    const turns = game.turnCount;
    finishMatch({
      winnerId: youWon ? user.id : null,
      loserId: youWon ? null : user.id,
      turns,
      winnerName: youWon ? game.you.name : game.foe.name,
      loserName: youWon ? game.foe.name : game.you.name,
      ranked: false,
    })
      .then(async (rows) => {
        const mine = rows.find((r) => r.user_id === user.id) ?? null;
        setReward(mine);
        await progression.daily("DAILY_MATCHES_PLAYED", 1);
        if (youWon) await progression.daily("DAILY_MATCHES_WON", 1);
        await progression.sync();
        invalidateAll();
      })
      .catch((e) =>
        toast.error(
          `Não foi possível salvar o resultado.${e instanceof Error && e.message ? ` (${e.message})` : ""}`,
        ),
      );
  }, [game?.over, user?.id]);

  const invalidateAll = useCallback(() => {
    if (!user?.id) return;
    qc.invalidateQueries({ queryKey: ["tcg-duel-history", user.id] });
    qc.invalidateQueries({ queryKey: ["tcg-player", user.id] });
    qc.invalidateQueries({ queryKey: ["tcg-my-stats", user.id] });
    qc.invalidateQueries({ queryKey: ["tcg-ranking"] });
    qc.invalidateQueries({ queryKey: ["tcg-my-ranking"] });
  }, [qc, user?.id]);

  /* ---------- PvP: retomar partida ativa ---------- */
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    void activeMatch()
      .then((id) => {
        if (alive && id) {
          setPvpMatchId(id);
          setMatchFound(true);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [user?.id]);

  /* ---------- PvP: fila ---------- */
  useEffect(() => {
    if (!searching) return;
    const t = setInterval(() => {
      void queueStatus()
        .then((res) => {
          if (res.status === "MATCHED" && res.matchId) {
            setSearching(false);
            audioManager.playSfx("match-found");
            setMatchFound(true);
            setPvpMatchId(res.matchId);
          }
        })
        .catch(() => undefined);
    }, 2000);
    return () => clearInterval(t);
  }, [searching]);

  /* ---------- PvP: iniciar estado da partida ---------- */
  useEffect(() => {
    if (!pvpMatchId || !pvpView) return;
    if (pvpView.state || pvpView.status !== "PREPARING") return;
    if (startedRef.current === pvpMatchId) return;
    startedRef.current = pvpMatchId;
    void startMatch(pvpMatchId)
      .then(() => refreshPvp())
      .catch(() => {
        startedRef.current = null;
      });
  }, [pvpMatchId, pvpView?.status, pvpView?.state, refreshPvp]);

  /* ---------- PvP: sincronizar progressão ao terminar ---------- */
  useEffect(() => {
    if (!pvpMatchId || !pvpView || !user?.id) return;
    if (pvpView.status !== "FINISHED" && pvpView.status !== "CANCELLED") return;
    if (pvpRewardedRef.current === pvpMatchId) return;
    pvpRewardedRef.current = pvpMatchId;
    void (async () => {
      if (pvpView.status === "FINISHED") {
        await progression.daily("DAILY_MATCHES_PLAYED", 1);
        if (pvpView.winner_id === user.id) await progression.daily("DAILY_MATCHES_WON", 1);
        await progression.sync();
        try {
          const r = await myMatchResult(pvpMatchId);
          if (r) setPvpReward({ ...r, user_id: user.id });
        } catch {
          /* mantém apenas a mensagem de fim */
        }
      }
      invalidateAll();
    })();
  }, [pvpMatchId, pvpView?.status, user?.id, invalidateAll]);

  async function startPvp() {
    if (!deckId) {
      toast.error("Escolha um baralho para duelar.");
      return;
    }
    try {
      const res = await joinQueue(deckId);
      if (res.status === "MATCHED" || res.status === "IN_MATCH") {
        audioManager.playSfx("match-found");
        setMatchFound(true);
        setPvpMatchId(res.matchId);
        setSearching(false);
      } else {
        setSearching(true);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível entrar na fila.");
    }
  }

  async function cancelSearch() {
    try {
      const res = await leaveQueue();
      if (res.status === "ALREADY_MATCHED" && res.matchId) {
        setSearching(false);
        setMatchFound(true);
        setPvpMatchId(res.matchId);
        return;
      }
    } catch {
      /* ignora */
    }
    setSearching(false);
  }

  const doPvpAction = async (
    action:
      | { type: "PLAY"; uid: string; slot: number }
      | { type: "ATTACK"; uid: string; target: AttackTarget }
      | { type: "END_TURN" }
      | { type: "SURRENDER" },
  ) => {
    if (!pvpMatchId) return;
    try {
      await submitAction(pvpMatchId, action);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ação recusada pelo servidor.");
    } finally {
      void refreshPvp();
    }
  };

  function closePvp() {
    setPvpMatchId(null);
    setMatchFound(false);
    startedRef.current = null;
    pvpRewardedRef.current = null;
    setPvpReward(null);
  }

  function closeResult() {
    setReward(null);
    setGame(null);
  }

  function start() {
    if (!pool?.length) {
      toast.error("Nenhuma carta ativa disponível para duelar.");
      return;
    }
    if (!deckId) {
      toast.error("Escolha um baralho para duelar.");
      return;
    }
    const deckCards = buildDeckCards(deckId);
    if (deckCards.length < 2) {
      toast.error("Este baralho não tem cartas suficientes.");
      return;
    }
    savedRef.current = false;
    setReward(null);
    setGame(createDuel(pool, "Você", deckCards));
  }

  /* ---------------- Partida PvP em andamento ---------------- */
  if (pvpMatchId) {
    const finished = pvpView?.status === "FINISHED" || pvpView?.status === "CANCELLED";
    if (!pvpView || !pvpView.state) {
      return (
        <div className="max-w-xl mx-auto text-center rounded-3xl border border-gold/20 bg-sea-surface/40 p-10 mt-10">
          <Swords className="size-10 text-gold/70 mx-auto mb-4 animate-pulse" />
          <p className="font-display text-xl mb-1">Oponente encontrado!</p>
          <p className="text-xs text-parchment/60 mb-6">Preparando duelo...</p>
          <Loader2 className="size-5 animate-spin text-gold/70 mx-auto" />
          <button
            onClick={closePvp}
            className="mt-8 px-5 py-2 rounded-lg border border-gold/40 text-gold text-[10px] tracking-widest uppercase"
          >
            Voltar
          </button>
        </div>
      );
    }
    const endMessage =
      pvpView.status === "CANCELLED"
        ? "Partida cancelada"
        : pvpView.winner_id && user?.id
          ? pvpView.winner_id === user.id
            ? "Vitória!"
            : "Derrota"
          : undefined;
    return (
      <DuelBoard
        game={pvpView.state}
        myAvatarUrl={myAvatar}
        myBannerUrl={myBanner}
        foeAvatarUrl={foeProfile?.avatar_url ?? FOE_AVATAR_URL}
        foeBannerUrl={foeProfile?.banner_url ?? null}
        canAct={pvpView.is_my_turn && !finished}
        onPlay={(uid, slot) => void doPvpAction({ type: "PLAY", uid, slot })}
        onAttack={(uid, target) => void doPvpAction({ type: "ATTACK", uid, target })}
        onEndTurn={() => void doPvpAction({ type: "END_TURN" })}
        onSurrender={() => void doPvpAction({ type: "SURRENDER" })}
        reward={pvpReward}
        onCloseResult={closePvp}
        endMessage={endMessage}
        overlay={
          finished && !pvpReward && !pvpView.state.over ? (
            <div className="absolute inset-0 z-20 grid place-items-center bg-black/75 backdrop-blur-sm p-6">
              <div className="rounded-2xl border border-gold/30 bg-sea-surface/95 p-8 text-center">
                <p className="font-display text-2xl mb-2">{endMessage ?? "Duelo encerrado"}</p>
                <button
                  onClick={closePvp}
                  className="px-5 py-2.5 rounded-xl bg-gradient-primary text-[11px] tracking-widest uppercase"
                >
                  Voltar aos duelos
                </button>
              </div>
            </div>
          ) : null
        }
      />
    );
  }

  /* ---------------- Buscando oponente ---------------- */
  if (searching) {
    return (
      <div className="max-w-xl mx-auto text-center rounded-3xl border border-gold/20 bg-sea-surface/40 p-10 mt-10">
        <Swords className="size-10 text-gold/70 mx-auto mb-4 animate-pulse" />
        <p className="font-display text-xl mb-1">Buscando oponente</p>
        <p className="text-xs text-parchment/60 mb-6">Procurando um adversário disponível...</p>
        <Loader2 className="size-5 animate-spin text-gold/70 mx-auto" />
        <button
          onClick={cancelSearch}
          className="mt-8 px-5 py-2 rounded-lg border border-wop-red/50 text-wop-red text-[10px] tracking-widest uppercase hover:bg-wop-red/10"
        >
          <Flag className="inline size-3.5 mr-1.5" /> Cancelar
        </button>
      </div>
    );
  }

  /* ---------------- Duelo contra a IA ---------------- */
  if (game) {
    return (
      <DuelBoard
        game={game}
        myAvatarUrl={myAvatar}
        myBannerUrl={myBanner}
        foeAvatarUrl={FOE_AVATAR_URL}
        foeBannerUrl={aiBanner ?? null}
        onPlay={(uid, slot) => apply((s) => playCard(s, "you", uid, slot))}
        onAttack={(uid, target) => apply((s) => attackWith(s, "you", uid, target))}
        onEndTurn={() => apply((s) => endTurn(s))}
        onSurrender={() => apply((s) => surrender(s, "you"))}
        reward={reward}
        onCloseResult={closeResult}
      />
    );
  }

  /* ---------------- Lobby ---------------- */
  return (
    <div className="max-w-4xl mx-auto">
      <TcgPageHeader
        eyebrow="Arena"
        title="Duelos"
        description={`Enfrente a IA ou outro jogador: ${START_HP} HP, 4 cartas na mão e pontos de ação crescentes a cada turno.`}
      />
      <div className="rounded-3xl border border-gold/15 bg-sea-surface/40 p-8 sm:p-10 text-center">
        <Swords className="size-10 text-gold/60 mx-auto mb-4" />
        <p className="text-parchment/60 mb-6 text-sm max-w-md mx-auto">
          Cada jogador tem {FIELD_SLOTS} slots de Campo. Selecione uma carta sua no campo e escolha o alvo: uma carta
          inimiga ou o próprio adversário.
        </p>

        <p className="text-[10px] tracking-[0.3em] uppercase text-gold/70 mb-3">Escolha seu baralho</p>
        {loadingDecks ? (
          <p className="text-xs text-parchment/50 mb-6">Carregando baralhos...</p>
        ) : (decks?.length ?? 0) === 0 ? (
          <p className="text-xs text-parchment/50 mb-6">
            Você ainda não criou nenhum baralho. Monte um na sala de Baralhos para poder duelar.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 max-w-2xl mx-auto mb-7">
            {decks!.map((d) => {
              const count = deckCount(d.id);
              return (
                <button
                  key={d.id}
                  onClick={() => setDeckId(d.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all",
                    deckId === d.id
                      ? "border-gold/60 bg-gold/10 shadow-[0_0_18px_-6px_rgba(255,201,84,0.5)]"
                      : "border-gold/15 bg-sea-deep/40 hover:border-gold/40",
                  )}
                >
                  <p className="font-display text-sm truncate">{d.name}</p>
                  <p className="text-[10px] uppercase tracking-widest text-parchment/50 mt-1">{count} cartas</p>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={start}
            disabled={isLoading || !deckId}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-primary text-[11px] tracking-widest uppercase disabled:opacity-50"
          >
            <Play className="size-4" /> {isLoading ? "Carregando cartas..." : "Duelo JxIA"}
          </button>
          <button
            onClick={() => void startPvp()}
            disabled={!deckId || matchFound}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gold/50 text-gold text-[11px] tracking-widest uppercase hover:bg-gold/10 disabled:opacity-50"
          >
            <Users className="size-4" /> Duelo JxJ
          </button>
        </div>
      </div>

      {/* Histórico de duelos */}
      <div className="mt-6 rounded-3xl border border-gold/15 bg-sea-surface/40 p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="size-4 text-gold/70" />
          <p className="text-[11px] tracking-[0.3em] uppercase text-gold/70">Histórico</p>
        </div>
        {(history?.length ?? 0) === 0 ? (
          <p className="text-xs text-parchment/50">Nenhum duelo registrado ainda.</p>
        ) : (
          <ul className="divide-y divide-gold/10">
            {history!.map((m) => {
              const won = m.won;
              return (
                <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="flex items-center gap-2 min-w-0">
                    {won ? (
                      <Trophy className="size-4 text-gold shrink-0" />
                    ) : (
                      <Skull className="size-4 text-wop-red shrink-0" />
                    )}
                    <span className={cn("text-sm", won ? "text-gold" : "text-wop-red")}>
                      {won ? "Vitória" : "Derrota"}
                    </span>
                    <span className="shrink-0 rounded-md border border-gold/20 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-parchment/50">
                      {m.is_pvp ? "JxJ" : "JxIA"}
                    </span>
                    <span className="text-xs text-parchment/40 truncate">vs {m.opponent}</span>
                  </span>

                  <span className="flex items-center gap-3 shrink-0 text-[10px] uppercase tracking-widest text-parchment/50">
                    <span>{m.turns} turnos</span>
                    <span>{new Date(m.created_at).toLocaleDateString("pt-BR")}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
