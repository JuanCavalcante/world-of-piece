import { Search } from "lucide-react";

export function InventorySearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative flex-1 min-w-[180px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-parchment/40" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar item..."
        className="w-full bg-sea-surface/60 border border-gold/15 pl-10 pr-3 py-2 text-sm rounded-sm focus:outline-none focus:border-gold"
      />
    </div>
  );
}
