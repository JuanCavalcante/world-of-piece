import { useEffect, useState } from "react";
import { Trophy, Skull, Flame, Star, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DuelReward } from "@/lib/tcg/rank";

/** Modal premium de fim de duelo com animação de subida/queda do VR. */
export function DuelResultDialog({
  reward,
  turns,
  onClose,
}: {
  reward: DuelReward | null;
  turns: number;
  onClose: () => void;
}) {
  const [vrShown, setVrShown] = useState(0);

  useEffect(() => {
    if (!reward) return;
    const from = reward.vr - reward.vr_delta;
    const to = reward.vr;
    setVrShown(from);
    const started = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - started) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setVrShown(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reward?.vr, reward?.vr_delta]);

  if (!reward) return null;
  const won = reward.won;
  const up = reward.vr_delta >= 0;

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-black/80 backdrop-blur-sm p-6">
      <div
        className={cn(
          "w-full max-w-sm rounded-3xl border bg-sea-surface/95 p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300",
          won ? "border-gold/50 shadow-[0_0_60px_-20px_rgba(255,201,84,0.8)]" : "border-wop-red/40",
        )}
      >
        <span
          className={cn(
            "mx-auto grid size-16 place-items-center rounded-2xl border",
            won ? "border-gold/40 bg-gold/10" : "border-wop-red/40 bg-wop-red/10",
          )}
        >
          {won ? <Trophy className="size-8 text-gold" /> : <Skull className="size-8 text-wop-red" />}
        </span>

        <p className="mt-4 font-display text-3xl tracking-wide">{won ? "Vitória!" : "Derrota"}</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-parchment/40">
          Duelo encerrado em {turns} turnos
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-gold/20 bg-sea-deep/60 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold/70">Experiência</p>
            <p className="mt-1 font-display text-2xl text-parchment flex items-center justify-center gap-1.5">
              <Star className="size-4 text-gold" /> +{reward.xp}
            </p>
          </div>
          <div
            className={cn(
              "rounded-2xl border p-4",
              up ? "border-emerald-400/30 bg-emerald-400/5" : "border-wop-red/30 bg-wop-red/5",
            )}
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold/70">Recompensa</p>
            <p
              className={cn(
                "mt-1 font-display text-2xl flex items-center justify-center gap-1.5",
                up ? "text-emerald-300" : "text-wop-red",
              )}
            >
              {up ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
              {up ? "+" : ""}
              {reward.vr_delta}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-gold/20 bg-sea-deep/60 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold/70">Valor de Recompensa</p>
          <p className="mt-1 font-display text-3xl text-gold tabular-nums">{vrShown} VR</p>
        </div>

        <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-parchment/50">
          <Flame className={cn("size-3.5", won ? "text-gold" : "text-parchment/30")} />
          {won
            ? `Sequência atual: ${reward.win_streak} ${reward.win_streak === 1 ? "vitória" : "vitórias"}`
            : reward.loss_streak > 1
              ? `Sequência de derrotas: ${reward.loss_streak}`
              : "Sequência de vitórias encerrada"}
        </p>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-gradient-primary py-3 text-[11px] uppercase tracking-widest font-bold"
        >
          Voltar aos duelos
        </button>
      </div>
    </div>
  );
}
