import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Lock, Search, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { TcgPageHeader } from "@/components/tcg/tcg-shell";
import {
  listCards,
  listMyCards,
  openPack,
  type DailyRewardCard,
  RARITIES,
  RARITY_LABEL,
  RARITY_STYLE,
  type Rarity,
  type TcgCard,
} from "@/lib/tcg/api";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CardCost } from "@/components/tcg/card-cost";
import { TiltCard } from "@/components/tcg/tilt-card";
import { CardSortSelect, sortCards, type CardSort } from "@/lib/tcg/sort";
import { OpenPackButton, PackRevealDialog } from "@/components/tcg/pack-reveal";
import { ensureTcgPlayer } from "@/lib/tcg/api";
import { audioManager } from "@/lib/audio-manager";
import { toast } from "sonner";

export const Route = createFileRoute("/tcggame/cards")({
  head: () => ({
    meta: [
      { title: "Cartas — WOP TCG" },
      { name: "description", content: "Sua coleção de cartas do card game World of Piece." },
      { property: "og:title", content: "Cartas — WOP TCG" },
      { property: "og:description", content: "Sua coleção de cartas do card game World of Piece." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CardsPage,
});

const rarityOf = (c: TcgCard): Rarity =>
  (RARITIES.includes(c.rarity as Rarity) ? c.rarity : "COMUM") as Rarity;

function CardsPage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [rarity, setRarity] = useState<"ALL" | Rarity>("ALL");
  const [owned, setOwned] = useState<"ALL" | "OWNED" | "LOCKED">("ALL");
  const [sort, setSort] = useState<CardSort>("name_asc");
  const [selected, setSelected] = useState<TcgCard | null>(null);
  const [packCards, setPackCards] = useState<DailyRewardCard[] | null>(null);
  const qc = useQueryClient();

  const { data: cards, isLoading } = useQuery({ 
    queryKey: ["tcg-cards", "ACTIVE"], 
    queryFn: () => listCards("ACTIVE") 
  });
  const { data: mine } = useQuery({
    queryKey: ["tcg-my-cards", user?.id],
    queryFn: () => listMyCards(user!.id),
    enabled: !!user?.id,
  });

  const { data: player } = useQuery({
    queryKey: ["tcg-player", user?.id],
    queryFn: ensureTcgPlayer,
    enabled: !!user?.id,
  });

  const openPackMut = useMutation({
    mutationFn: openPack,
    onSuccess: (data) => {
      setPackCards(data);
      audioManager.playSfx("pack-open");
      if (data.some((c) => (c.rarity ?? "").toUpperCase().includes("LEND"))) {
        setTimeout(() => audioManager.playSfx("legendary"), 700);
      }
      qc.invalidateQueries({ queryKey: ["tcg-player", user?.id] });
      qc.invalidateQueries({ queryKey: ["tcg-my-cards", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const qty = useMemo(() => {
    const m = new Map<string, number>();
    (mine ?? []).forEach((r) => m.set(r.card_id, r.quantity));
    return m;
  }, [mine]);

  const filtered = sortCards((cards ?? []).filter((c: TcgCard) => {
    if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (rarity !== "ALL" && rarityOf(c) !== rarity) return false;
    const has = (qty.get(c.id) ?? 0) > 0;
    if (owned === "OWNED" && !has) return false;
    if (owned === "LOCKED" && has) return false;
    return true;
  }), sort);

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-[11px] tracking-widest uppercase border transition-colors ${
      active ? "border-gold/60 text-gold bg-gold/10" : "border-gold/15 text-parchment/60 hover:text-parchment"
    }`;

  return (
    <div>
      <TcgPageHeader
        eyebrow="Coleção"
        title="Cartas"
        description="Toda a sua coleção do WOP TCG. Cartas ainda não obtidas aparecem bloqueadas."
      />

      {/* Filtros */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-parchment/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar carta pelo nome..."
              className="w-full bg-sea-surface/60 border border-gold/15 pl-10 pr-3 py-2.5 text-sm rounded-xl focus:outline-none focus:border-gold"
            />
          </div>
          <CardSortSelect value={sort} onChange={setSort} />
          <OpenPackButton
            packs={player?.packs ?? 0}
            loading={openPackMut.isPending}
            onOpen={() => openPackMut.mutate()}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={chip(rarity === "ALL")} onClick={() => setRarity("ALL")}>
            Todas raridades
          </button>
          {RARITIES.map((r) => (
            <button key={r} className={chip(rarity === r)} onClick={() => setRarity(r)}>
              {RARITY_LABEL[r]}
            </button>
          ))}
          <span className="w-px bg-gold/15 mx-1" />
          <button className={chip(owned === "ALL")} onClick={() => setOwned("ALL")}>
            Todas
          </button>
          <button className={chip(owned === "OWNED")} onClick={() => setOwned("OWNED")}>
            Obtidas
          </button>
          <button className={chip(owned === "LOCKED")} onClick={() => setOwned("LOCKED")}>
            Não obtidas
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[5/7] rounded-2xl bg-sea-surface/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-parchment/50">Nenhuma carta encontrada com esses filtros.</p>
      ) : (
        <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {filtered.map((c: TcgCard) => {
            const n = qty.get(c.id) ?? 0;
            const has = n > 0;
            const r = rarityOf(c);
            return (
              <TiltCard key={c.id}>
              <button
                onClick={() => setSelected(c)}
                className={`group relative w-full text-left rounded-2xl border overflow-hidden bg-sea-surface/40 ${RARITY_STYLE[r]} ${
                  has ? "" : "opacity-80"
                }`}
              >
                <div className="aspect-[5/7] w-full overflow-hidden bg-sea-deep/60 relative">
                  {c.image_url ? (
                    <img
                      src={c.image_url}
                      alt={c.name}
                      loading="lazy"
                      className={`size-full object-cover transition-all duration-500 group-hover:scale-105 ${
                        has ? "" : "grayscale brightness-50"
                      }`}
                    />
                  ) : (
                    <div className="size-full grid place-items-center text-[11px] uppercase text-parchment/30">
                      Sem imagem
                    </div>
                  )}
                  <CardCost cost={c.cost ?? 0} />
                  {has && (
                      <div className="absolute bottom-1 left-1 right-1 bg-black/60 rounded px-1 py-0.5 text-[8px] text-parchment truncate">
                        {c.type} • {c.organization} • {c.race}
                      </div>
                  )}
                </div>

                {!has && (
                  <span className="absolute inset-0 grid place-items-center">
                    <Lock className="size-8 text-parchment/70 drop-shadow" />
                  </span>
                )}

                <span
                  className={`absolute top-2 left-2 px-2 py-1 rounded-full text-[9px] tracking-widest uppercase backdrop-blur ${
                    has ? "bg-gold/20 text-gold border border-gold/40" : "bg-black/50 text-parchment/70 border border-parchment/20"
                  }`}
                >
                  {has ? "Obtida" : "Bloqueada"}
                </span>
                {has && n > 1 && (
                  <span className="absolute top-11 right-2 px-2 py-1 rounded-full text-[9px] bg-black/60 text-parchment border border-gold/30">
                    x{n}
                  </span>
                )}

                <div className="p-3 border-t border-gold/10">
                  <p className="text-sm truncate">{c.name}</p>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-gold/70 mt-1">
                    {RARITY_LABEL[r]} · {c.power} HP · {c.atk ?? 0} ATK
                  </p>
                </div>
              </button>
              </TiltCard>
            );
          })}
        </div>
      )}

      <PackRevealDialog
        cards={packCards}
        catalog={cards ?? []}
        onClose={() => setPackCards(null)}
      />

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl bg-sea-deep border-gold/25 text-parchment p-0 overflow-hidden">
          {selected && (
            <div className="grid md:grid-cols-[minmax(0,320px)_1fr]">
              <div className="bg-sea-surface/40 relative">
                {selected.image_url ? (
                  <img
                    src={selected.image_url}
                    alt={selected.name}
                    className={`w-full h-full object-cover ${
                      (qty.get(selected.id) ?? 0) > 0 ? "" : "grayscale brightness-50"
                    }`}
                  />
                ) : (
                  <div className="aspect-[5/7] grid place-items-center text-parchment/30 text-xs">Sem imagem</div>
                )}
                <CardCost cost={selected.cost ?? 0} />
                 <div className="absolute bottom-2 left-2 right-2 bg-black/70 rounded px-2 py-1 text-[10px] text-parchment text-center">
                    {selected.type} • {selected.organization} • {selected.race}
                </div>
              </div>
              <div className="p-6">
                <button
                  className="absolute right-4 top-4 text-parchment/50 hover:text-gold"
                  onClick={() => setSelected(null)}
                  aria-label="Fechar"
                >
                  <X className="size-4" />
                </button>
                <p className="text-[10px] tracking-[0.3em] uppercase text-gold/70 mb-2">
                  {RARITY_LABEL[rarityOf(selected)]}
                </p>
                <h2 className="font-display text-2xl mb-4">{selected.name}</h2>
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="rounded-xl border border-gold/15 bg-sea-surface/40 p-4">
                    <p className="text-[10px] tracking-widest uppercase text-parchment/50">HP</p>
                    <p className="text-xl">{selected.power}</p>
                  </div>
                  <div className="rounded-xl border border-gold/15 bg-sea-surface/40 p-4">
                    <p className="text-[10px] tracking-widest uppercase text-parchment/50">ATK</p>
                    <p className="text-xl">{selected.atk ?? 0}</p>
                  </div>

                  <div className="rounded-xl border border-gold/15 bg-sea-surface/40 p-4">
                    <p className="text-[10px] tracking-widest uppercase text-parchment/50">MP</p>
                    <p className="text-xl">{selected.cost ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-gold/15 bg-sea-surface/40 p-4">
                    <p className="text-[10px] tracking-widest uppercase text-parchment/50">Quantidade</p>
                    <p className="text-xl">{qty.get(selected.id) ?? 0}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-5">
                    <div className="bg-sea-surface/40 border border-gold/10 rounded p-2 text-center">
                        <p className="text-[8px] uppercase text-parchment/40">Tipo</p>
                        <p className="text-[10px]">{selected.type || "—"}</p>
                    </div>
                    <div className="bg-sea-surface/40 border border-gold/10 rounded p-2 text-center">
                        <p className="text-[8px] uppercase text-parchment/40">Org.</p>
                        <p className="text-[10px]">{selected.organization || "—"}</p>
                    </div>
                    <div className="bg-sea-surface/40 border border-gold/10 rounded p-2 text-center">
                        <p className="text-[8px] uppercase text-parchment/40">Raça</p>
                        <p className="text-[10px]">{selected.race || "—"}</p>
                    </div>
                </div>
                <p className="text-[10px] tracking-widest uppercase text-parchment/50 mb-2">Efeito</p>
                <p className="text-sm text-parchment/80">{selected.effect || "Sem efeito registrado."}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
