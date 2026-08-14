import { useEffect, useRef, useState } from "react";
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
import { GENDERS, SEXUALITIES } from "@/lib/characters/types";
import type { LoadoutMove } from "@/lib/loadouts/types";
import { ImageUrlPopover } from "@/components/characters/ImageUrlPopover";
import { MovePanel } from "@/components/characters/MovePanel";
import { Plus, Swords, Trash2 } from "lucide-react";
import type { Pet, PetPatch } from "@/lib/pets/types";

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function PetPanel({
  open,
  onOpenChange,
  pet,
  onPatch,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pet: Pet;
  onPatch: (id: string, patch: PetPatch) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Pet>(pet);
  const [openMoveId, setOpenMoveId] = useState<string | null>(null);
  const petId = pet.id;
  const skip = useRef(true);

  useEffect(() => {
    skip.current = true;
    setDraft(pet);
  }, [petId, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch: PetPatch) => {
    skip.current = false;
    setDraft((prev) => ({ ...prev, ...patch }) as Pet);
    onPatch(petId, patch);
  };

  const moves = draft.moves ?? [];
  const updateMoves = (next: LoadoutMove[]) => update({ moves: next });

  const addMove = () => {
    const m: LoadoutMove = {
      id: uid(),
      image_url: "",
      name: "",
      type: "",
      tier: "",
      cost: "",
      description: "",
    };
    updateMoves([...moves, m]);
    setOpenMoveId(m.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <div className="relative rounded-sm overflow-hidden border border-gold/20 bg-sea-surface/40 h-48">
          {draft.image_url ? (
            <img src={draft.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-parchment/40 text-xs">
              Sem imagem
            </div>
          )}
          <div className="absolute top-2 right-2">
            <ImageUrlPopover
              value={draft.image_url ?? ""}
              onSave={(v) => update({ image_url: v || null })}
            />
          </div>
        </div>

        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-gold">
            {draft.name || "Novo pet"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-3 space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Nome</Label>
            <Input value={draft.name ?? ""} onChange={(e) => update({ name: e.target.value })} />
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Tier</Label>
            <Select value={draft.tier ?? ""} onValueChange={(v) => update({ tier: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {ITEM_TIERS.map((t) => (
                  <SelectItem key={t} value={t}>{TIER_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-6 space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Título</Label>
            <Input value={draft.title ?? ""} onChange={(e) => update({ title: e.target.value })} />
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Sexualidade</Label>
            <Select value={draft.sexuality ?? ""} onValueChange={(v) => update({ sexuality: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {SEXUALITIES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Gênero</Label>
            <Select value={draft.gender ?? ""} onValueChange={(v) => update({ gender: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-6 space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Dono</Label>
            <Input value={draft.owner ?? ""} onChange={(e) => update({ owner: e.target.value })} />
          </div>
          <div className="col-span-6 space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Descrição</Label>
            <RichTextEditor
              value={draft.description ?? ""}
              onChange={(v) => update({ description: v })}
              minHeight="8rem"
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-lg text-gold border-b border-gold/20 pb-1 flex-1">Movimentos</h3>
            <Button size="sm" variant="outline" onClick={addMove} className="ml-3">
              <Plus className="size-3.5 mr-1" /> Adicionar movimentos
            </Button>
          </div>

          {moves.length === 0 ? (
            <p className="text-parchment/50 text-sm italic">Nenhum movimento cadastrado.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {moves.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setOpenMoveId(m.id)}
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
                      <span className="font-serif text-sm text-parchment">{m.name || "Sem nome"}</span>
                    </div>
                    <div className="text-[10px] tracking-[0.2em] uppercase text-parchment/60 mt-1">
                      {[m.type, m.tier ? TIER_LABELS[m.tier as keyof typeof TIER_LABELS] ?? m.tier : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 flex justify-end">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onDelete(petId);
              onOpenChange(false);
            }}
          >
            <Trash2 className="size-3.5 mr-1" /> Excluir pet
          </Button>
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
      </DialogContent>
    </Dialog>
  );
}
