import { Input } from "@/components/ui/input";
import { ATTR_PARTS, type AttributeKey, type Character, type CharacterPatch, attrCol } from "@/lib/characters/types";
import { attrTotal } from "@/lib/characters/derived";

export function AttributeRow({
  attrKey,
  label,
  character,
  patch,
}: {
  attrKey: AttributeKey;
  label: string;
  character: Character;
  patch: (p: CharacterPatch) => void;
}) {
  const total = attrTotal(character, attrKey);
  return (
    <tr className="border-b border-gold/10">
      <td className="py-2 pr-3 text-sm text-parchment/80">{label}</td>
      {ATTR_PARTS.map((part) => {
        const col = attrCol(attrKey, part);
        return (
          <td key={part} className="py-2 px-1">
            <Input
              type="number"
              value={character[col] as number}
              onChange={(e) =>
                patch({ [col]: Number(e.target.value) || 0 } as CharacterPatch)
              }
              className="h-8 text-center text-sm"
            />
          </td>
        );
      })}
      <td className="py-2 pl-3 text-center font-display text-gold text-base tabular-nums">
        {total}
      </td>
    </tr>
  );
}
