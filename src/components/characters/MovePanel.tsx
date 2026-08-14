import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ITEM_TIERS, TIER_LABELS } from "@/lib/inventory/types";
import { MOVE_TYPES, type LoadoutMove } from "@/lib/loadouts/types";
import { ImageUrlPopover } from "./ImageUrlPopover";
import { Trash2 } from "lucide-react";

export function MovePanel({
  open,
  onOpenChange,
  move,
  onChange,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  move: LoadoutMove;
  onChange: (m: LoadoutMove) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(move);
  useEffect(() => setDraft(move), [move, open]);

  const commit = (patch: Partial<LoadoutMove>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    onChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <div className="relative rounded-sm overflow-hidden border border-gold/20 bg-sea-surface/40 h-40">
          {draft.image_url ? (
            <img src={draft.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-parchment/40 text-xs">
              Sem imagem
            </div>
          )}
          <div className="absolute top-2 right-2">
            <ImageUrlPopover
              value={draft.image_url}
              onSave={(v) => commit({ image_url: v })}
            />
          </div>
        </div>

        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-gold">
            {draft.name || "Novo movimento"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-6 space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Nome</Label>
            <Input value={draft.name} onChange={(e) => commit({ name: e.target.value })} />
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Tipo</Label>
            <Select value={draft.type || ""} onValueChange={(v) => commit({ type: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {MOVE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Tier</Label>
            <Select value={draft.tier || ""} onValueChange={(v) => commit({ tier: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {ITEM_TIERS.map((t) => (
                  <SelectItem key={t} value={t}>{TIER_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-6 space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Custo</Label>
            <Input value={draft.cost} onChange={(e) => commit({ cost: e.target.value })} />
          </div>
          <div className="col-span-6 space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Descrição</Label>
            <RichTextEditor value={draft.description ?? ""} onChange={(v) => commit({ description: v })} minHeight="7rem" />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button variant="destructive" size="sm" onClick={() => { onDelete(); onOpenChange(false); }}>
            <Trash2 className="size-3.5 mr-1" /> Remover movimento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
