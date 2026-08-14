import { Link } from "@tanstack/react-router";
import { ChevronLeft, Star } from "lucide-react";
import type { Character } from "@/lib/characters/types";
import type { SaveState } from "@/lib/characters/use-character";

export function CharacterHeader({
  character,
  saveState,
}: {
  character: Character;
  saveState: SaveState;
}) {
  const label: Record<SaveState, string> = {
    idle: "",
    dirty: "Alterações pendentes…",
    saving: "Salvando…",
    saved: "Salvo",
    error: "Erro ao salvar",
  };
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <Link
          to="/personagens"
          className="inline-flex items-center gap-1 text-[11px] tracking-[0.25em] uppercase text-parchment/60 hover:text-gold mb-3"
        >
          <ChevronLeft className="size-3" />
          Personagens
        </Link>
        <h1 className="font-display text-3xl lg:text-4xl tracking-wide flex items-center gap-3">
          {character.name || "Sem nome"}
          {character.is_active && (
            <Star className="size-5 fill-gold text-gold" aria-label="Ativo" />
          )}
        </h1>
      </div>
      <span
        className={`text-[10px] tracking-[0.25em] uppercase ${
          saveState === "error" ? "text-destructive" : "text-parchment/40"
        }`}
      >
        {label[saveState]}
      </span>
    </div>
  );
}
