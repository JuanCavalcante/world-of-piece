import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listShopProducts, purchaseShopProduct, type ShopProduct } from "@/lib/tcg/shop";
import { getMyWallet } from "@/lib/tcg/wallet";
import { TcgPageHeader } from "@/components/tcg/tcg-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { rewardToast } from "@/components/tcg/reward-toast";
import { toast } from "sonner";
import { FlaskConical, Package, ShoppingBag, Sparkles } from "lucide-react";

export const Route = createFileRoute("/tcggame/shop")({
  head: () => ({
    meta: [
      { title: "Loja | WOP TCG" },
      {
        name: "description",
        content: "Loja do WOP TCG: troque Essência por Pacotes de Cartas e fortaleça sua coleção.",
      },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ShopProduct | null>(null);

  const productsQuery = useQuery({
    queryKey: ["tcg-shop-products"],
    queryFn: listShopProducts,
    enabled: !!user,
  });
  const walletQuery = useQuery({
    queryKey: ["tcg-wallet", user?.id],
    queryFn: getMyWallet,
    enabled: !!user,
  });

  const essence = walletQuery.data?.essence ?? 0;

  const purchase = useMutation({
    mutationFn: (productId: string) => purchaseShopProduct(productId),
    onSuccess: (result) => {
      rewardToast({
        kind: "shop",
        title: result.product_name,
        packs: result.packs_added,
      });
      queryClient.invalidateQueries({ queryKey: ["tcg-wallet", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["tcg-player", user?.id] });
      setSelected(null);
    },
    onError: (err) => {
      toast.error("Não foi possível concluir a compra.", {
        description: err instanceof Error ? err.message : "Erro desconhecido.",
      });
    },
  });

  if (!user) return null;

  const products = productsQuery.data ?? [];
  const saldoApos = selected ? essence - selected.price_essence : 0;

  return (
    <div className="space-y-6">
      <TcgPageHeader
        eyebrow="Loja"
        title="Pacotes de Cartas"
        description="Troque a Essência acumulada nas batalhas por Pacotes de Cartas."
      />

      {productsQuery.isLoading ? (
        <div className="text-muted-foreground text-sm">Carregando produtos...</div>
      ) : products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          Nenhum produto disponível no momento.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const affordable = essence >= p.price_essence;
            return (
              <div
                key={p.id}
                className="flex flex-col rounded-lg border border-border bg-card overflow-hidden"
              >
                <div className="relative aspect-[16/9] bg-muted/40 flex items-center justify-center">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-14 w-14 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="font-semibold leading-tight">{p.name}</h3>
                  {p.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                  ) : null}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-gold" />
                    Contém {p.pack_size ?? 5} cartas
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="flex items-center gap-1.5 font-bold">
                      <FlaskConical className="h-4 w-4 text-gold" />
                      {p.price_essence.toLocaleString("pt-BR")}{" "}
                      <span className="text-xs font-normal text-muted-foreground">Essência</span>
                    </span>
                    <Button
                      size="sm"
                      variant={affordable ? "default" : "secondary"}
                      onClick={() => setSelected(p)}
                    >
                      Comprar
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && !purchase.isPending && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar compra</DialogTitle>
            <DialogDescription>
              Você está prestes a comprar <strong>{selected?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              {selected.image_url && (
                <img
                  src={selected.image_url}
                  alt={selected.name}
                  className="h-32 w-full rounded-md object-cover"
                />
              )}
              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Você gastará</span>
                  <span className="font-semibold flex items-center gap-1">
                    <FlaskConical className="h-3.5 w-3.5 text-gold" />
                    {selected.price_essence.toLocaleString("pt-BR")} Essência
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seu saldo atual</span>
                  <span>{essence.toLocaleString("pt-BR")}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5">
                  <span className="text-muted-foreground">Saldo após a compra</span>
                  <span className={saldoApos < 0 ? "text-destructive font-semibold" : "font-semibold"}>
                    {saldoApos.toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
              {saldoApos < 0 && (
                <p className="text-sm text-destructive">
                  Essência insuficiente. Você pode obter mais essência extraindo cartas na aba Criação.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelected(null)} disabled={purchase.isPending}>
              Cancelar
            </Button>
            <Button
              disabled={!selected || saldoApos < 0 || purchase.isPending}
              onClick={() => selected && purchase.mutate(selected.id)}
            >
              {purchase.isPending ? "Comprando..." : "Confirmar Compra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
