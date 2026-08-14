import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listCatalog } from "@/lib/inventory/api";
import { InventoryFilters, type SortKey } from "@/components/inventory/InventoryFilters";
import { createItem, updateItem, deleteItem, type ItemPatch } from "@/lib/inventory/admin";
import {
  CATEGORY_LABELS, ITEM_CATEGORIES, ITEM_TIERS, TIER_LABELS, TIER_STYLES,
  type InventoryItem, type ItemCategory, type ItemTier,
} from "@/lib/inventory/types";

export const Route = createFileRoute("/admin/items")({
  component: AdminItemsPage,
});

function emptyPatch(): ItemPatch {
  return { name: "", description: "", image_url: "", category: "OUTRO", tier: "TIER_I", stackable: true };
}

export function AdminItemsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-catalog"], queryFn: listCatalog });

  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ItemCategory | "">("");
  const [tier, setTier] = useState<ItemTier | "">("");
  const [sort, setSort] = useState<SortKey>("name");

  const filtered = (data ?? [])
    .filter((it) => (category ? it.category === category : true))
    .filter((it) => (tier ? it.tier === tier : true))
    .filter((it) =>
      search.trim()
        ? `${it.name} ${it.description ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())
        : true,
    )
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "tier") return ITEM_TIERS.indexOf(a.tier) - ITEM_TIERS.indexOf(b.tier) || a.name.localeCompare(b.name);
      return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
    });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-catalog"] });

  const createMut = useMutation({
    mutationFn: (p: ItemPatch) => createItem(p),
    onSuccess: () => { toast.success("Item criado"); setCreating(false); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ItemPatch }) => updateItem(id, patch),
    onSuccess: () => { toast.success("Item atualizado"); setEditing(null); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onSuccess: () => { toast.success("Item removido"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-[11px] tracking-[0.3em] text-gold/70 uppercase mb-2">Administração</p>
          <h1 className="font-display text-2xl lg:text-3xl tracking-wide">Catálogo de Itens</h1>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="size-4" /> Novo item
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar item..."
          className="bg-sea-surface/60 border border-gold/15 px-3 py-2 text-xs rounded-sm focus:outline-none focus:border-gold text-parchment min-w-[220px]"
        />
        <InventoryFilters
          category={category}
          tier={tier}
          sort={sort}
          onCategory={setCategory}
          onTier={setTier}
          onSort={setSort}
        />
        <span className="text-[11px] text-parchment/50 ml-auto">{filtered.length} item(ns)</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 bg-sea-surface/40" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="border border-gold/15 border-dashed rounded-sm p-12 text-center text-sm text-parchment/60">
          Nenhum item encontrado.
        </div>
      ) : (
        <div className="border border-gold/15 rounded-sm overflow-hidden">
          {filtered.map((it) => {
            const s = TIER_STYLES[it.tier];
            return (
              <div key={it.id} className="grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center px-3 py-2.5 border-t border-gold/10 first:border-t-0 text-sm">
                <div className={`size-12 border ${s.border} bg-sea-deep/60 rounded-sm overflow-hidden flex items-center justify-center`}>
                  {it.image_url ? <img src={it.image_url} alt="" className="w-full h-full object-cover" /> : <Package className="size-4 text-parchment/40" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate">{it.name}</p>
                  <p className="text-[11px] text-parchment/50">
                    <span className={s.text}>{TIER_LABELS[it.tier]}</span> · {CATEGORY_LABELS[it.category]}
                  </p>
                </div>
                <button
                  onClick={() => setEditing(it)}
                  className="p-1.5 border border-gold/40 rounded-sm text-gold hover:bg-gold/10"
                  title="Editar"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => confirm(`Excluir "${it.name}"?`) && deleteMut.mutate(it.id)}
                  disabled={deleteMut.isPending}
                  className="p-1.5 border border-red-500/40 text-red-400 rounded-sm hover:bg-red-500/10 disabled:opacity-40"
                  title="Excluir"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <ItemFormDialog
        open={creating}
        onOpenChange={setCreating}
        title="Novo item"
        initial={emptyPatch()}
        pending={createMut.isPending}
        onSubmit={(p) => createMut.mutate(p)}
      />
      <ItemFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Editar item"
        initial={editing ?? emptyPatch()}
        pending={updateMut.isPending}
        onSubmit={(p) => editing && updateMut.mutate({ id: editing.id, patch: p })}
      />
    </div>
  );
}

function ItemFormDialog({
  open, onOpenChange, title, initial, onSubmit, pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  initial: ItemPatch | InventoryItem;
  onSubmit: (p: ItemPatch) => void;
  pending?: boolean;
}) {
  const initialId = (initial as InventoryItem).id ?? "new";
  const [form, setForm] = useState<ItemPatch>(() => ({
    name: initial.name ?? "",
    description: initial.description ?? "",
    image_url: initial.image_url ?? "",
    category: (initial.category as ItemCategory) ?? "OUTRO",
    tier: (initial.tier as ItemTier) ?? "TIER_I",
    stackable: initial.stackable ?? true,
  }));

  // Sync form when opening the dialog or switching between items.
  useEffect(() => {
    if (!open) return;
    setForm({
      name: initial.name ?? "",
      description: initial.description ?? "",
      image_url: initial.image_url ?? "",
      category: (initial.category as ItemCategory) ?? "OUTRO",
      tier: (initial.tier as ItemTier) ?? "TIER_I",
      stackable: initial.stackable ?? true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="font-display tracking-wide">{title}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">URL da imagem</Label>
            <Input value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ItemCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ITEM_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Tier</Label>
              <Select value={form.tier} onValueChange={(v) => setForm({ ...form, tier: v as ItemTier })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ITEM_TIERS.map((t) => <SelectItem key={t} value={t}>{TIER_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Descrição</Label>
            <Textarea rows={5} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={form.stackable}
              onChange={(e) => setForm({ ...form, stackable: e.target.checked })}
              className="accent-gold size-4"
            />
            Stackable (permite empilhar quantidades)
          </label>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button
            disabled={pending || !form.name?.trim()}
            onClick={() => onSubmit({ ...form, image_url: form.image_url?.trim() || null })}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
