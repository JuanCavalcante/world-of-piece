import { ATTRIBUTES, type Character, type CharacterPatch } from "@/lib/characters/types";
import { AttributeRow } from "./AttributeRow";

export function CharacterAttributes({
  character,
  patch,
}: {
  character: Character;
  patch: (p: CharacterPatch) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px]">
        <thead>
          <tr className="border-b border-gold/30">
            <th className="text-left py-2 pr-3 text-[10px] tracking-[0.25em] uppercase text-parchment/60 font-normal">
              Atributo
            </th>
            {["Base", "Passivo", "Equipamentos", "Treino"].map((h) => (
              <th
                key={h}
                className="py-2 px-1 text-[10px] tracking-[0.25em] uppercase text-parchment/60 font-normal"
              >
                {h}
              </th>
            ))}
            <th className="py-2 pl-3 text-[10px] tracking-[0.25em] uppercase text-gold font-normal">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {ATTRIBUTES.map((a) => (
            <AttributeRow
              key={a.key}
              attrKey={a.key}
              label={a.label}
              character={character}
              patch={patch}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
