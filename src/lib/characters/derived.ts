import { ATTRIBUTES, type AttributeKey, type Character, attrCol } from "./types";

export function attrTotal(c: Character, key: AttributeKey): number {
  return (
    (c[attrCol(key, "base")] as number) +
    (c[attrCol(key, "passivo")] as number) +
    (c[attrCol(key, "equip")] as number) +
    (c[attrCol(key, "treino")] as number)
  );
}

export function allTotals(c: Character): Record<AttributeKey, number> {
  const out = {} as Record<AttributeKey, number>;
  for (const a of ATTRIBUTES) out[a.key] = attrTotal(c, a.key);
  return out;
}

export function levelBonus(level: number): number {
  return level * 20 + Math.floor(level / 10) * 120;
}

export function derived(c: Character) {
  const t = allTotals(c);
  const bonus = levelBonus(c.level);
  return {
    totals: t,
    defesa: t.vigor / 2,
    carisma: (t.inteligencia + t.vontade) / 2,
    hp: 150 + t.vigor * 8 + bonus,
    sp: 150 + t.vigor * 2 + t.inteligencia * 2 + t.vontade * 4 + bonus,
    haki: c.level * 2 + t.espirito / 2,
  };
}
