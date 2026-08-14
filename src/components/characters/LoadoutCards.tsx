import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Swords, Apple, Sparkles, Eye } from "lucide-react";
import { LOADOUT_SLOTS, type LoadoutData } from "@/lib/loadouts/types";
import type { Character, CharacterPatch } from "@/lib/characters/types";
import { LoadoutPanel } from "./LoadoutPanel";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  edl: Swords,
  akuma: Apple,
  misc: Sparkles,
};

export function LoadoutCards({
  character,
  patch,
}: {
  character: Character;
  patch: (p: CharacterPatch) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {LOADOUT_SLOTS.map((slot) => {
          const raw = (character as unknown as Record<string, unknown>)[slot.field];
          const data = (raw && typeof raw === "object" ? (raw as LoadoutData) : {}) as LoadoutData;
          const Icon = ICONS[slot.id];
          return (
            <div
              key={slot.id}
              className="relative border border-gold/20 rounded-sm overflow-hidden bg-sea-surface/40 min-h-[19rem] flex"
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: data.image_url ? `url(${data.image_url})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div className="absolute inset-0 bg-sea-surface/80 backdrop-blur-[1px]" />
              <div className="relative p-4 flex-1 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Icon className="size-3.5 text-gold" />
                  <span className="font-serif text-sm text-gold tracking-wide">
                    {slot.label}
                  </span>
                </div>
                <div className="font-serif text-lg text-parchment/90 truncate">
                  {data.name || <span className="text-parchment/40 italic text-sm">Sem registro</span>}
                </div>
                <div className="flex-1" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full bg-sea-surface/70"
                  onClick={() => setOpenId(slot.id)}
                >
                  <Eye className="size-3.5 mr-1" /> Ver
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {LOADOUT_SLOTS.map((slot) => {
        const raw = (character as unknown as Record<string, unknown>)[slot.field];
        const data = (raw && typeof raw === "object" ? (raw as LoadoutData) : {}) as LoadoutData;
        return (
          <LoadoutPanel
            key={slot.id}
            open={openId === slot.id}
            onOpenChange={(o) => setOpenId(o ? slot.id : null)}
            title={slot.label}
            slotId={slot.id}
            data={data}
            onChange={(next) => patch({ [slot.field]: next } as unknown as CharacterPatch)}
          />
        );
      })}
    </>
  );
}
