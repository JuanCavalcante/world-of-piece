import type { PlayerInventoryRow } from "@/lib/inventory/types";
import { ItemCard } from "./ItemCard";

export function InventoryGrid({
  rows,
  onView,
  onActivate,
}: {
  rows: PlayerInventoryRow[];
  onView: (r: PlayerInventoryRow) => void;
  onActivate: (r: PlayerInventoryRow) => void;
}) {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {rows.map((r) => (
        <ItemCard key={r.id} row={r} onView={() => onView(r)} onActivate={() => onActivate(r)} />
      ))}
    </div>
  );
}
