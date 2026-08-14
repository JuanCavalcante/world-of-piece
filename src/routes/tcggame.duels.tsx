import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { audioManager } from "@/lib/audio-manager";
import { useProgression } from "@/hooks/use-progression";
import { useBattleMusic } from "@/hooks/use-audio";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Swords, Play, Heart, Zap, Layers, Flag, X, History, Trophy, Skull, UserRound } from "lucide-react";
import { toast } from "sonner";
import { TcgPageHeader } from "@/components/tcg/tcg-shell";
import { useAuth } from "@/hooks/use-auth";
import {
  ensureTcgPlayer,
  listCards,
  listMyDecks,
  listDuelHistory,
  getAiBannerUrl,
  RARITY_STYLE,
  type Rarity,
  RARITIES,
  type TcgCard,
} from "@/lib/tcg/api";
import { finishMatch, type DuelReward } from "@/lib/tcg/rank";
import { DuelResultDialog } from "@/components/tcg/duel-result-dialog";
import {

  createDuel,
  attackWith,
  canAttack,
  isValidTarget,
  hasGuard,
  endTurn,
  playCard,
  runAiTurn,
  surrender,
  EFFECT_LABEL,
  FIELD_SLOTS,
  START_HP,
  type AttackTarget,
  type DuelState,
  type InPlayCard,
  type Side,
} from "@/lib/tcg/duel";
import { cn } from "@/lib/utils";
const DUEL_BG_URL = "https://i.imgur.com/nj9Nmxx.jpg";
const FOE_AVATAR_URL = "https://i.imgur.com/8Km9tLL.jpg";

export const Route = createFileRoute("/tcggame/duels")({
  head: () => ({
    meta: [
      { title: "Duelos — WOP TCG" },
      { name: "description", content: "Desafie a IA em duelos rápidos no TCG World of Piece." },
      { property: "og:title", content: "Duelos — WOP TCG" },
      { property: "og:description", content: "Desafie a IA em duelos rápidos no TCG World of Piece." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DuelsPage,
});

const rarityStyle = (r: string) =>
  RARITY_STYLE[(RARITIES.includes(r as Rarity) ? r : "COMUM") as Rarity];

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
  const [dragging, setDragging] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState<InPlayCard | null>(null);
  const [confirmSurrender, setConfirmSurrender] = useState(false);
  const [reward, setReward] = useState<DuelReward | null>(null);
  const savedRef = useRef(false);

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
    setSelected(null);
    const t = setTimeout(() => apply((s) => runAiTurn(s)), 1000);
    return () => clearTimeout(t);
  }, [game?.turn, game?.over, game?.turnCount]);

  /* ---------- Áudio ---------- */
  useBattleMusic(!!game && !game.over);

  // Ataque / dano
  useEffect(() => {
    const kind = game?.fx.kind;
    if (!game?.fx.stamp || !kind) return;
    audioManager.playSfx("attack");
    if (kind === "hit") {
      const t = setTimeout(() => audioManager.playSfx("damage"), 160);
      return () => clearTimeout(t);
    }
  }, [game?.fx.stamp]);

  // Troca de turno
  useEffect(() => {
    if (!game || game.over) return;
    audioManager.playSfx("turn");
  }, [game?.turn, game?.turnCount]);

  // Mantém referência ao duelo em andamento para registrar derrota ao abandonar.
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
    })
      .then(async (rows) => {
        const mine = rows.find((r) => r.user_id === user.id) ?? null;
        setReward(mine);
        await progression.daily("DAILY_MATCHES_PLAYED", 1);
        if (youWon) await progression.daily("DAILY_MATCHES_WON", 1);
        await progression.sync();
        qc.invalidateQueries({ queryKey: ["tcg-duel-history", user.id] });
        qc.invalidateQueries({ queryKey: ["tcg-player", user.id] });
        qc.invalidateQueries({ queryKey: ["tcg-my-stats", user.id] });
        qc.invalidateQueries({ queryKey: ["tcg-ranking"] });
        qc.invalidateQueries({ queryKey: ["tcg-my-ranking"] });
      })
      .catch(() => toast.error("Não foi possível salvar o resultado."));
  }, [game?.over, user?.id]);

  function closeResult() {
    setReward(null);
    setGame(null);
    setZoom(null);
    setSelected(null);
    setConfirmSurrender(false);
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
    setZoom(null);
    setSelected(null);
    setConfirmSurrender(false);
    setGame(createDuel(pool, "Você", deckCards));
  }

  if (!game) {
    return (
      <div className="max-w-4xl mx-auto">
        <TcgPageHeader
          eyebrow="Arena"
          title="Duelos"
          description={`Enfrente a IA em um duelo rápido: ${START_HP} HP, 4 cartas na mão e pontos de ação crescentes a cada turno.`}
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

          <button
            onClick={start}
            disabled={isLoading || !deckId}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-primary text-[11px] tracking-widest uppercase disabled:opacity-50"
          >
            <Play className="size-4" /> {isLoading ? "Carregando cartas..." : "Iniciar duelo"}
          </button>
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
                const won = m.won ?? m.winner === "Você";
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
                      <span className="text-xs text-parchment/40 truncate">
                        vs {won ? m.loser : m.winner}
                      </span>
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


  const yourTurn = game.turn === "you" && !game.over;

  const dropToField = (slot: number) => {
    if (!yourTurn || !dragging) return;
    apply((s) => playCard(s, "you", dragging, slot));
    setDragging(null);
  };

  const resolveAttack = (target: AttackTarget) => {
    if (!yourTurn || !selected) return;
    apply((s) => attackWith(s, "you", selected, target));
    setSelected(null);
    setZoom(null);
  };

  const onOwnFieldClick = (slot: number) => {
    const card = game.you.field[slot];
    if (!card) return;
    if (!yourTurn) {
      setZoom(card);
      return;
    }
    if (selected === card.uid) {
      setSelected(null);
      setZoom(null);
      return;
    }
    if (canAttack(game, "you", card.uid)) {
      setSelected(card.uid);
      setZoom(card);
    } else setZoom(card);
  };

  const foeGuarded = hasGuard(game.foe);
  const canHitPlayer = !!selected && yourTurn && isValidTarget(game, "you", { kind: "player" });

  const onFoeFieldClick = (slot: number) => {
    const card = game.foe.field[slot];
    if (!card) return;
    if (selected && yourTurn && isValidTarget(game, "you", { kind: "card", slot })) {
      resolveAttack({ kind: "card", slot });
    } else setZoom(card);
  };

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] min-h-[560px] gap-3">
      {/* Coluna esquerda: adversário + log */}
      <div className="hidden md:flex w-52 lg:w-60 shrink-0 flex-col gap-3">
        <PlayerBadge
          name={game.foe.name}
          hp={game.foe.hp}
          maxHp={game.foe.maxHp}
          avatarUrl={FOE_AVATAR_URL}
          targetable={canHitPlayer}
          onClick={() => canHitPlayer && resolveAttack({ kind: "player" })}
        />
        <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-gold/20 bg-black/50 backdrop-blur p-3 space-y-1.5 text-[11px]">
          <p className="text-[10px] tracking-[0.25em] uppercase text-gold/70 mb-2">Log de combate</p>
          {game.log.slice().reverse().map((l) => (
            <p
              key={l.id}
              className={cn(
                "leading-snug",
                l.side === "you" && "text-gold/90",
                l.side === "foe" && "text-wop-red/80",
                l.side === "system" && "text-parchment/50 uppercase tracking-widest",
              )}
            >
              {l.text}
            </p>
          ))}
        </div>
      </div>

    <div className="relative flex flex-1 min-w-0 flex-col overflow-hidden rounded-3xl border border-gold/20">
      {/* Fundo do campo de batalha */}
      <div className="absolute inset-0 -z-10">
        <img src={DUEL_BG_URL} alt="" className="size-full object-cover blur-[6px] scale-110" />
        <div className="absolute inset-0 bg-sea-deep/80" />
        <div className="absolute inset-0 bg-gradient-to-b from-sea-deep/90 via-transparent to-sea-deep/90" />
      </div>

      {/* Oponente */}
      <BoardSide
        side={game.foe}
        opponent
        bannerUrl={aiBanner ?? null}
        highlight={game.fx.target === "foe" && game.fx.kind === "hit"}
        targetable={!!selected && yourTurn}
        onFieldClick={onFoeFieldClick}
        onPlayerClick={() => canHitPlayer && resolveAttack({ kind: "player" })}
        onZoom={setZoom}
      />

      {/* Faixa central */}
      <div className="relative flex items-center justify-center gap-3 px-4 py-1 border-y border-gold/15 bg-black/30 text-[10px] tracking-[0.25em] uppercase text-parchment/60">
        <span className="text-gold/80">Turno {game.turnCount}</span>
        <span>·</span>
        <span>
          {game.over
            ? "Fim do duelo"
            : selected && yourTurn
              ? foeGuarded
                ? "Guarda ativa — ataque as cartas de Guarda"
                : "Escolha o alvo"
              : yourTurn
                ? "Sua vez"
                : "Vez do adversário"}
        </span>
      </div>

      {/* Jogador */}
      <BoardSide
        side={game.you}
        className="pb-24"
        highlight={game.fx.target === "you" && game.fx.kind === "hit"}
        selectedUid={selected}
        bannerUrl={myBanner}
        onZoom={setZoom}
        onFieldDrop={dropToField}
        onFieldClick={onOwnFieldClick}
      />

      {/* Mão em leque (centralizada, metade visível) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center">
        <div className="pointer-events-none flex items-end justify-center px-4 pt-10">
          {game.you.hand.map((c, i) => {
            const affordable = game.you.ap >= c.cost;
            const n = game.you.hand.length;
            const mid = (n - 1) / 2;
            const offset = i - mid;
            const rot = offset * 6;
            const lift = Math.abs(offset) * 10;
            return (
              <button
                key={c.uid}
                draggable={yourTurn && affordable}
                onDragStart={() => setDragging(c.uid)}
                onDragEnd={() => setDragging(null)}
                onClick={() => setZoom(c)}
                style={{
                  transform: `rotate(${rot}deg) translateY(${lift + 30}px)`,
                  marginLeft: i === 0 ? 0 : -26,
                  zIndex: 10 + i,
                }}
                className={cn(
                  "pointer-events-auto group relative w-[86px] sm:w-[112px] lg:w-[128px] xl:w-[142px] aspect-[3/4] rounded-xl border-2 overflow-hidden bg-sea-deep/80 shadow-[0_-8px_24px_-10px_rgba(0,0,0,0.9)] origin-bottom",
                  "transition-transform duration-200 ease-out hover:!translate-y-0 hover:!rotate-0 hover:z-50 hover:scale-105",
                  rarityStyle(c.rarity),
                  affordable && yourTurn ? "cursor-grab" : "opacity-60",
                )}
              >
                <MiniCard card={c} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Painel de ações */}
      <div className="absolute bottom-3 right-3 z-30 flex flex-col gap-2 rounded-2xl border border-gold/20 bg-black/70 backdrop-blur p-2.5">
        {selected && yourTurn && (
          <button
            onClick={() => setSelected(null)}
            className="px-3 py-2 rounded-lg border border-gold/40 text-gold text-[10px] tracking-widest uppercase hover:bg-gold/10"
          >
            Cancelar ataque
          </button>
        )}
        <button
          disabled={!yourTurn}
          onClick={() => {
            setSelected(null);
            apply((s) => endTurn(s));
          }}
          className="px-3 py-2 rounded-lg border border-gold/40 text-gold text-[10px] tracking-widest uppercase hover:bg-gold/10 disabled:opacity-40"
        >
          Encerrar turno
        </button>
        <button
          disabled={game.over}
          onClick={() => setConfirmSurrender(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-wop-red/50 text-wop-red text-[10px] tracking-widest uppercase hover:bg-wop-red/10 disabled:opacity-40"
        >
          <Flag className="size-3.5" /> Render-se
        </button>
      </div>


      {/* Zoom da carta — em modo de ataque fica flutuante, sem bloquear o campo */}
      {zoom && (
        <div
          className={cn(
            "absolute z-30",
            selected
              ? "left-3 bottom-3 pointer-events-none"
              : "inset-0 grid place-items-center bg-black/80 backdrop-blur-sm p-6",
          )}
          onClick={selected ? undefined : () => setZoom(null)}
        >
          <div
            className={cn(
              "relative rounded-2xl border-2 overflow-hidden bg-sea-deep pointer-events-auto",
              selected ? "w-40 shadow-2xl shadow-black/60" : "w-56",
              rarityStyle(zoom.rarity),
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setZoom(null);
                if (selected) setSelected(null);
              }}
              className="absolute top-2 left-2 z-10 grid place-items-center size-6 rounded-full bg-black/70 text-parchment/80"
              aria-label="Fechar"
            >
              <X className="size-3.5" />
            </button>
            <div className="aspect-[3/4]">
              <MiniCard card={zoom} large />
            </div>
            <div className="p-3 space-y-1 bg-black/60">
              <p className="text-sm text-parchment">{zoom.name}</p>
              <p className="text-[11px] text-gold/80">
                {zoom.rarity} · {zoom.ps}/{zoom.maxPs} HP · {zoom.atk} ATK · {zoom.cost} MP
              </p>
              <p className="text-[11px] text-parchment/60 whitespace-pre-line">
                {zoom.effect?.trim() || EFFECT_LABEL[zoom.effect_code]}
              </p>
              {selected && (
                <p className="text-[11px] text-wop-red">Escolha um alvo no campo inimigo.</p>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Confirmação de rendição */}
      {confirmSurrender && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-black/80 backdrop-blur-sm p-6">
          <div className="rounded-2xl border border-wop-red/40 bg-sea-surface/95 p-6 text-center max-w-xs">
            <Flag className="size-7 text-wop-red mx-auto mb-3" />
            <p className="text-sm text-parchment mb-1">Deseja se render?</p>
            <p className="text-[11px] text-parchment/60 mb-5">A partida termina e conta como derrota.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setConfirmSurrender(false);
                  apply((s) => surrender(s, "you"));
                }}
                className="px-5 py-2 rounded-lg bg-wop-red text-[11px] tracking-widest uppercase text-white"
              >
                Sim
              </button>
              <button
                onClick={() => setConfirmSurrender(false)}
                className="px-5 py-2 rounded-lg border border-gold/40 text-gold text-[11px] tracking-widest uppercase"
              >
                Não
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fim de duelo */}
      {game.over && !reward && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/75 backdrop-blur-sm p-6">
          <div className="rounded-2xl border border-gold/30 bg-sea-surface/95 p-8 text-center">
            <p className="font-display text-2xl mb-2">{game.winner === "you" ? "Vitória!" : "Derrota"}</p>
            <p className="text-xs text-parchment/60 mb-5">Duelo encerrado em {game.turnCount} turnos.</p>
            <button
              onClick={closeResult}
              className="px-5 py-2.5 rounded-xl bg-gradient-primary text-[11px] tracking-widest uppercase"
            >
              Voltar aos duelos
            </button>
          </div>
        </div>
      )}

      <DuelResultDialog reward={reward} turns={game.turnCount} onClose={closeResult} />
    </div>

      {/* Coluna direita: jogador */}
      <div className="hidden md:flex w-52 lg:w-60 shrink-0 flex-col justify-end gap-3">
        <PlayerBadge name={game.you.name} hp={game.you.hp} maxHp={game.you.maxHp} avatarUrl={myAvatar} />
      </div>
    </div>
  );
}

function PlayerBadge({
  name,
  hp,
  maxHp,
  avatarUrl,
  targetable,
  onClick,
}: {
  name: string;
  hp: number;
  maxHp: number;
  avatarUrl?: string | null;
  targetable?: boolean;
  onClick?: () => void;
}) {
  const pct = Math.max(0, Math.round((Math.max(0, hp) / maxHp) * 100));
  return (
    <div className="rounded-2xl border border-gold/20 bg-black/50 backdrop-blur p-4 text-center">
      <button
        type="button"
        disabled={!targetable || !onClick}
        onClick={() => onClick?.()}
        title={targetable ? "Atacar o jogador diretamente" : name}
        className={cn(
          "mx-auto grid size-24 lg:size-28 place-items-center overflow-hidden rounded-full border-2 border-gold/50 bg-sea-deep/70 transition",
          targetable && onClick && "border-wop-red ring-2 ring-wop-red/70 animate-pulse cursor-pointer hover:scale-105",
        )}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="size-full object-cover" />
        ) : (
          <UserRound className="size-9 text-gold/50" />
        )}
      </button>
      <p className="mt-3 truncate text-[11px] tracking-[0.2em] uppercase text-gold/80">{name}</p>
      <div className="mt-2 rounded-xl border border-wop-red/40 bg-wop-red/10 px-3 py-1.5">
        <p className="inline-flex items-center gap-1.5 text-sm text-wop-red">
          <Heart className="size-3.5" /> {Math.max(0, hp)}/{maxHp}
        </p>
        <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-wop-red transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function BoardSide({
  side,
  opponent,
  highlight,
  targetable,
  selectedUid,
  bannerUrl,
  onZoom,
  onFieldDrop,
  onFieldClick,
  onPlayerClick,
  className,
}: {
  side: Side;
  className?: string;
  opponent?: boolean;
  highlight?: boolean;
  targetable?: boolean;
  selectedUid?: string | null;
  bannerUrl?: string | null;
  onZoom?: (c: InPlayCard) => void;
  onFieldDrop?: (slot: number) => void;
  onFieldClick?: (slot: number) => void;
  onPlayerClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "relative flex-1 min-h-0 flex flex-col justify-center gap-2 px-3 py-2 transition-all duration-300",
        highlight && "bg-wop-red/10 animate-pulse",
        className,
      )}
    >
      {bannerUrl && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <img src={bannerUrl} alt="" className="size-full object-cover" />
          <div className="absolute inset-0 bg-sea-deep/55" />
        </div>
      )}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] tracking-widest uppercase">
        <span className="text-gold/80 truncate max-w-[8rem]">{side.name}</span>
        <button
          type="button"
          disabled={!targetable || !onPlayerClick}
          onClick={() => onPlayerClick?.()}
          className={cn(
            "md:hidden inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-wop-red transition",
            targetable && onPlayerClick && "ring-2 ring-wop-red/70 animate-pulse cursor-pointer hover:bg-wop-red/20",
          )}
          title={targetable && onPlayerClick ? "Atacar o jogador diretamente" : undefined}
        >
          <Heart className="size-3" /> {Math.max(0, side.hp)}/{side.maxHp}
        </button>
        <span className="inline-flex items-center gap-1 text-sky-300">
          <Zap className="size-3" /> {side.ap}/{side.maxAp} PA
        </span>
        <span className="inline-flex items-center gap-1 text-parchment/50">
          <Layers className="size-3" /> {side.deck.length}
        </span>
        {opponent && <span className="text-parchment/50">{side.hand.length} na mão</span>}
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-[calc((100dvh-16rem)*0.375*7)] grid-cols-7 gap-1 sm:gap-2 lg:gap-3">
        {side.field.map((c, i) => (
          <div
            key={i}
            onDragOver={(e) => onFieldDrop && e.preventDefault()}
            onDrop={() => onFieldDrop?.(i)}
            onClick={() => {
              if (!c) return;
              if (onFieldClick) onFieldClick(i);
              else onZoom?.(c);
            }}
            className={cn(
              "w-full min-w-0 aspect-[3/4] rounded-lg border border-dashed border-gold/25 bg-black/40 overflow-hidden",
              (onFieldDrop || onFieldClick) && "cursor-pointer hover:border-gold/70",
              c && "border-solid",
              c && rarityStyle(c.rarity),
              c && selectedUid === c.uid && "ring-2 ring-gold",
              c && targetable && "ring-2 ring-wop-red/70 animate-pulse",
              c && !targetable && !opponent && c.attacked && "opacity-60",
            )}
          >
            {c ? <MiniCard card={c} /> : <SlotLabel label="Campo" />}
          </div>
        ))}
      </div>

    </div>
  );
}

function SlotLabel({ label }: { label: string }) {
  return (
    <div className="size-full grid place-items-center text-[8px] tracking-[0.2em] uppercase text-parchment/30">
      {label}
    </div>
  );
}

function MiniCard({ card, large }: { card: InPlayCard; large?: boolean }) {
  const pct = Math.max(0, Math.round((card.ps / card.maxPs) * 100));
  return (
    <div className="size-full relative" title={card.effect?.trim() || EFFECT_LABEL[card.effect_code]}>
      {card.image_url ? (
        <img src={card.image_url} alt={card.name} className="size-full object-cover" />
      ) : (
        <div className="size-full bg-sea-deep/70" />
      )}
      <span
        className={cn(
          "absolute top-1 right-1 grid place-items-center rounded-full bg-black/70 border border-sky-400/60 text-sky-300",
          large ? "size-7 text-xs" : "size-4 text-[8px]",
        )}
        title={`${card.cost} MP`}
      >
        {card.cost}
      </span>
      <div className="absolute inset-x-0 bottom-0 bg-black/75 px-1 py-0.5">
        {large && <p className="text-[11px] truncate text-parchment">{card.name}</p>}
        <div className="h-1 rounded bg-white/10 overflow-hidden my-0.5">
          <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className={cn("text-gold/80 leading-none", large ? "text-[10px]" : "text-[7px]")}>
          {card.ps} HP · {card.atk} ATK
        </p>
      </div>
    </div>
  );
}
