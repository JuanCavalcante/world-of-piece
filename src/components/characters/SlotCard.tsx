import { Link } from "@tanstack/react-router";
import { Plus, Star, Trash2 } from "lucide-react";
import type { Character } from "@/lib/characters/types";
import { Button } from "@/components/ui/button";
import { DeleteCharacterDialog } from "./dialogs/DeleteCharacterDialog";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} d`;
}

export function SlotCard({
  slot,
  character,
  onCreate,
  onSetActive,
  onDelete,
  creating,
  deleting,
}: {
  slot: number;
  character: Character | null;
  onCreate: () => void;
  onSetActive: (id: string) => void;
  onDelete: (id: string) => void;
  creating: boolean;
  deleting?: boolean;
}) {
  if (!character) {
    return (
      <div className="border border-dashed border-gold/30 rounded-sm p-8 flex flex-col items-center justify-center min-h-[220px] bg-sea-surface/20">
        <p className="text-[11px] tracking-[0.3em] text-parchment/40 uppercase mb-4">
          Slot {slot}
        </p>
        <Button
          variant="outline"
          onClick={onCreate}
          disabled={creating}
          className="border-gold/40 text-gold hover:bg-gold/10"
        >
          <Plus className="size-4 mr-2" />
          Criar Personagem
        </Button>
      </div>
    );
  }

  return (
    <div className="relative border border-gold/20 rounded-sm bg-sea-surface/40 hover:border-gold/40 transition-colors min-h-[220px] flex flex-col">
      <div className="absolute -top-2 -right-2 size-8 border-t-2 border-r-2 border-gold/40" />
      <Link
        to="/personagens/$id"
        params={{ id: character.id }}
        className="flex-1 p-6 block"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] tracking-[0.3em] text-gold/70 uppercase">
            Slot {slot}
          </p>
          {character.is_active && (
            <span className="flex items-center gap-1 text-[10px] tracking-widest text-gold uppercase">
              <Star className="size-3 fill-gold" /> Ativo
            </span>
          )}
        </div>
        <h3 className="font-display text-xl tracking-wide mb-1">
          {character.name || "Sem nome"}
        </h3>
        <p className="text-xs text-parchment/60 mb-4">
          Nível {character.level} · {character.organization || "Sem organização"}
        </p>
        <p className="text-[10px] tracking-wider uppercase text-parchment/40 mt-auto">
          Atualizado {timeAgo(character.updated_at)}
        </p>
      </Link>
      <div className="border-t border-gold/20 flex">
        {!character.is_active ? (
          <button
            onClick={() => onSetActive(character.id)}
            className="flex-1 py-2 text-[10px] tracking-[0.25em] uppercase text-parchment/60 hover:text-gold hover:bg-gold/5 transition-colors"
          >
            Tornar ativo
          </button>
        ) : (
          <div className="flex-1" />
        )}
        <DeleteCharacterDialog
          characterName={character.name ?? ""}
          pending={deleting}
          onConfirm={() => onDelete(character.id)}
          trigger={
            <button
              className="px-4 py-2 text-[10px] tracking-[0.25em] uppercase text-parchment/60 hover:text-red-400 hover:bg-red-500/10 transition-colors border-l border-gold/20 flex items-center gap-1.5"
              aria-label="Excluir personagem"
            >
              <Trash2 className="size-3" />
              Excluir
            </button>
          }
        />
      </div>
    </div>
  );
}
