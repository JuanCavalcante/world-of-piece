import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { CATEGORY_LABELS, TIER_LABELS, TIER_STYLES, type PlayerInventoryRow } from "@/lib/inventory/types";

export function ItemViewerDialog({
  row,
  open,
  onOpenChange,
}: {
  row: PlayerInventoryRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  if (!row) return null;
  const s = TIER_STYLES[row.item.tier];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide">{row.item.name}</DialogTitle>
        </DialogHeader>
        <div className={`aspect-video border ${s.border} bg-sea-deep/60 rounded-sm overflow-hidden relative`}>
          {row.item.image_url ? (
            <img src={row.item.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-parchment/30">
              <Package className="size-16" />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-[10px] tracking-widest text-parchment/50 uppercase mb-1">Categoria</p>
            <p className="text-parchment">{CATEGORY_LABELS[row.item.category]}</p>
          </div>
          <div>
            <p className="text-[10px] tracking-widest text-parchment/50 uppercase mb-1">Tier</p>
            <p className={s.text}>{TIER_LABELS[row.item.tier]}</p>
          </div>
        </div>
        {row.item.description && (
          <div>
            <p className="text-[10px] tracking-widest text-parchment/50 uppercase mb-1">Descrição</p>
            <p className="text-sm text-parchment/80 whitespace-pre-wrap leading-relaxed">
              {row.item.description}
            </p>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
