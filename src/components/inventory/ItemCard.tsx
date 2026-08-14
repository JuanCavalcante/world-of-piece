import { Package } from "lucide-react";
import { TIER_LABELS, TIER_STYLES, type PlayerInventoryRow } from "@/lib/inventory/types";
import { PendingBadge } from "./PendingBadge";

export function ItemCard({
  row,
  onView,
  onActivate,
}: {
  row: PlayerInventoryRow;
  onView: () => void;
  onActivate: () => void;
}) {
  const s = TIER_STYLES[row.item.tier];
  const pending = row.status === "PENDING_ACTIVATION";
  return (
    <div
      className={`relative border ${s.border} ${s.glow} bg-sea-surface/60 rounded-sm overflow-hidden flex flex-col shadow-md`}
    >
      <div className="relative aspect-video bg-sea-deep/60 overflow-hidden">
        {row.item.image_url ? (
          <img
            src={row.item.image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-90"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-parchment/30">
            <Package className="size-10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <span className="absolute top-2 right-2 text-[9px] tracking-widest bg-black/60 px-1.5 py-0.5 rounded-sm">
          ×{row.quantity}
        </span>
        {pending && <PendingBadge tier={row.item.tier} />}
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <p className="text-sm text-parchment leading-tight line-clamp-2">{row.item.name}</p>
          <p className={`text-[10px] tracking-widest uppercase ${s.text} mt-0.5`}>
            {TIER_LABELS[row.item.tier]}
          </p>
        </div>
        <div className="mt-auto flex gap-1.5">
          <button
            onClick={onView}
            className="flex-1 border border-gold/30 text-gold text-[10px] tracking-widest py-1.5 rounded-sm hover:bg-gold/10"
          >
            VER
          </button>
          {!pending && (
            <button
              onClick={onActivate}
              className="flex-1 border border-gold bg-gold/10 text-gold text-[10px] tracking-widest py-1.5 rounded-sm hover:bg-gold/20"
            >
              ATIVAR
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
