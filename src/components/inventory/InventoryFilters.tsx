import { CATEGORY_LABELS, ITEM_CATEGORIES, ITEM_TIERS, TIER_LABELS, type ItemCategory, type ItemTier } from "@/lib/inventory/types";

export type SortKey = "recent" | "name" | "tier";

export function InventoryFilters({
  category,
  tier,
  sort,
  onCategory,
  onTier,
  onSort,
}: {
  category: ItemCategory | "";
  tier: ItemTier | "";
  sort: SortKey;
  onCategory: (v: ItemCategory | "") => void;
  onTier: (v: ItemTier | "") => void;
  onSort: (v: SortKey) => void;
}) {
  const cls =
    "bg-sea-surface/60 border border-gold/15 px-3 py-2 text-xs rounded-sm focus:outline-none focus:border-gold text-parchment";
  return (
    <div className="flex flex-wrap gap-2">
      <select className={cls} value={category} onChange={(e) => onCategory(e.target.value as ItemCategory | "")}>
        <option value="">Todas categorias</option>
        {ITEM_CATEGORIES.map((c) => (
          <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
        ))}
      </select>
      <select className={cls} value={tier} onChange={(e) => onTier(e.target.value as ItemTier | "")}>
        <option value="">Todos tiers</option>
        {ITEM_TIERS.map((t) => (
          <option key={t} value={t}>{TIER_LABELS[t]}</option>
        ))}
      </select>
      <select className={cls} value={sort} onChange={(e) => onSort(e.target.value as SortKey)}>
        <option value="recent">Mais recentes</option>
        <option value="name">Nome (A-Z)</option>
        <option value="tier">Tier</option>
      </select>
    </div>
  );
}
