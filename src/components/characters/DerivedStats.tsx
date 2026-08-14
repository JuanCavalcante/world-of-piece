import { Heart, Zap, Shield, Sparkles, MessageCircle, Flame } from "lucide-react";
import type { Character } from "@/lib/characters/types";
import { derived } from "@/lib/characters/derived";

export function DerivedStats({ character }: { character: Character }) {
  const d = derived(character);
  const items = [
    { icon: Heart, label: "HP", value: d.hp },
    { icon: Zap, label: "SP", value: d.sp },
    { icon: Flame, label: "Haki", value: d.haki },
    { icon: Shield, label: "Defesa", value: d.defesa },
    { icon: MessageCircle, label: "Carisma", value: d.carisma },
    { icon: Sparkles, label: "Nível", value: character.level },
  ];
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {items.map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="border border-gold/20 rounded-sm bg-sea-surface/40 p-4 text-center"
        >
          <Icon className="size-4 text-gold mx-auto mb-2" />
          <p className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">
            {label}
          </p>
          <p className="font-display text-2xl text-parchment tabular-nums mt-1">
            {Number.isInteger(value) ? value : value.toFixed(1)}
          </p>
        </div>
      ))}
    </div>
  );
}
