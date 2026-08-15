import { useState, type ReactNode } from "react";
import { Heart, Zap, Layers, Flag, X, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { RARITY_STYLE, RARITIES, type Rarity } from "@/lib/tcg/api";
import { DuelResultDialog } from "@/components/tcg/duel-result-dialog";
import type { DuelReward } from "@/lib/tcg/rank";
import {
  canAttack,
  hasGuard,
  isValidTarget,
  EFFECT_LABEL,
  type AttackTarget,
  type DuelState,
  type InPlayCard,
  type Side,
} from "@/lib/tcg/duel";

const DUEL_BG_URL = "https://i.imgur.com/nj9Nmxx.jpg";

const rarityStyle = (r: string) =>
  RARITY_STYLE[(RARITIES.includes(r as Rarity) ? r : "COMUM") as Rarity];

export type DuelBoardProps = {
  game: DuelState;
  myAvatarUrl?: string | null;
  myBannerUrl?: string | null;
  foeAvatarUrl?: string | null;
  foeBannerUrl?: string | null;
  /** Falso quando o servidor ainda não liberou as ações (PvP aguardando). */
  canAct?: boolean;
  onPlay: (uid: string, slot: number) => void;
  onAttack: (uid: string, target: AttackTarget) => void;
  onEndTurn: () => void;
  onSurrender: () => void;
  reward: DuelReward | null;
  onCloseResult: () => void;
  /** Camada extra (ex.: "reconectando..." no PvP). */
  overlay?: ReactNode;
  endMessage?: string;
};

export function DuelBoard({
  game,
  myAvatarUrl,
  myBannerUrl,
  foeAvatarUrl,
  foeBannerUrl,
  canAct = true,
  onPlay,
  onAttack,
  onEndTurn,
  onSurrender,
  reward,
  onCloseResult,
  overlay,
  endMessage,
}: DuelBoardProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState<InPlayCard | null>(null);
  const [confirmSurrender, setConfirmSurrender] = useState(false);

  const yourTurn = game.turn === "you" && !game.over && canAct;

  const dropToField = (slot: number) => {
    if (!yourTurn || !dragging) return;
    onPlay(dragging, slot);
    setDragging(null);
  };

  const resolveAttack = (target: AttackTarget) => {
    if (!yourTurn || !selected) return;
    onAttack(selected, target);
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
          avatarUrl={foeAvatarUrl}
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
          bannerUrl={foeBannerUrl ?? null}
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
          bannerUrl={myBannerUrl ?? null}
          onZoom={setZoom}
          onFieldDrop={dropToField}
          onFieldClick={onOwnFieldClick}
        />

        {/* Mão em leque */}
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
              onEndTurn();
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

        {/* Zoom da carta */}
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
                {selected && <p className="text-[11px] text-wop-red">Escolha um alvo no campo inimigo.</p>}
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
                    onSurrender();
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

        {overlay}

        {/* Fim de duelo */}
        {game.over && !reward && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-black/75 backdrop-blur-sm p-6">
            <div className="rounded-2xl border border-gold/30 bg-sea-surface/95 p-8 text-center">
              <p className="font-display text-2xl mb-2">
                {endMessage ?? (game.winner === "you" ? "Vitória!" : "Derrota")}
              </p>
              <p className="text-xs text-parchment/60 mb-5">Duelo encerrado em {game.turnCount} turnos.</p>
              <button
                onClick={onCloseResult}
                className="px-5 py-2.5 rounded-xl bg-gradient-primary text-[11px] tracking-widest uppercase"
              >
                Voltar aos duelos
              </button>
            </div>
          </div>
        )}

        <DuelResultDialog reward={reward} turns={game.turnCount} onClose={onCloseResult} />
      </div>

      {/* Coluna direita: jogador */}
      <div className="hidden md:flex w-52 lg:w-60 shrink-0 flex-col justify-end gap-3">
        <PlayerBadge name={game.you.name} hp={game.you.hp} maxHp={game.you.maxHp} avatarUrl={myAvatarUrl} />
      </div>
    </div>
  );
}

export function PlayerBadge({
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
  const deckLeft = side.deckCount ?? side.deck.length;
  const handLeft = side.handCount ?? side.hand.length;
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
          <Layers className="size-3" /> {deckLeft}
        </span>
        {opponent && <span className="text-parchment/50">{handLeft} na mão</span>}
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
