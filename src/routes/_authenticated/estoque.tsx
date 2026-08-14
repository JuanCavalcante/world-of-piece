import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Package } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { listMyInventory, requestActivation } from "@/lib/inventory/api";
import { InventoryGrid } from "@/components/inventory/InventoryGrid";
import { InventorySearch } from "@/components/inventory/InventorySearch";
import { InventoryFilters, type SortKey } from "@/components/inventory/InventoryFilters";
import { ItemViewerDialog } from "@/components/inventory/ItemViewerDialog";
import { ActivationDialog } from "@/components/inventory/ActivationDialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { ItemCategory, ItemTier, PlayerInventoryRow } from "@/lib/inventory/types";
import { ITEM_TIERS } from "@/lib/inventory/types";

export const Route = createFileRoute("/_authenticated/estoque")({
  component: EstoquePage,
});

function EstoquePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-inventory", user?.id],
    queryFn: () => listMyInventory(user!.id),
    enabled: !!user?.id,
  });

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<ItemCategory | "">("");
  const [tier, setTier] = useState<ItemTier | "">("");
  const [sort, setSort] = useState<SortKey>("recent");

  const [viewRow, setViewRow] = useState<PlayerInventoryRow | null>(null);
  const [activateRow, setActivateRow] = useState<PlayerInventoryRow | null>(null);

  const rows = useMemo(() => {
    let arr = data ?? [];
    if (q) arr = arr.filter((r) => r.item.name.toLowerCase().includes(q.toLowerCase()));
    if (category) arr = arr.filter((r) => r.item.category === category);
    if (tier) arr = arr.filter((r) => r.item.tier === tier);
    if (sort === "name") arr = [...arr].sort((a, b) => a.item.name.localeCompare(b.item.name));
    else if (sort === "tier") {
      const rank = (t: ItemTier) => ITEM_TIERS.indexOf(t);
      arr = [...arr].sort((a, b) => rank(b.item.tier) - rank(a.item.tier));
    }
    return arr;
  }, [data, q, category, tier, sort]);

  const activate = useMutation({
    mutationFn: (v: { characterId: string; characterName: string; quantity: number }) =>
      requestActivation(activateRow!.id, v.characterId, v.characterName, v.quantity),
    onSuccess: () => {
      toast.success("Solicitação enviada. Aguarde a aprovação do administrador.");
      setActivateRow(null);
      qc.invalidateQueries({ queryKey: ["my-inventory", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <p className="text-[11px] tracking-[0.3em] text-gold/70 uppercase mb-3">Estoque Pessoal</p>
      <h1 className="font-display text-3xl lg:text-4xl tracking-wide mb-2">Meus Itens</h1>
      <p className="text-parchment/60 max-w-2xl mb-8 text-sm">
        Itens obtidos no leilão que ainda não foram incorporados oficialmente à sua ficha no Firecast.
        Solicite a ativação para que um administrador entregue-os no jogo.
      </p>

      <div className="flex flex-wrap gap-3 mb-6">
        <InventorySearch value={q} onChange={setQ} />
        <InventoryFilters
          category={category} tier={tier} sort={sort}
          onCategory={setCategory} onTier={setTier} onSort={setSort}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="aspect-video bg-sea-surface/40" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="border border-gold/15 border-dashed rounded-sm p-12 text-center">
          <Package className="size-10 text-parchment/30 mx-auto mb-3" />
          <p className="text-parchment/70 text-sm">
            {(data?.length ?? 0) === 0
              ? "Seu estoque está vazio. Itens adquiridos no leilão aparecerão aqui."
              : "Nenhum item corresponde aos filtros aplicados."}
          </p>
        </div>
      ) : (
        <InventoryGrid rows={rows} onView={setViewRow} onActivate={setActivateRow} />
      )}

      <ItemViewerDialog
        row={viewRow}
        open={!!viewRow}
        onOpenChange={(o) => !o && setViewRow(null)}
      />
      <ActivationDialog
        row={activateRow}
        open={!!activateRow}
        onOpenChange={(o) => !o && setActivateRow(null)}
        onConfirm={(v) => activate.mutate(v)}
        pending={activate.isPending}
      />
    </div>
  );
}
