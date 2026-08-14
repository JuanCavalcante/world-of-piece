import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Image as ImageIcon, Bot } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDevPanel } from "@/lib/admin/base";
import { adminDeleteBanner, adminSaveBanner, adminSetAiBanner, listBanners, type TcgBanner } from "@/lib/tcg/api";

export const Route = createFileRoute("/admin/woptcg/bannerduelo")({
  component: BannersAdmin,
});

export function BannersAdmin() {
  const qc = useQueryClient();
  const isDev = useDevPanel();
  const { data: banners, isLoading } = useQuery({ queryKey: ["tcg-banners"], queryFn: listBanners });

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ id?: string; name: string; image_url: string }>({ name: "", image_url: "" });

  const save = useMutation({
    mutationFn: () => adminSaveBanner(draft),
    onSuccess: () => {
      toast.success("Banner salvo!");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["tcg-banners"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteBanner(id),
    onSuccess: () => {
      toast.success("Banner removido.");
      qc.invalidateQueries({ queryKey: ["tcg-banners"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setAi = useMutation({
    mutationFn: (id: string) => adminSetAiBanner(id),
    onSuccess: () => {
      toast.success("Banner definido para a IA!");
      qc.invalidateQueries({ queryKey: ["tcg-banners"] });
      qc.invalidateQueries({ queryKey: ["tcg-ai-banner"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() {
    setDraft({ name: "", image_url: "" });
    setOpen(true);
  }

  function openEdit(b: TcgBanner) {
    setDraft({ id: b.id, name: b.name, image_url: b.image_url });
    setOpen(true);
  }

  if (!isDev) {
    return (
      <p className="text-sm text-parchment/60">
        Área restrita ao painel de desenvolvedor.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-xl tracking-wide">Banners do duelo</h2>
          <p className="text-xs text-parchment/50 mt-1">
            Cole a URL de uma imagem para criar um banner que os jogadores poderão usar no campo de batalha.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-primary text-[11px] tracking-widest uppercase shrink-0"
        >
          <Plus className="size-4" /> Adicionar Banner
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : !banners?.length ? (
        <div className="rounded-2xl border border-dashed border-gold/25 p-10 text-center text-sm text-parchment/50">
          <ImageIcon className="size-6 mx-auto mb-3 text-gold/40" />
          Nenhum banner cadastrado ainda.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((b) => (
            <div key={b.id} className="rounded-2xl border border-gold/20 bg-sea-surface/40 overflow-hidden">
              <button onClick={() => openEdit(b)} className="relative block w-full h-32 bg-sea-deep/70">
                <img src={b.image_url} alt={b.name} className="size-full object-cover" />
                {b.is_ai && (
                  <span className="absolute top-2 left-2 px-2 py-1 rounded-full text-[9px] tracking-widest uppercase bg-black/60 text-gold border border-gold/40">
                    Banner da IA
                  </span>
                )}
              </button>
              <div className="flex items-center justify-between gap-2 p-3">
                <p className="text-sm text-parchment truncate">{b.name}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setAi.mutate(b.id)}
                    disabled={setAi.isPending || b.is_ai}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-[10px] tracking-widest uppercase transition-colors ${
                      b.is_ai
                        ? "border-gold/60 text-gold bg-gold/10 cursor-default"
                        : "border-gold/30 text-parchment/70 hover:text-gold hover:bg-gold/10"
                    }`}
                    title="Usar este banner no campo da IA"
                  >
                    <Bot className="size-4" /> {b.is_ai ? "Em uso" : "Usar na IA"}
                  </button>
                  <button
                    onClick={() => remove.mutate(b.id)}
                    className="p-2 rounded-lg border border-wop-red/40 text-wop-red hover:bg-wop-red/10"
                    title="Remover banner"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? "Editar banner" : "Adicionar Banner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] tracking-[0.25em] uppercase text-gold/70 mb-2">Nome</label>
              <input
                value={draft.name}
                maxLength={40}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                className="w-full rounded-xl bg-sea-deep/60 border border-gold/20 px-4 py-2.5 text-sm text-parchment outline-none focus:border-gold/60"
                placeholder="Ex.: Marineford"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.25em] uppercase text-gold/70 mb-2">URL da imagem</label>
              <input
                value={draft.image_url}
                onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))}
                className="w-full rounded-xl bg-sea-deep/60 border border-gold/20 px-4 py-2.5 text-sm text-parchment outline-none focus:border-gold/60"
                placeholder="https://..."
              />
            </div>
            {draft.image_url ? (
              <div className="h-36 rounded-xl overflow-hidden border border-gold/20 bg-sea-deep/70">
                <img src={draft.image_url} alt="Prévia do banner" className="size-full object-cover" />
              </div>
            ) : null}
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-primary text-[11px] tracking-widest uppercase disabled:opacity-50"
            >
              {save.isPending ? "Salvando..." : "Salvar banner"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
