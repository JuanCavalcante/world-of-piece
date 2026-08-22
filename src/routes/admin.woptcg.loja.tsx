import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDevPanel } from "@/hooks/use-dev";
import { AccessDenied } from "./admin.woptcg";
import {
  listShopProducts,
  adminSaveShopProduct,
  adminDeleteShopProduct,
  adminToggleShopProduct,
  type ShopProduct,
  type ShopProductDraft,
} from "@/lib/tcg/shop";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { FlaskConical, Package, Pencil, Plus, Power, ShoppingBag, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/woptcg/loja")({
  component: LojaAdmin,
});

type DraftState = ShopProductDraft & { starts_at: string; ends_at: string };

const emptyDraft: DraftState = {
  name: "",
  description: "",
  image_url: "",
  pack_size: 5,
  price_essence: 100,
  sort_order: 0,
  active: true,
  starts_at: "",
  ends_at: "",
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function LojaAdmin() {
  const { isDev, devReady } = useDevPanel();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<DraftState | null>(null);

  const productsQuery = useQuery({
    queryKey: ["tcg-shop-admin"],
    queryFn: listShopProducts,
    enabled: devReady && isDev,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["tcg-shop-admin"] });
    queryClient.invalidateQueries({ queryKey: ["tcg-shop-products"] });
  };

  const save = useMutation({
    mutationFn: (draft: DraftState) =>
      adminSaveShopProduct({
        ...draft,
        starts_at: fromLocalInput(draft.starts_at),
        ends_at: fromLocalInput(draft.ends_at),
      }),
    onSuccess: () => {
      toast.success("Produto salvo.");
      invalidate();
      setEditing(null);
    },
    onError: (err) =>
      toast.error("Falha ao salvar o produto.", {
        description: err instanceof Error ? err.message : "Erro desconhecido.",
      }),
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      adminToggleShopProduct(id, active),
    onSuccess: () => {
      toast.success("Produto atualizado.");
      invalidate();
    },
    onError: (err) =>
      toast.error("Falha ao atualizar o produto.", {
        description: err instanceof Error ? err.message : "Erro desconhecido.",
      }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteShopProduct(id),
    onSuccess: () => {
      toast.success("Produto excluído.");
      invalidate();
    },
    onError: (err) =>
      toast.error("Falha ao excluir o produto.", {
        description: err instanceof Error ? err.message : "Erro desconhecido.",
      }),
  });

  if (!devReady) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;
  if (!isDev) return <AccessDenied />;

  const products = productsQuery.data ?? [];

  const openEdit = (p: ShopProduct) =>
    setEditing({
      id: p.id,
      name: p.name,
      description: p.description,
      image_url: p.image_url ?? "",
      pack_size: p.pack_size ?? 5,
      price_essence: p.price_essence,
      sort_order: p.sort_order,
      active: p.active,
      starts_at: toLocalInput(p.starts_at),
      ends_at: toLocalInput(p.ends_at),
    });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <ShoppingBag className="h-5 w-5" /> Loja do TCG
          </h1>
          <p className="text-sm text-muted-foreground">
            Produtos vendidos por Essência. Mudanças de ativação e preço entram em vigor imediatamente.
          </p>
        </div>
        <Button onClick={() => setEditing({ ...emptyDraft })}>
          <Plus className="mr-2 h-4 w-4" /> Novo produto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produtos</CardTitle>
          <CardDescription>
            A RLS da loja exibe aos jogadores somente produtos ativos dentro da janela de disponibilidade.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {productsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum produto cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Cartas</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Ordem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="h-10 w-16 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-16 items-center justify-center rounded bg-muted">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {p.description}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{p.pack_size ?? 5}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1">
                        <FlaskConical className="h-3.5 w-3.5" />
                        {p.price_essence.toLocaleString("pt-BR")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{p.sort_order}</TableCell>
                    <TableCell>
                      <Badge variant={p.active ? "default" : "secondary"}>
                        {p.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title={p.active ? "Desativar" : "Ativar"}
                          onClick={() => toggle.mutate({ id: p.id, active: !p.active })}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Excluir"
                          onClick={() => {
                            if (confirm(`Excluir "${p.name}"? Esta ação não pode ser desfeita.`)) {
                              remove.mutate(p.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar produto" : "Novo produto"}</DialogTitle>
            <DialogDescription>
              Pacotes de cartas: cada pacote aberto entrega 5 cartas (tcg_open_pack).
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 py-2">
              <div className="grid gap-1.5">
                <Label htmlFor="shop-name">Nome</Label>
                <Input
                  id="shop-name"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Pack Básico"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="shop-desc">Descrição</Label>
                <Textarea
                  id="shop-desc"
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Contém 5 cartas aleatórias."
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="shop-img">Imagem (URL)</Label>
                <Input
                  id="shop-img"
                  value={editing.image_url}
                  onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                  placeholder="https://..."
                />
                {editing.image_url && (
                  <img
                    src={editing.image_url}
                    alt="Pré-visualização"
                    className="mt-1 h-24 w-full rounded-md object-cover"
                  />
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="shop-price">Preço (Essência)</Label>
                  <Input
                    id="shop-price"
                    type="number"
                    min={1}
                    value={editing.price_essence}
                    onChange={(e) =>
                      setEditing({ ...editing, price_essence: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="shop-size">Cartas por pack</Label>
                  <Input
                    id="shop-size"
                    type="number"
                    min={1}
                    value={editing.pack_size}
                    onChange={(e) => setEditing({ ...editing, pack_size: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="shop-order">Ordem</Label>
                  <Input
                    id="shop-order"
                    type="number"
                    value={editing.sort_order}
                    onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="shop-start">Disponível a partir de</Label>
                  <Input
                    id="shop-start"
                    type="datetime-local"
                    value={editing.starts_at}
                    onChange={(e) => setEditing({ ...editing, starts_at: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="shop-end">Disponível até</Label>
                  <Input
                    id="shop-end"
                    type="datetime-local"
                    value={editing.ends_at}
                    onChange={(e) => setEditing({ ...editing, ends_at: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={editing.active}
                  onCheckedChange={(v) => setEditing({ ...editing, active: v === true })}
                />
                Produto ativo na loja
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={save.isPending}>
              Cancelar
            </Button>
            <Button
              disabled={save.isPending}
              onClick={() => editing && save.mutate(editing)}
            >
              {save.isPending ? "Salvando..." : "Salvar produto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
