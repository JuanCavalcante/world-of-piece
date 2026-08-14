import { RARITIES, type Rarity, type TcgCard } from "@/lib/tcg/api";

export const CARD_SORTS = [
  "name_asc",
  "name_desc",
  "cost_asc",
  "cost_desc",
  "rarity_desc",
  "rarity_asc",
  "hp_desc",
  "hp_asc",
  "atk_desc",
  "atk_asc",
] as const;

export type CardSort = (typeof CARD_SORTS)[number];

export const CARD_SORT_LABEL: Record<CardSort, string> = {
  name_asc: "Nome (A-Z)",
  name_desc: "Nome (Z-A)",
  cost_asc: "Custo (menor)",
  cost_desc: "Custo (maior)",
  rarity_desc: "Raridade (maior)",
  rarity_asc: "Raridade (menor)",
  hp_desc: "HP (maior)",
  hp_asc: "HP (menor)",
  atk_desc: "ATK (maior)",
  atk_asc: "ATK (menor)",
};

const rarityRank = (c: TcgCard) => {
  const i = RARITIES.indexOf(c.rarity as Rarity);
  return i < 0 ? 0 : i;
};

export function sortCards<T extends TcgCard>(cards: T[], sort: CardSort): T[] {
  const list = [...cards];
  const byName = (a: T, b: T) => a.name.localeCompare(b.name, "pt-BR");
  switch (sort) {
    case "name_asc":
      return list.sort(byName);
    case "name_desc":
      return list.sort((a, b) => byName(b, a));
    case "cost_asc":
      return list.sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0) || byName(a, b));
    case "cost_desc":
      return list.sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0) || byName(a, b));
    case "rarity_desc":
      return list.sort((a, b) => rarityRank(b) - rarityRank(a) || byName(a, b));
    case "rarity_asc":
      return list.sort((a, b) => rarityRank(a) - rarityRank(b) || byName(a, b));
    case "hp_desc":
      return list.sort((a, b) => (b.power ?? 0) - (a.power ?? 0) || byName(a, b));
    case "hp_asc":
      return list.sort((a, b) => (a.power ?? 0) - (b.power ?? 0) || byName(a, b));
    case "atk_desc":
      return list.sort((a, b) => (b.atk ?? 0) - (a.atk ?? 0) || byName(a, b));
    case "atk_asc":
      return list.sort((a, b) => (a.atk ?? 0) - (b.atk ?? 0) || byName(a, b));
    default:
      return list;
  }
}

export function CardSortSelect({
  value,
  onChange,
  className,
}: {
  value: CardSort;
  onChange: (v: CardSort) => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as CardSort)}
      className={
        className ??
        "bg-sea-surface/60 border border-gold/15 px-3 py-2.5 text-sm rounded-xl focus:outline-none focus:border-gold text-parchment"
      }
      aria-label="Ordenar cartas"
    >
      {CARD_SORTS.map((s) => (
        <option key={s} value={s} className="bg-sea-deep">
          {CARD_SORT_LABEL[s]}
        </option>
      ))}
    </select>
  );
}
