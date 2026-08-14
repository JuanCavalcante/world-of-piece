import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Hammer, Recycle, Droplet, Sparkles, Gem, FlaskConical, ArrowLeftRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { TcgPageHeader } from "@/components/tcg/tcg-shell";
import { PackRevealDialog } from "@/components/tcg/pack-reveal";
import { TiltCard } from "@/components/tcg/tilt-card";
import { CardCost } from "@/components/tcg/card-cost";
import { useProgression } from "@/hooks/use-progression";
import { toast } from "sonner";
import { rewardToast } from "@/components/tcg/reward-toast";
import { audioManager } from "@/lib/audio-manager";
import { cn } from "@/lib/utils";
import {
  listCards,
  listMyCards,
  listMyDecks,
  RARITIES,
  RARITY_LABEL,
  RARITY_STYLE,
  type DailyRewardCard,
  type Rarity,
  type TcgCard,
} from "@/lib/tcg/api";
import {
  ESSENCE_PER_RARITY,
  FORGE_COST,
  RARITY_FRAGMENT,
  type TcgWallet,
  dismantleCard,
  extractEssence,
  forgeCard,
  getMyWallet,
} from "@/lib/tcg/wallet";

export const Route = createFileRoute("/tcggame/craft")({
  head: () => ({
    meta: [
      { title: "Criação — WOP TCG" },
      { name: "description", content: "Forje, desmantele e extraia essência das suas cartas no WOP TCG." },
      { property: "og:title", content: "Criação — WOP TCG" },
      { property: "og:description", content: "Forje, desmantele e extraia essência das suas cartas no WOP TCG." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CraftPage,
});

type CraftTab = "forge" | "dismantle" | "extract";

const rarityOf = (c: TcgCard): Rarity =>
  (RARITIES.includes(c.rarity as Rarity) ? c.rarity : "COMUM") as Rarity;

function CraftPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const progression = useProgression();
  const [tab, setTab] = useState<CraftTab>("forge");
  const [forgeRarity, setForgeRarity] = useState<Rarity>("COMUM");
  const [forgeCards, setForgeCards] = useState<DailyRewardCard[] | null>(null);

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

  // Quantidade reservada por carta (somatório dos baralhos do dono)
  const reserved = useMemo(() => {
    const m = new Map<string, number>();
    (decks ?? []).forEach((d) =>
      d.cards.forEach((c) => m.set(c.card_id, (m.get(c.card_id) ?? 0) + c.quantity)),
    );
    return m;
  }, [decks]);

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

  const ownedCards = useMemo(
    () => (cards ?? []).filter((c) => (ownedMap.get(c.id) ?? 0) > 0),
    [cards, ownedMap],
  );

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["tcg-wallet", user?.id] });
    qc.invalidateQueries({ queryKey: ["tcg-my-cards", user?.id] });
    qc.invalidateQueries({ queryKey: ["tcg-player", user?.id] });
  };

  /* ---- FORGE ---- */
  const forgeMut = useMutation({
    mutationFn: () => forgeCard(forgeRarity),
    onSuccess: (data) => {
      audioManager.playSfx("pack-open");
      if ((data.rarity ?? "").toUpperCase().includes("LEND")) {
        setTimeout(() => audioManager.playSfx("legendary"), 700);
      }
      setForgeCards([
        {
          card_id: data.card_id,
          name: data.name,
          rarity: data.rarity,
          image_url: data.image_url ?? "",
          is_new: data.is_new,
          xp: 0,
          total_xp: 0,
          streak: 0,
        },
      ]);
      rewardToast({ kind: "forge", title: data.name });
      invalidateAll();
      void progression.counter("CARDS_FORGED", 1).then(() => progression.sync());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const haveForgeFragments = wallet ? (wallet[RARITY_FRAGMENT[forgeRarity]] as number) : 0;
  const canForge = haveForgeFragments >= FORGE_COST && !forgeMut.isPending;

  /* ---- DISMANTLE ---- */
  const dismantleMut = useMutation({
    mutationFn: (cardId: string) => dismantleCard(cardId),
    onSuccess: (data) => {
      rewardToast({ kind: "dismantle", title: `${data.name} · +1 ${RARITY_LABEL[rarityOf({ rarity: data.rarity } as TcgCard)]}` });
      invalidateAll();
      void progression.counter("CARDS_DISMANTLED", 1).then(() => progression.sync());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dismantleCandidates = ownedCards.filter((c) => {
    const qty = ownedMap.get(c.id) ?? 0;
    const avail = qty - (reserved.get(c.id) ?? 0);
    return qty >= 2 && avail >= 1;
  });

  /* ---- EXTRACT ---- */
  const extractMut = useMutation({
    mutationFn: (cardId: string) => extractEssence(cardId),
    onSuccess: (data) => {
      rewardToast({ kind: "extract", title: `${data.name} · +${data.essence} Essência` });
      invalidateAll();
      void progression.counter("ESSENCE_EXTRACTED", data.essence).then(() => progression.sync());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const extractCandidates = ownedCards.filter((c) => {
    const qty = ownedMap.get(c.id) ?? 0;
    const avail = qty - (reserved.get(c.id) ?? 0);
    return qty >= 2 && avail >= 1;
  });

  const TABS: { id: CraftTab; label: string; icon: typeof Hammer; desc: string; accent: string }[] = [
    {
      id: "forge",
      label: "Forjar Carta",
      icon: Hammer,
      desc: "Converta 10 fragmentos em 1 carta aleatória da mesma raridade.",
      accent: "text-sky-400",
    },
    {
      id: "dismantle",
      label: "Desmantelar",
      icon: Recycle,
      desc: "Transforme uma cópia excedente em 1 fragmento da mesma raridade.",
      accent: "text-emerald-400",
    },
    {
      id: "extract",
      label: "Extrair Essência",
      icon: Droplet,
      desc: "Sacrifique uma carta para extrair essência conforme a raridade.",
      accent: "text-fuchsia-400",
    },
  ];

  return (
    <div>
      <TcgPageHeader
        eyebrow="Criação"
        title="Forja e Essência"
        description="Transforme fragmentos em cartas, desmonte cópias excedentes e extraia essência para o mercado."
      />

      {/* 3 cards grandes — seletores */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        {TABS.map((t) => {
          const active = t.id === tab;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "group relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-300 hover:-translate-y-0.5",
                active
                  ? "border-gold/50 bg-sea-surface/60 shadow-[0_0_36px_-12px_rgba(255,201,84,0.55)]"
                  : "border-gold/15 bg-sea-surface/30 hover:border-gold/35",
              )}
            >
              <div className="pointer-events-none absolute -top-14 -right-10 size-36 rounded-full bg-gradient-primary opacity-10 blur-2xl group-hover:opacity-20 transition-opacity" />
              <div className="relative flex items-center gap-3 mb-3">
                <span className="grid place-items-center size-11 rounded-xl bg-sea-deep/60 border border-gold/20">
                  <Icon className={cn("size-5", t.accent)} />
                </span>
                <h2 className="font-display text-lg text-parchment">{t.label}</h2>
              </div>
              <p className="relative text-xs text-parchment/55 leading-relaxed">{t.desc}</p>
            </button>
          );
        })}
      </div>

      {/* FORGE panel */}
      {tab === "forge" && (
        <div className="rounded-2xl border border-gold/20 bg-sea-surface/40 p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            <div className="flex-1 w-full">
              <p className="text-[11px] tracking-[0.25em] uppercase text-gold/70 mb-4">Escolha a raridade</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {RARITIES.map((r) => {
                  const frag = wallet ? (wallet[RARITY_FRAGMENT[r]] as number) : 0;
                  const sel = r === forgeRarity;
                  return (
                    <button
                      key={r}
                      onClick={() => setForgeRarity(r)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl border px-4 py-3 transition-all min-w-[92px]",
                        sel
                          ? "border-sky-400/60 bg-sky-500/15 shadow-[0_0_22px_-8px_rgba(56,189,248,0.6)]"
                          : "border-gold/15 bg-sea-deep/40 hover:border-gold/35",
                      )}
                    >
                      <span className={cn("text-xs tracking-widest uppercase", sel ? "text-sky-300" : "text-parchment/70")}>
                        {RARITY_LABEL[r]}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-parchment/60">
                        <Gem className="size-3 text-sky-400" />
                        {frag}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl border border-gold/15 bg-sea-deep/40 p-4 mb-6">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-parchment/60">Custo</span>
                  <span className="flex items-center gap-1.5 text-sky-300 font-display">
                    <Gem className="size-4" /> {FORGE_COST} fragmentos {RARITY_LABEL[forgeRarity]}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-2">
                  <span className="text-parchment/60">Você tem</span>
                  <span className="flex items-center gap-1.5 text-parchment font-display">
                    <Gem className="size-4 text-sky-400" /> {haveForgeFragments} fragmentos
                  </span>
                </div>
              </div>

              <button
                onClick={() => forgeMut.mutate()}
                disabled={!canForge}
                className={cn(
                  "flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[11px] font-bold tracking-widest uppercase transition-all",
                  canForge
                    ? "bg-gradient-primary text-black shadow-glow hover:-translate-y-0.5"
                    : "bg-sea-deep/60 border border-gold/15 text-gold/40 cursor-not-allowed",
                )}
              >
                {forgeMut.isPending ? (
                  <Sparkles className="size-4 animate-spin" />
                ) : (
                  <Hammer className="size-4" />
                )}
                {forgeMut.isPending ? "Forjando..." : "Forjar Carta"}
              </button>
              {!canForge && !forgeMut.isPending && (
                <p className="mt-3 text-center text-[10px] tracking-wider uppercase text-parchment/40">
                  Fragmentos insuficientes para esta raridade
                </p>
              )}
            </div>

            {/* Preview da raridade selecionada */}
            <div className="w-full max-w-[200px]">
              <div className={cn("relative aspect-[5/7] rounded-2xl border overflow-hidden bg-sea-deep/60", RARITY_STYLE[forgeRarity])}>
                <div className="grid place-items-center size-full">
                  <div className="text-center px-4">
                    <Hammer className="size-10 text-gold/40 mx-auto mb-3" />
                    <p className="text-[10px] tracking-[0.25em] uppercase text-gold/70">{RARITY_LABEL[forgeRarity]}</p>
                    <p className="text-[11px] text-parchment/50 mt-1">Carta aleatória</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DISMANTLE panel */}
      {tab === "dismantle" && (
        <div className="rounded-2xl border border-gold/20 bg-sea-surface/40 p-6">
          <p className="text-xs text-parchment/60 mb-4">
            Apenas cartas com 2+ cópias e fora de baralhos aparecem aqui. Desmantelar concede 1 fragmento da raridade.
          </p>
          {dismantleCandidates.length === 0 ? (
            <EmptyState icon={Recycle} text="Nenhuma carta excedente disponível para desmantelar." />
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {dismantleCandidates.map((c) => {
                const r = rarityOf(c);
                const qty = ownedMap.get(c.id) ?? 0;
                return (
                  <TiltCard key={c.id}>
                    <div className={cn("relative rounded-2xl border overflow-hidden bg-sea-surface/40", RARITY_STYLE[r])}>
                      <div className="aspect-[5/7] w-full overflow-hidden bg-sea-deep/60 relative">
                        {c.image_url ? (
                          <img src={c.image_url} alt={c.name} loading="lazy" className="size-full object-cover" />
                        ) : (
                          <div className="grid size-full place-items-center text-[11px] uppercase text-parchment/30">Sem imagem</div>
                        )}
                        <CardCost cost={c.cost ?? 0} />
                        <span className="absolute top-2 right-2 px-2 py-1 rounded-full text-[9px] tracking-widest uppercase backdrop-blur bg-gold/20 text-gold border border-gold/40">
                          x{qty}
                        </span>
                      </div>
                      <div className="p-3 border-t border-gold/10">
                        <p className="text-sm truncate">{c.name}</p>
                        <p className="text-[10px] tracking-[0.2em] uppercase text-gold/70 mt-1 mb-2">
                          {RARITY_LABEL[r]} · +1 fragmento
                        </p>
                        <button
                          onClick={() => dismantleMut.mutate(c.id)}
                          disabled={dismantleMut.isPending}
                          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-sea-deep/60 border border-emerald-400/30 py-2 text-[10px] tracking-widest uppercase text-emerald-300 hover:bg-emerald-500/15 hover:border-emerald-400/50 transition-colors disabled:opacity-50"
                        >
                          <Recycle className="size-3.5" /> Desmantelar
                        </button>
                      </div>
                    </div>
                  </TiltCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* EXTRACT panel */}
      {tab === "extract" && (
        <div className="rounded-2xl border border-gold/20 bg-sea-surface/40 p-6">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <p className="text-xs text-parchment/60 flex-1 min-w-[200px]">
              Sacrifique uma carta para extrair essência. A carta é consumida permanentemente.
            </p>
            <div className="flex flex-wrap gap-2">
              {RARITIES.map((r) => (
                <span key={r} className="flex items-center gap-1 rounded-lg border border-fuchsia-500/25 bg-fuchsia-500/10 px-2.5 py-1 text-[10px] tracking-wider uppercase text-fuchsia-300">
                  <FlaskConical className="size-3" /> {RARITY_LABEL[r]}: {ESSENCE_PER_RARITY[r]}
                </span>
              ))}
            </div>
          </div>
          {extractCandidates.length === 0 ? (
            <EmptyState icon={Droplet} text="Nenhuma carta disponível para extrair essência." />
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {extractCandidates.map((c) => {
                const r = rarityOf(c);
                const qty = ownedMap.get(c.id) ?? 0;
                return (
                  <TiltCard key={c.id}>
                    <div className={cn("relative rounded-2xl border overflow-hidden bg-sea-surface/40", RARITY_STYLE[r])}>
                      <div className="aspect-[5/7] w-full overflow-hidden bg-sea-deep/60 relative">
                        {c.image_url ? (
                          <img src={c.image_url} alt={c.name} loading="lazy" className="size-full object-cover" />
                        ) : (
                          <div className="grid size-full place-items-center text-[11px] uppercase text-parchment/30">Sem imagem</div>
                        )}
                        <CardCost cost={c.cost ?? 0} />
                        <span className="absolute top-2 right-2 px-2 py-1 rounded-full text-[9px] bg-black/60 text-parchment border border-gold/30">
                          x{qty}
                        </span>
                      </div>
                      <div className="p-3 border-t border-gold/10">
                        <p className="text-sm truncate">{c.name}</p>
                        <p className="text-[10px] tracking-[0.2em] uppercase text-fuchsia-300 mt-1 mb-2">
                          {RARITY_LABEL[r]} · +{ESSENCE_PER_RARITY[r]} essência
                        </p>
                        <button
                          onClick={() => extractMut.mutate(c.id)}
                          disabled={extractMut.isPending}
                          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-sea-deep/60 border border-fuchsia-400/30 py-2 text-[10px] tracking-widest uppercase text-fuchsia-300 hover:bg-fuchsia-500/15 hover:border-fuchsia-400/50 transition-colors disabled:opacity-50"
                        >
                          <Droplet className="size-3.5" /> Extrair
                        </button>
                      </div>
                    </div>
                  </TiltCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      <PackRevealDialog
        cards={forgeCards}
        catalog={cards ?? []}
        title="Carta forjada!"
        onClose={() => setForgeCards(null)}
      />
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Hammer; text: string }) {
  return (
    <div className="py-16 text-center">
      <Icon className="size-10 text-gold/20 mx-auto mb-3" />
      <p className="text-xs text-parchment/40 uppercase tracking-widest">{text}</p>
    </div>
  );
}
