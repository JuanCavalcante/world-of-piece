import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Store,
  Package,
  ArrowLeftRight,
  Inbox,
  Send,
  FlaskConical,
  X,
  Check,
  Tag,
  Plus,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { TcgPageHeader } from "@/components/tcg/tcg-shell";
import { TiltCard } from "@/components/tcg/tilt-card";
import { CardCost } from "@/components/tcg/card-cost";
import { useProgression } from "@/hooks/use-progression";
import { toast } from "sonner";
import { rewardToast } from "@/components/tcg/reward-toast";
import { cn } from "@/lib/utils";
import {
  listCards,
  listMyCards,
  listMyDecks,
  RARITIES,
  RARITY_LABEL,
  RARITY_STYLE,
  type Rarity,
  type TcgCard,
} from "@/lib/tcg/api";
import { getMyWallet } from "@/lib/tcg/wallet";
import {
  acceptTradeOffer,
  buyListing,
  cancelListing,
  createListing,
  createTradeOffer,
  declineTradeOffer,
  listMarketListings,
  listMyListings,
  listReceivedTradeOffers,
  listSentTradeOffers,
  type ListingKind,
  type MarketListing,
  type TradeOffer,
} from "@/lib/tcg/market";

export const Route = createFileRoute("/tcggame/trade")({
  head: () => ({
    meta: [
      { title: "Trocas — WOP TCG" },
      { name: "description", content: "Compre, venda e troque cartas no mercado de essência do WOP TCG." },
      { property: "og:title", content: "Trocas — WOP TCG" },
      { property: "og:description", content: "Compre, venda e troque cartas no mercado de essência do WOP TCG." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TradePage,
});

type TradeTab = "market" | "listings" | "received" | "sent";

const rarityOf = (c: TcgCard): Rarity =>
  (RARITIES.includes(c.rarity as Rarity) ? c.rarity : "COMUM") as Rarity;

function TradePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const progression = useProgression();
  const [tab, setTab] = useState<TradeTab>("market");
  const [rarityFilter, setRarityFilter] = useState<Rarity | "ALL">("ALL");
  const [priceSort, setPriceSort] = useState<"recent" | "low" | "high">("recent");

  const invalidateTrade = () => {
    qc.invalidateQueries({ queryKey: ["tcg-wallet", user?.id] });
    qc.invalidateQueries({ queryKey: ["tcg-my-cards", user?.id] });
    qc.invalidateQueries({ queryKey: ["tcg-market-listings"] });
    qc.invalidateQueries({ queryKey: ["tcg-my-listings", user?.id] });
    qc.invalidateQueries({ queryKey: ["tcg-received-offers", user?.id] });
    qc.invalidateQueries({ queryKey: ["tcg-sent-offers", user?.id] });
    qc.invalidateQueries({ queryKey: ["tcg-player", user?.id] });
  };

  const { data: wallet } = useQuery({
    queryKey: ["tcg-wallet", user?.id],
    queryFn: getMyWallet,
    enabled: !!user?.id,
  });
  const { data: cards } = useQuery({
    queryKey: ["tcg-cards", "ACTIVE"],
    queryFn: () => listCards("ACTIVE"),
  });
  const { data: mine } = useQuery({
    queryKey: ["tcg-my-cards", user?.id],
    queryFn: () => listMyCards(user!.id),
    enabled: !!user?.id,
  });
  const { data: decks } = useQuery({
    queryKey: ["tcg-my-decks", user?.id],
    queryFn: () => listMyDecks(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });
  const { data: market } = useQuery({
    queryKey: ["tcg-market-listings"],
    queryFn: listMarketListings,
    staleTime: 15_000,
  });
  const { data: myListings } = useQuery({
    queryKey: ["tcg-my-listings", user?.id],
    queryFn: () => listMyListings(user!.id),
    enabled: !!user?.id,
  });
  const { data: received } = useQuery({
    queryKey: ["tcg-received-offers", user?.id],
    queryFn: () => listReceivedTradeOffers(user!.id),
    enabled: !!user?.id,
    staleTime: 15_000,
  });
  const { data: sent } = useQuery({
    queryKey: ["tcg-sent-offers", user?.id],
    queryFn: () => listSentTradeOffers(user!.id),
    enabled: !!user?.id,
  });

  const essence = wallet?.essence ?? 0;

  const ownedMap = useMemo(() => {
    const m = new Map<string, number>();
    (mine ?? []).forEach((r) => m.set(r.card_id, r.quantity));
    return m;
  }, [mine]);

  const cardById = useMemo(() => {
    const m = new Map<string, TcgCard>();
    (cards ?? []).forEach((c) => m.set(c.id, c));
    return m;
  }, [cards]);

  const reserved = useMemo(() => {
    const m = new Map<string, number>();
    (decks ?? []).forEach((d) =>
      d.cards.forEach((c) => m.set(c.card_id, (m.get(c.card_id) ?? 0) + c.quantity)),
    );
    return m;
  }, [decks]);

  const availOf = (cardId: string) => (ownedMap.get(cardId) ?? 0) - (reserved.get(cardId) ?? 0);

  /** Cartas elegíveis: pelo menos 2 cópias disponíveis (fora de baralhos / não bloqueadas). */
  const eligibleCards = useMemo(
    () => (cards ?? []).filter((c) => availOf(c.id) >= 2),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards, ownedMap, reserved],
  );

  const filteredMarket = useMemo(() => {
    let list = market ?? [];
    if (rarityFilter !== "ALL") list = list.filter((l) => l.card && rarityOf(l.card) === rarityFilter);
    if (priceSort === "low")
      list = [...list].sort((a, b) => (a.price_essence ?? Infinity) - (b.price_essence ?? Infinity));
    else if (priceSort === "high")
      list = [...list].sort((a, b) => (b.price_essence ?? -1) - (a.price_essence ?? -1));
    return list;
  }, [market, rarityFilter, priceSort]);

  /* ---- mutations ---- */
  const [buyTarget, setBuyTarget] = useState<MarketListing | null>(null);

  const buyMut = useMutation({
    mutationFn: (id: string) => buyListing(id),
    onSuccess: (d) => {
      rewardToast({ kind: "market-sold", title: `${d.name} · -${d.price} essência` });
      setBuyTarget(null);
      invalidateTrade();
      void progression.counter("MARKET_PURCHASES", 1).then(() => progression.sync());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelListing(id),
    onSuccess: () => {
      toast.success("Anúncio cancelado.");
      invalidateTrade();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const acceptMut = useMutation({
    mutationFn: (id: string) => acceptTradeOffer(id),
    onSuccess: () => {
      rewardToast({ kind: "trade-accepted", title: "Troca concluída!" });
      invalidateTrade();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const declineMut = useMutation({
    mutationFn: (id: string) => declineTradeOffer(id),
    onSuccess: () => {
      toast.success("Oferta recusada.");
      invalidateTrade();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [tradeTarget, setTradeTarget] = useState<MarketListing | null>(null);

  const offerMut = useMutation({
    mutationFn: ({ listingId, cardIds }: { listingId: string; cardIds: string[] }) =>
      createTradeOffer(listingId, cardIds),
    onSuccess: (d) => {
      rewardToast({ kind: "trade-received", title: `Oferta enviada · ${d.count} carta(s)` });
      setTradeTarget(null);
      invalidateTrade();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const receivedCount = received?.length ?? 0;
  const activeListings = (myListings ?? []).filter((l) => l.status === "ACTIVE");
  const TABS: { id: TradeTab; label: string; icon: typeof Store; badge?: number }[] = [
    { id: "market", label: "Mercado", icon: Store },
    { id: "listings", label: "Meus Anúncios", icon: Package },
    { id: "received", label: "Ofertas Recebidas", icon: Inbox, badge: receivedCount },
    { id: "sent", label: "Minhas Ofertas", icon: Send },
  ];

  return (
    <div>
      <TcgPageHeader
        eyebrow="Trocas"
        title="Mercado de Essência"
        description="Compre cartas com essência, anuncie suas excedentes e proponha trocas com outros jogadores."
      />

      {/* Essence balance */}
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/10 px-4 py-3 w-fit">
        <FlaskConical className="size-4 text-fuchsia-400" />
        <span className="text-xs tracking-widest uppercase text-fuchsia-300">Essência</span>
        <span className="font-display text-fuchsia-300 tabular-nums">{essence}</span>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => {
          const active = t.id === tab;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs tracking-widest uppercase transition-all",
                active
                  ? "border-gold/50 bg-sea-surface/60 text-gold"
                  : "border-gold/15 bg-sea-surface/20 text-parchment/60 hover:border-gold/30 hover:text-parchment",
              )}
            >
              <Icon className="size-4" />
              {t.label}
              {t.badge ? (
                <span className="ml-1 grid place-items-center min-w-5 h-5 px-1 rounded-full bg-gold/20 text-[10px] text-gold">
                  {t.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* MARKET */}
      {tab === "market" && (
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={rarityFilter === "ALL"} onClick={() => setRarityFilter("ALL")} label="Todas" />
              {RARITIES.map((r) => (
                <FilterChip
                  key={r}
                  active={rarityFilter === r}
                  onClick={() => setRarityFilter(r)}
                  label={RARITY_LABEL[r]}
                />
              ))}
            </div>
            <div className="flex gap-1.5 ml-auto">
              <FilterChip active={priceSort === "recent"} onClick={() => setPriceSort("recent")} label="Recentes" />
              <FilterChip active={priceSort === "low"} onClick={() => setPriceSort("low")} label="Menor preço" />
              <FilterChip active={priceSort === "high"} onClick={() => setPriceSort("high")} label="Maior preço" />
            </div>
          </div>

          {filteredMarket.length === 0 ? (
            <Empty icon={Store} text="Nenhum anúncio ativo no mercado agora." />
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {filteredMarket.map((l) => (
                <MarketCard
                  key={l.id}
                  listing={l}
                  essence={essence}
                  mine={l.seller_id === user?.id}
                  onBuy={() => setBuyTarget(l)}
                  onTrade={() => setTradeTarget(l)}
                  onCancel={() => cancelMut.mutate(l.id)}
                  busy={buyMut.isPending || cancelMut.isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Buy confirmation modal */}
      {buyTarget && (
        <BuyConfirmModal
          listing={buyTarget}
          essence={essence}
          busy={buyMut.isPending}
          onConfirm={() => buyMut.mutate(buyTarget.id)}
          onClose={() => setBuyTarget(null)}
        />
      )}

      {/* Trade offer modal */}
      {tradeTarget && (
        <TradeOfferModal
          listing={tradeTarget}
          eligibleCards={eligibleCards}
          availOf={availOf}
          onSubmit={(cardIds) => offerMut.mutate({ listingId: tradeTarget.id, cardIds })}
          onClose={() => setTradeTarget(null)}
          busy={offerMut.isPending}
        />
      )}

      {/* MY LISTINGS */}
      {tab === "listings" && (
        <div>
          <CreateListingForm
            eligibleCards={eligibleCards}
            availOf={availOf}
            onCreated={() => invalidateTrade()}
          />

          <h3 className="font-display text-lg text-parchment mt-8 mb-4">Anúncios ativos</h3>
          {activeListings.length > 0 ? (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {activeListings.map((l) => (
                <MyListingCard
                  key={l.id}
                  listing={l}
                  onCancel={() => cancelMut.mutate(l.id)}
                  busy={cancelMut.isPending}
                />
              ))}
            </div>
          ) : (
            <Empty icon={Package} text="Você não tem anúncios ativos." />
          )}
        </div>
      )}

      {/* RECEIVED OFFERS */}
      {tab === "received" && (
        <div>
          {received && received.length > 0 ? (
            <div className="space-y-4">
              {received.map((o) => (
                <OfferRow
                  key={o.id}
                  offer={o}
                  cardById={cardById}
                  wantedLabel="Seu anúncio"
                  offeredLabel="Oferecem"
                  actions={
                    <div className="flex gap-2 sm:ml-auto">
                      <button
                        onClick={() => acceptMut.mutate(o.id)}
                        disabled={acceptMut.isPending || declineMut.isPending}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/40 px-4 py-2 text-[10px] tracking-widest uppercase text-emerald-300 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                      >
                        <Check className="size-3.5" /> Aceitar
                      </button>
                      <button
                        onClick={() => declineMut.mutate(o.id)}
                        disabled={acceptMut.isPending || declineMut.isPending}
                        className="flex items-center gap-1.5 rounded-lg bg-rose-500/15 border border-rose-400/40 px-4 py-2 text-[10px] tracking-widest uppercase text-rose-300 hover:bg-rose-500/25 transition-colors disabled:opacity-50"
                      >
                        <X className="size-3.5" /> Recusar
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          ) : (
            <Empty icon={Inbox} text="Nenhuma oferta de troca recebida." />
          )}
        </div>
      )}

      {/* SENT OFFERS */}
      {tab === "sent" && (
        <div>
          {sent && sent.length > 0 ? (
            <div className="space-y-3">
              {sent.map((o) => (
                <OfferRow
                  key={o.id}
                  offer={o}
                  cardById={cardById}
                  wantedLabel="Pedi"
                  offeredLabel="Ofereci"
                  actions={
                    <span
                      className={cn(
                        "sm:ml-auto text-[10px] tracking-widest uppercase",
                        o.status === "ACCEPTED"
                          ? "text-emerald-400"
                          : o.status === "DECLINED"
                            ? "text-rose-400"
                            : "text-gold/70",
                      )}
                    >
                      {o.status}
                    </span>
                  }
                />
              ))}
            </div>
          ) : (
            <Empty icon={Send} text="Você não enviou ofertas de troca." />
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Market card ---------- */
function MarketCard({
  listing,
  essence,
  mine,
  onBuy,
  onTrade,
  onCancel,
  busy,
}: {
  listing: MarketListing;
  essence: number;
  mine: boolean;
  onBuy: () => void;
  onTrade: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const card = listing.card;
  const r = card ? rarityOf(card) : "COMUM";
  const isSale = listing.kind === "SALE";
  const price = listing.price_essence ?? 0;
  const affordable = essence >= price;
  return (
    <TiltCard>
      <div className={cn("relative rounded-2xl border overflow-hidden bg-sea-surface/40", RARITY_STYLE[r])}>
        <div className="aspect-[5/7] w-full overflow-hidden bg-sea-deep/60 relative">
          {card?.image_url ? (
            <img src={card.image_url} alt={card.name} loading="lazy" className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-[11px] uppercase text-parchment/30">Sem imagem</div>
          )}
          {card && <CardCost cost={card.cost ?? 0} />}
          <span
            className={cn(
              "absolute top-2 right-2 px-2 py-1 rounded-full text-[9px] tracking-widest uppercase border",
              isSale
                ? "bg-black/60 border-fuchsia-400/40 text-fuchsia-300"
                : "bg-black/60 border-sky-400/40 text-sky-300",
            )}
          >
            {isSale ? "Venda" : "Troca"}
          </span>
          {mine && (
            <span className="absolute top-2 left-2 px-2 py-1 rounded-full text-[9px] tracking-widest uppercase bg-black/60 border border-gold/40 text-gold">
              Seu
            </span>
          )}
        </div>
        <div className="p-3 border-t border-gold/10">
          <p className="text-sm truncate">{card?.name ?? "Carta"}</p>
          <p className="text-[10px] tracking-[0.2em] uppercase text-gold/60 mt-0.5">{RARITY_LABEL[r]}</p>
          {listing.seller_name && <p className="text-[10px] text-parchment/40 mt-1">por {listing.seller_name}</p>}
          <div className="flex items-center justify-between gap-2 mt-3">
            {isSale ? (
              <span className="flex items-center gap-1 text-sm font-display text-fuchsia-300">
                <FlaskConical className="size-3.5" /> {price}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] tracking-widest uppercase text-sky-300">
                <ArrowLeftRight className="size-3.5" /> Só troca
              </span>
            )}
            {mine ? (
              <button
                onClick={onCancel}
                disabled={busy}
                className="flex items-center gap-1 rounded-lg bg-sea-deep/60 border border-rose-400/30 px-3 py-1.5 text-[10px] tracking-widest uppercase text-rose-300 hover:bg-rose-500/15 transition-colors disabled:opacity-50"
              >
                <X className="size-3" /> Cancelar
              </button>
            ) : (
              <div className="flex gap-1.5">
                <button
                  onClick={onTrade}
                  disabled={busy}
                  className="rounded-lg bg-sea-deep/60 border border-sky-400/30 px-2.5 py-1.5 text-[10px] tracking-widest uppercase text-sky-300 hover:bg-sky-500/15 hover:border-sky-400/50 transition-colors disabled:opacity-50"
                  title="Propor troca"
                >
                  <ArrowLeftRight className="size-3.5" />
                </button>
                {isSale && (
                  <button
                    onClick={onBuy}
                    disabled={!affordable || busy}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-[10px] tracking-widest uppercase transition-colors",
                      affordable
                        ? "bg-gradient-primary text-black hover:-translate-y-0.5"
                        : "bg-sea-deep/60 border border-gold/15 text-gold/40 cursor-not-allowed",
                    )}
                  >
                    Comprar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </TiltCard>
  );
}

/* ---------- Buy confirmation ---------- */
function BuyConfirmModal({
  listing,
  essence,
  busy,
  onConfirm,
  onClose,
}: {
  listing: MarketListing;
  essence: number;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const card = listing.card;
  const price = listing.price_essence ?? 0;
  const after = essence - price;
  const enough = after >= 0;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-gold/25 bg-sea-surface/95 backdrop-blur-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl text-parchment">Confirmar compra</h3>
          <button onClick={onClose} className="text-parchment/50 hover:text-parchment">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex items-center gap-4 mb-5">
          <div
            className={cn(
              "w-20 aspect-[5/7] rounded-lg overflow-hidden border bg-sea-deep/60 shrink-0",
              card ? RARITY_STYLE[rarityOf(card)] : "",
            )}
          >
            {card?.image_url ? (
              <img src={card.image_url} alt={card.name} className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-parchment/30 text-[9px]">?</div>
            )}
          </div>
          <div>
            <p className="text-base text-parchment">{card?.name ?? "Carta"}</p>
            {card && <p className="text-[10px] uppercase tracking-widest text-gold/60">{RARITY_LABEL[rarityOf(card)]}</p>}
            {listing.seller_name && <p className="text-[10px] text-parchment/40 mt-1">de {listing.seller_name}</p>}
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-gold/15 bg-sea-deep/40 p-4 text-sm">
          <Row label="Preço" value={`${price}`} />
          <Row label="Sua essência" value={`${essence}`} />
          <Row label="Após a compra" value={`${enough ? after : "—"}`} danger={!enough} />
        </div>

        {!enough && <p className="mt-3 text-xs text-rose-400">Essência insuficiente para esta compra.</p>}

        <div className="mt-5 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-gold/20 px-4 py-2.5 text-[11px] tracking-widest uppercase text-parchment/70 hover:text-parchment"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={!enough || busy}
            className="rounded-xl bg-gradient-primary px-5 py-2.5 text-[11px] font-bold tracking-widest uppercase text-black hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Confirmar compra
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-parchment/60">{label}</span>
      <span
        className={cn(
          "flex items-center gap-1 font-display tabular-nums",
          danger ? "text-rose-400" : "text-fuchsia-300",
        )}
      >
        <FlaskConical className="size-3.5" /> {value}
      </span>
    </div>
  );
}

/* ---------- My listing card ---------- */
function MyListingCard({
  listing,
  onCancel,
  busy,
}: {
  listing: MarketListing;
  onCancel: () => void;
  busy: boolean;
}) {
  const card = listing.card;
  const r = card ? rarityOf(card) : "COMUM";
  const isSale = listing.kind === "SALE";
  return (
    <div className={cn("relative rounded-2xl border overflow-hidden bg-sea-surface/40", RARITY_STYLE[r])}>
      <div className="aspect-[5/7] w-full overflow-hidden bg-sea-deep/60 relative">
        {card?.image_url ? (
          <img src={card.image_url} alt={card.name} loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-[11px] uppercase text-parchment/30">Sem imagem</div>
        )}
        {card && <CardCost cost={card.cost ?? 0} />}
        <span className="absolute top-2 right-2 px-2 py-1 rounded-full text-[9px] bg-black/60 text-parchment border border-gold/30">
          {isSale ? "Venda" : "Troca"}
        </span>
      </div>
      <div className="p-3 border-t border-gold/10">
        <p className="text-sm truncate">{card?.name ?? "Carta"}</p>
        <div className="flex items-center justify-between mt-3">
          {isSale ? (
            <span className="flex items-center gap-1 text-sm font-display text-fuchsia-300">
              <FlaskConical className="size-3.5" /> {listing.price_essence ?? 0}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] tracking-widest uppercase text-sky-300">
              <ArrowLeftRight className="size-3.5" /> Troca
            </span>
          )}
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex items-center gap-1 rounded-lg bg-sea-deep/60 border border-rose-400/30 px-3 py-1.5 text-[10px] tracking-widest uppercase text-rose-300 hover:bg-rose-500/15 hover:border-rose-400/50 transition-colors disabled:opacity-50"
          >
            <X className="size-3" /> Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Create listing ---------- */
function CreateListingForm({
  eligibleCards,
  availOf,
  onCreated,
}: {
  eligibleCards: TcgCard[];
  availOf: (cardId: string) => number;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [cardId, setCardId] = useState("");
  const [kind, setKind] = useState<ListingKind>("SALE");
  const [price, setPrice] = useState("10");

  const createMut = useMutation({
    mutationFn: () => createListing(cardId, kind, kind === "SALE" ? Number(price) : null),
    onSuccess: (d) => {
      rewardToast({
        kind: "market-listed",
        title: d.kind === "SALE" ? `${d.name} · ${d.price} essência` : `${d.name} · para troca`,
      });
      setOpen(false);
      setCardId("");
      setKind("SALE");
      setPrice("10");
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-dashed border-gold/30 bg-sea-surface/20 px-4 py-3 text-xs tracking-widest uppercase text-gold/80 hover:border-gold/50 hover:bg-sea-surface/40 transition-colors"
      >
        <Plus className="size-4" /> Anunciar carta
      </button>
    );
  }

  const valid = !!cardId && (kind === "TRADE" || Number(price) > 0);

  return (
    <div className="rounded-2xl border border-gold/20 bg-sea-surface/40 p-6 mb-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg text-parchment">Novo anúncio</h3>
        <button onClick={() => setOpen(false)} className="text-parchment/50 hover:text-parchment">
          <X className="size-5" />
        </button>
      </div>

      {/* 1. escolher carta */}
      <p className="text-[10px] tracking-widest uppercase text-parchment/50 mb-2">
        1. Escolha a carta (mínimo 2 cópias disponíveis)
      </p>
      {eligibleCards.length === 0 ? (
        <Empty icon={Package} text="Nenhuma carta elegível (precisa de 2+ cópias fora de baralhos)." />
      ) : (
        <div className="grid gap-3 grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 max-h-[320px] overflow-y-auto pr-1">
          {eligibleCards.map((c) => (
            <CardPick
              key={c.id}
              card={c}
              qty={availOf(c.id)}
              selected={cardId === c.id}
              onClick={() => setCardId(cardId === c.id ? "" : c.id)}
            />
          ))}
        </div>
      )}

      {/* 2. tipo */}
      <p className="text-[10px] tracking-widest uppercase text-parchment/50 mt-6 mb-2">2. Tipo de anúncio</p>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex gap-2">
          <TypeChip active={kind === "SALE"} onClick={() => setKind("SALE")} label="Venda" icon={FlaskConical} />
          <TypeChip active={kind === "TRADE"} onClick={() => setKind("TRADE")} label="Troca" icon={ArrowLeftRight} />
        </div>

        {kind === "SALE" ? (
          <div>
            <label className="text-[10px] tracking-widest uppercase text-parchment/50">Preço (essência)</label>
            <input
              type="number"
              min={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-40 rounded-lg border border-gold/20 bg-sea-deep/60 px-3 py-2.5 text-sm text-parchment focus:border-gold/50 outline-none"
            />
          </div>
        ) : (
          <p className="text-xs text-parchment/50">Sem preço — outros jogadores propõem cartas em troca.</p>
        )}

        <button
          onClick={() => createMut.mutate()}
          disabled={!valid || createMut.isPending}
          className="flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-[11px] font-bold tracking-widest uppercase text-black hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Tag className="size-4" /> Criar anúncio
        </button>
      </div>
      <p className="mt-3 text-[10px] text-parchment/40">
        1 cópia da carta fica bloqueada enquanto o anúncio estiver ativo. Anúncios expiram em 24 horas.
      </p>
    </div>
  );
}

function TypeChip({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: typeof Store;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[11px] tracking-widest uppercase transition-colors",
        active
          ? "border-gold/50 bg-gold/10 text-gold"
          : "border-gold/15 bg-sea-deep/40 text-parchment/50 hover:border-gold/30 hover:text-parchment",
      )}
    >
      <Icon className="size-3.5" /> {label}
    </button>
  );
}

function CardPick({
  card,
  qty,
  selected,
  onClick,
  disabled,
}: {
  card: TcgCard;
  qty: number;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const r = rarityOf(card);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative rounded-xl border overflow-hidden bg-sea-deep/60 text-left transition-all disabled:opacity-40",
        RARITY_STYLE[r],
        selected ? "ring-2 ring-gold -translate-y-0.5" : "hover:-translate-y-0.5",
      )}
    >
      <div className="aspect-[5/7] w-full overflow-hidden">
        {card.image_url ? (
          <img src={card.image_url} alt={card.name} loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-[9px] uppercase text-parchment/30">Sem img</div>
        )}
      </div>
      {selected && (
        <span className="absolute top-1.5 right-1.5 grid place-items-center size-5 rounded-full bg-gold text-black">
          <Check className="size-3" />
        </span>
      )}
      <div className="p-2 border-t border-gold/10">
        <p className="text-[11px] truncate">{card.name}</p>
        <p className="text-[9px] text-parchment/40">
          {RARITY_LABEL[r]} · x{qty}
        </p>
      </div>
    </button>
  );
}

/* ---------- Offer rows ---------- */
function OfferRow({
  offer,
  cardById,
  wantedLabel,
  offeredLabel,
  actions,
}: {
  offer: TradeOffer;
  cardById: Map<string, TcgCard>;
  wantedLabel: string;
  offeredLabel: string;
  actions: React.ReactNode;
}) {
  const wanted = offer.listing?.card ?? cardById.get(offer.listing?.card_id ?? "") ?? null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-gold/20 bg-sea-surface/40 p-4">
      <OfferCardMini card={wanted} label={wantedLabel} />
      <ArrowLeftRight className="size-5 text-gold/50 shrink-0" />
      <div>
        <p className="text-[10px] tracking-widest uppercase text-gold/50 mb-1.5">
          {offeredLabel}
          {offer.offerer_name ? ` · ${offer.offerer_name}` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          {offer.offered_cards.length === 0 ? (
            <span className="text-xs text-parchment/40">—</span>
          ) : (
            offer.offered_cards.map((c, i) => (
              <div key={`${c.id}-${i}`} className="flex items-center gap-2">
                <div className={cn("size-12 rounded-lg overflow-hidden border bg-sea-deep/60", RARITY_STYLE[rarityOf(c)])}>
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.name} className="size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center text-parchment/30 text-[8px]">?</div>
                  )}
                </div>
                <span className="text-xs truncate max-w-[120px]">{c.name}</span>
              </div>
            ))
          )}
        </div>
      </div>
      {actions}
    </div>
  );
}

/* ---------- small helpers ---------- */
function OfferCardMini({ card, label, name }: { card: TcgCard | null; label: string; name?: string }) {
  const r = card ? rarityOf(card) : "COMUM";
  return (
    <div className="flex items-center gap-3">
      <div className={cn("size-14 rounded-lg overflow-hidden border bg-sea-deep/60 shrink-0", RARITY_STYLE[r])}>
        {card?.image_url ? (
          <img src={card.image_url} alt={card.name} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-parchment/30 text-[8px]">?</div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] tracking-widest uppercase text-gold/50">{label}</p>
        <p className="text-sm truncate max-w-[160px]">{card?.name ?? "Carta"}</p>
        {name && <p className="text-[10px] text-parchment/40">de {name}</p>}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-[10px] tracking-widest uppercase transition-colors",
        active
          ? "border-gold/50 bg-gold/10 text-gold"
          : "border-gold/15 bg-sea-deep/40 text-parchment/50 hover:border-gold/30 hover:text-parchment",
      )}
    >
      {label}
    </button>
  );
}

function Empty({ icon: Icon, text }: { icon: typeof Store; text: string }) {
  return (
    <div className="py-16 text-center">
      <Icon className="size-10 text-gold/20 mx-auto mb-3" />
      <p className="text-xs text-parchment/40 uppercase tracking-widest">{text}</p>
    </div>
  );
}

/* ---------- Trade offer modal (1 a 3 cartas) ---------- */
function TradeOfferModal({
  listing,
  eligibleCards,
  availOf,
  onSubmit,
  onClose,
  busy,
}: {
  listing: MarketListing;
  eligibleCards: TcgCard[];
  availOf: (cardId: string) => number;
  onSubmit: (cardIds: string[]) => void;
  onClose: () => void;
  busy: boolean;
}) {
  const wanted = listing.card;
  const [picked, setPicked] = useState<string[]>([]);

  const toggle = (id: string) =>
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : prev.length >= 3 ? prev : [...prev, id],
    );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-gold/25 bg-sea-surface/95 backdrop-blur-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl text-parchment">Propor troca</h3>
          <button onClick={onClose} className="text-parchment/50 hover:text-parchment">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="text-center">
            <p className="text-[10px] tracking-widest uppercase text-gold/50 mb-2">Você oferece</p>
            <p className="text-xs text-parchment/50">{picked.length}/3 selecionadas</p>
          </div>
          <ArrowLeftRight className="size-6 text-gold/50" />
          <div className="text-center">
            <p className="text-[10px] tracking-widest uppercase text-gold/50 mb-2">Você recebe</p>
            <div
              className={cn(
                "size-16 rounded-lg overflow-hidden border bg-sea-deep/60 mx-auto",
                wanted ? RARITY_STYLE[rarityOf(wanted)] : "",
              )}
            >
              {wanted?.image_url ? (
                <img src={wanted.image_url} alt={wanted.name} className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center text-parchment/30 text-[8px]">?</div>
              )}
            </div>
            <p className="text-xs mt-1.5">{wanted?.name}</p>
          </div>
        </div>

        {eligibleCards.length === 0 ? (
          <Empty icon={ArrowLeftRight} text="Você não tem cartas elegíveis (2+ cópias fora de baralhos)." />
        ) : (
          <>
            <div className="grid gap-3 grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
              {eligibleCards.map((c) => (
                <CardPick
                  key={c.id}
                  card={c}
                  qty={availOf(c.id)}
                  selected={picked.includes(c.id)}
                  disabled={busy || (!picked.includes(c.id) && picked.length >= 3)}
                  onClick={() => toggle(c.id)}
                />
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-xl border border-gold/20 px-4 py-2.5 text-[11px] tracking-widest uppercase text-parchment/70 hover:text-parchment"
              >
                Cancelar
              </button>
              <button
                onClick={() => onSubmit(picked)}
                disabled={picked.length === 0 || busy}
                className="rounded-xl bg-gradient-primary px-5 py-2.5 text-[11px] font-bold tracking-widest uppercase text-black hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Enviar oferta
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
