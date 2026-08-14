import { TIER_STYLES, type ItemTier } from "@/lib/inventory/types";

export function PendingBadge({ tier }: { tier: ItemTier }) {
  const s = TIER_STYLES[tier];
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/70 rounded-sm p-3 text-center">
      <span className={`text-[10px] tracking-[0.25em] uppercase ${s.text}`}>Ativação pendente</span>
      <span className="text-[10px] text-parchment/70 leading-snug">
        Aguardando aprovação do administrador
      </span>
    </div>
  );
}
