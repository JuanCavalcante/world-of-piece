import { toast } from "sonner";
import { Trophy, CheckCircle2, Gift, Sparkles, Hammer, Recycle, Droplet, Coins, ArrowLeftRight, Check, X } from "lucide-react";

export type RewardToastKind =
  | "achievement"
  | "mission"
  | "bonus"
  | "forge"
  | "dismantle"
  | "extract"
  | "market-listed"
  | "market-sold"
  | "trade-received"
  | "trade-accepted"
  | "trade-declined"
  | "market-expired";

const ICONS: Record<RewardToastKind, typeof Trophy> = {
  achievement: Trophy,
  mission: CheckCircle2,
  bonus: Gift,
  forge: Hammer,
  dismantle: Recycle,
  extract: Droplet,
  "market-listed": Coins,
  "market-sold": Coins,
  "trade-received": ArrowLeftRight,
  "trade-accepted": Check,
  "trade-declined": X,
  "market-expired": Coins,
};

const HEADINGS: Record<RewardToastKind, string> = {
  achievement: "Conquista desbloqueada",
  mission: "Missão diária concluída",
  bonus: "Bônus diário desbloqueado",
  forge: "Carta forjada",
  dismantle: "Carta desmantelada",
  extract: "Essência extraída",
  "market-listed": "Anúncio criado",
  "market-sold": "Carta vendida",
  "trade-received": "Nova oferta de troca",
  "trade-accepted": "Troca aceita",
  "trade-declined": "Oferta recusada",
  "market-expired": "Anúncio expirado",
};

export function rewardToast(opts: {
  kind: RewardToastKind;
  title: string;
  xp?: number;
  packs?: number;
}) {
  const Icon = ICONS[opts.kind];
  const rewards: string[] = [];
  if (opts.xp) rewards.push(`+${opts.xp} XP`);
  if (opts.packs) rewards.push(`+${opts.packs} ${opts.packs === 1 ? "Pack" : "Packs"}`);

  toast.custom(
    () => (
      <div className="pointer-events-auto w-[340px] max-w-[90vw] overflow-hidden rounded-2xl border border-gold/40 bg-sea-surface/95 backdrop-blur-xl shadow-[0_0_44px_-12px_rgba(255,201,84,0.75)]">
        <div className="relative flex items-start gap-3 p-4">
          <div className="pointer-events-none absolute -top-12 -right-10 size-32 rounded-full bg-gradient-primary opacity-20 blur-2xl" />
          <span className="grid place-items-center size-11 shrink-0 rounded-xl border border-gold/40 bg-sea-deep/70">
            <Icon className="size-5 text-gold" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] tracking-[0.25em] uppercase text-gold/80">{HEADINGS[opts.kind]}</p>
            <p className="mt-0.5 truncate font-display text-sm text-parchment">{opts.title}</p>
            {rewards.length > 0 && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] tracking-wider uppercase text-gold">
                <Sparkles className="size-3" />
                {rewards.join(" · ")}
              </p>
            )}
          </div>
        </div>
        <div className="h-0.5 w-full bg-gradient-primary opacity-70" />
      </div>
    ),
    { duration: 5000 },
  );
}
