import { useState } from "react";
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
import { AKUMA_TYPES, type LoadoutData, type LoadoutMove } from "@/lib/loadouts/types";
import { ImageUrlPopover } from "./ImageUrlPopover";
import { MovePanel } from "./MovePanel";
import { Plus, Swords } from "lucide-react";

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function LoadoutPanel({
  open,
  onOpenChange,
  title,
  slotId,
  data,
  onChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  slotId: string;
  data: LoadoutData;
  onChange: (d: LoadoutData) => void;
}) {
  const moves = data.moves ?? [];
  const variants = data.variant_moves ?? [];
  const [openMoveId, setOpenMoveId] = useState<string | null>(null);
  const [openVariantId, setOpenVariantId] = useState<string | null>(null);

  const update = (patch: Partial<LoadoutData>) => onChange({ ...data, ...patch });
  const updateMoves = (next: LoadoutMove[]) => onChange({ ...data, moves: next });
  const updateVariants = (next: LoadoutMove[]) => onChange({ ...data, variant_moves: next });

  const addMove = () => {
    const m: LoadoutMove = { id: uid(), image_url: "", name: "", type: "", tier: "", cost: "", description: "" };
    updateMoves([...moves, m]);
    setOpenMoveId(m.id);
  };

  const addVariant = () => {
    const m: LoadoutMove = { id: uid(), image_url: "", name: "", type: "", tier: "", cost: "", description: "" };
    updateVariants([...variants, m]);
    setOpenVariantId(m.id);
  };

  const renderMoveCard = (m: LoadoutMove, onClick: () => void) => (
    <button
      key={m.id}
      type="button"
      onClick={onClick}
      className="relative text-left border border-gold/20 rounded-sm overflow-hidden bg-sea-surface/40 hover:border-gold/50 transition"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: m.image_url ? `url(${m.image_url})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-sea-surface/80" />
      <div className="relative p-3">
        <div className="flex items-center gap-2">
          <Swords className="size-3.5 text-gold" />
          <span className="font-serif text-sm text-parchment">
            {m.name || "Sem nome"}
          </span>
        </div>
        <div className="text-[10px] tracking-[0.2em] uppercase text-parchment/60 mt-1">
          {[m.type, m.tier ? TIER_LABELS[m.tier as keyof typeof TIER_LABELS] ?? m.tier : null]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <div className="relative rounded-sm overflow-hidden border border-gold/20 bg-sea-surface/40 h-48">
          {data.image_url ? (
            <img src={data.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-parchment/40 text-xs">
              Sem imagem
            </div>
          )}
          <div className="absolute top-2 right-2">
            <ImageUrlPopover value={data.image_url} onSave={(v) => update({ image_url: v })} />
          </div>
        </div>

        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-gold">
            {data.name || title}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-3 space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Nome</Label>
            <Input value={data.name ?? ""} onChange={(e) => update({ name: e.target.value })} />
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Tier</Label>
            <Select value={data.tier ?? ""} onValueChange={(v) => update({ tier: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {ITEM_TIERS.map((t) => (
                  <SelectItem key={t} value={t}>{TIER_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {slotId === "akuma" && (
            <div className="col-span-3 space-y-1.5">
              <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Tipo</Label>
              <Select value={data.akuma_type ?? ""} onValueChange={(v) => update({ akuma_type: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {AKUMA_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="col-span-2 space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Pontos adic.</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={data.extra_points ?? ""}
              onChange={(e) => update({ extra_points: e.target.value.replace(/[^0-9-]/g, "") })}
            />
          </div>
          <div className={slotId === "akuma" ? "col-span-1 hidden" : "col-span-4 space-y-1.5"}>
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Usuário atual</Label>
            <Input value={data.current_user ?? ""} onChange={(e) => update({ current_user: e.target.value })} />
          </div>
          {slotId === "akuma" && (
            <div className="col-span-4 space-y-1.5">
              <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Usuário atual</Label>
              <Input value={data.current_user ?? ""} onChange={(e) => update({ current_user: e.target.value })} />
            </div>
          )}
          <div className="col-span-6 space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Descrição</Label>
            <RichTextEditor value={data.description ?? ""} onChange={(v) => update({ description: v })} minHeight="8rem" />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-lg text-gold border-b border-gold/20 pb-1 flex-1">Movimentos</h3>
            <Button size="sm" variant="outline" onClick={addMove} className="ml-3">
              <Plus className="size-3.5 mr-1" /> Adicionar
            </Button>
          </div>

          {moves.length === 0 ? (
            <p className="text-parchment/50 text-sm italic">Nenhum movimento cadastrado.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {moves.map((m) => renderMoveCard(m, () => setOpenMoveId(m.id)))}
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-lg text-gold border-b border-gold/20 pb-1 flex-1">Movimentos variantes</h3>
            <Button size="sm" variant="outline" onClick={addVariant} className="ml-3">
              <Plus className="size-3.5 mr-1" /> Adicionar
            </Button>
          </div>

          {variants.length === 0 ? (
            <p className="text-parchment/50 text-sm italic">Nenhum movimento variante cadastrado.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {variants.map((m) => renderMoveCard(m, () => setOpenVariantId(m.id)))}
            </div>
          )}
        </div>

        {moves.map((m) => (
          <MovePanel
            key={m.id}
            open={openMoveId === m.id}
            onOpenChange={(o) => setOpenMoveId(o ? m.id : null)}
            move={m}
            onChange={(next) => updateMoves(moves.map((x) => (x.id === m.id ? next : x)))}
            onDelete={() => updateMoves(moves.filter((x) => x.id !== m.id))}
          />
        ))}
        {variants.map((m) => (
          <MovePanel
            key={m.id}
            open={openVariantId === m.id}
            onOpenChange={(o) => setOpenVariantId(o ? m.id : null)}
            move={m}
            onChange={(next) => updateVariants(variants.map((x) => (x.id === m.id ? next : x)))}
            onDelete={() => updateVariants(variants.filter((x) => x.id !== m.id))}
          />
        ))}
      </DialogContent>
    </Dialog>
  );
}
