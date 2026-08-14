import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { HAKI_LIST } from "@/lib/haki/catalog";
import {
  HAKI_TIERS,
  HAKI_TIER_LABELS,
  HAKI_STATES,
  type HakiTier,
  type HakiState,
} from "@/lib/haki/types";
import type { Character, CharacterPatch } from "@/lib/characters/types";
import { HakiPanel } from "./HakiPanel";

type Slot = {
  id: string;
  tierField: keyof Character;
  stateField: keyof Character;
};

const SLOTS: Slot[] = [
  { id: "armamento", tierField: "haki_armamento_tier", stateField: "haki_armamento_state" },
  { id: "observacao", tierField: "haki_observacao_tier", stateField: "haki_observacao_state" },
  { id: "conquistador", tierField: "haki_conquistador_tier", stateField: "haki_conquistador_state" },
];

export function HakiCards({
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
        {SLOTS.map((slot) => {
          const data = HAKI_LIST.find((h) => h.id === slot.id)!;
          const tier = (character[slot.tierField] as string | null) ?? "";
          const state = (character[slot.stateField] as string | null) ?? "";
          return (
            <div
              key={slot.id}
              className="relative border border-gold/20 rounded-sm overflow-hidden bg-sea-surface/40"
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${data.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div className="absolute inset-0 bg-sea-surface/80 backdrop-blur-[1px]" />
              <div className="relative p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-3.5 text-gold" />
                  <span className="font-serif text-sm text-gold tracking-wide">
                    {data.name}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">
                    Tier
                  </Label>
                  <Select
                    value={tier}
                    onValueChange={(v) =>
                      patch({ [slot.tierField]: (v || null) as HakiTier | null } as CharacterPatch)
                    }
                  >
                    <SelectTrigger className="bg-sea-surface/70">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {HAKI_TIERS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {HAKI_TIER_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">
                    Estado
                  </Label>
                  <Select
                    value={state}
                    onValueChange={(v) =>
                      patch({ [slot.stateField]: (v || null) as HakiState | null } as CharacterPatch)
                    }
                  >
                    <SelectTrigger className="bg-sea-surface/70">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {HAKI_STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full bg-sea-surface/70"
                  onClick={() => setOpenId(slot.id)}
                >
                  Habilidade
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {SLOTS.map((slot) => {
        const tier = (character[slot.tierField] as string | null) ?? null;
        return (
          <HakiPanel
            key={slot.id}
            open={openId === slot.id}
            onOpenChange={(o) => setOpenId(o ? slot.id : null)}
            hakiId={slot.id}
            currentTier={tier}
          />
        );
      })}
    </>
  );
}
