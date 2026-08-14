import { useState } from "react";
import { ImageOff, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { Character, CharacterPatch } from "@/lib/characters/types";

type FieldKey = "portrait_url" | "wanted_poster_url" | "flag_url";
type Field = { key: FieldKey; label: string };
const FIELDS: Field[] = [
  { key: "portrait_url", label: "Retrato do Personagem" },
  { key: "wanted_poster_url", label: "Cartaz de Procurado" },
  { key: "flag_url", label: "Bandeira" },
];

export function CharacterImages({
  character,
  patch,
}: {
  character: Character;
  patch: (p: CharacterPatch) => void;
}) {
  const [editing, setEditing] = useState<Field | null>(null);
  const [draft, setDraft] = useState("");

  function openEdit(f: Field) {
    setDraft(character[f.key] ?? "");
    setEditing(f);
  }

  function save() {
    if (!editing) return;
    patch({ [editing.key]: draft.trim() || null } as CharacterPatch);
    setEditing(null);
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        {FIELDS.map((f) => {
          const url = character[f.key] ?? "";
          return (
            <div key={f.key} className="space-y-2">
              <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">
                {f.label}
              </Label>
              <button
                type="button"
                onClick={() => openEdit(f)}
                className="group relative w-full aspect-video border border-gold/20 rounded-sm overflow-hidden bg-sea-deep/60 flex items-center justify-center hover:border-gold/50 transition-colors"
                aria-label={`Editar ${f.label}`}
              >
                {url ? (
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <ImageOff className="size-8 text-parchment/20" />
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-parchment">
                    <Pencil className="size-3.5" />
                    {url ? "Trocar" : "Adicionar"}
                  </span>
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide">
              {editing?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">
              URL da imagem
            </Label>
            <Input
              value={draft}
              placeholder="https://..."
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
            {draft && (
              <div className="aspect-video border border-gold/20 rounded-sm overflow-hidden bg-sea-deep/60">
                <img
                  src={draft}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
