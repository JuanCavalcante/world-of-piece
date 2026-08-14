import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getHaki } from "@/lib/haki/catalog";
import {
  HAKI_TIER_LABELS,
  HAKI_TIER_ORDER,
  type HakiTier,
} from "@/lib/haki/types";

export function HakiPanel({
  open,
  onOpenChange,
  hakiId,
  currentTier,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  hakiId: string;
  currentTier: string | null;
}) {
  const data = getHaki(hakiId);
  if (!data) return null;
  const currentOrder = currentTier
    ? HAKI_TIER_ORDER[currentTier as HakiTier] ?? 0
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <div className="-mt-2 rounded-sm overflow-hidden border border-gold/20 bg-sea-surface/40">
          <img
            src={data.image}
            alt={data.name}
            className="w-full h-48 object-cover"
          />
        </div>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-gold">
            {data.name}
          </DialogTitle>
          <DialogDescription className="whitespace-pre-line text-parchment/70 text-sm leading-relaxed">
            {data.description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <h3 className="font-serif text-lg text-gold border-b border-gold/20 pb-1 mb-3">
            Habilidades
          </h3>
          <div className="space-y-3">
            {data.abilities.map((a) => {
              const isCurrent = currentTier === a.tier;
              const isUnlocked =
                currentTier != null &&
                currentOrder >= HAKI_TIER_ORDER[a.tier];
              return (
                <div
                  key={a.tier + a.title}
                  className={`border rounded-sm p-4 ${
                    isCurrent
                      ? "border-gold bg-gold/5"
                      : isUnlocked
                        ? "border-gold/30 bg-sea-surface/40"
                        : "border-gold/10 bg-sea-surface/20 opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <h4 className="font-serif text-base text-parchment">
                      {a.title}
                    </h4>
                    <Badge
                      variant={isUnlocked ? "default" : "outline"}
                      className="text-[10px]"
                    >
                      {HAKI_TIER_LABELS[a.tier]}
                    </Badge>
                  </div>
                  <p className="text-sm text-parchment/75 leading-relaxed whitespace-pre-line">
                    {a.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
