import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { Plus, Trash2, Layers, Save, AlertCircle, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { useProgression } from "@/hooks/use-progression";
import { useAuth } from "@/hooks/use-auth";
import { TcgPageHeader, TcgPlaceholder } from "@/components/tcg/tcg-shell";
import { CardCost } from "@/components/tcg/card-cost";
import { TiltCard } from "@/components/tcg/tilt-card";
import {
  listCards,
  listMyCards,
  RARITIES,
  RARITY_LABEL,
  RARITY_STYLE,
  type Rarity,
  type TcgCard,
} from "@/lib/tcg/api";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/tcggame/decks")({
  head: () => ({
    meta: [
      { title: "Baralhos — WOP TCG" },
      { name: "description", content: "Monte e organize seus baralhos no TCG do World of Piece." },
      { property: "og:title", content: "Baralhos — WOP TCG" },
      { property: "og:description", content: "Monte e organize seus baralhos no TCG do World of Piece." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DecksPage,
});

type Deck = {
  id: string;
  name: string;
  cards: { card_id: string; quantity: number }[];
};

function DecksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const progression = useProgression();
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [deckName, setDeckName] = useState("");
  const [deckCards, setDeckCards] = useState<{ card_id: string; quantity: number }[]>([]);
  
  // Filtros da coleção
  const [q, setQ] = useState("");
  const [rarityFilter, setRarityFilter] = useState<"ALL" | Rarity>("ALL");
  const [costFilter, setCostFilter] = useState<"ALL" | number>("ALL");


  const { data: cards, isLoading: loadingCards } = useQuery({ 
    queryKey: ["tcg-cards", "ACTIVE"], 
    queryFn: () => listCards("ACTIVE") 
  });
  
  const { data: mine } = useQuery({
    queryKey: ["tcg-my-cards", user?.id],
    queryFn: () => listMyCards(user!.id),
    enabled: !!user?.id,
  });

  const { data: decks, isLoading: loadingDecks } = useQuery({
    queryKey: ["tcg-user-decks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("decks").select("*").eq("user_id", user!.id).order("created_at", { ascending: true });
      if (error) throw error;
      
      const decksWithCards = await Promise.all(data.map(async (d) => {
        const { data: dc, error: dce } = await supabase.from("deck_cards").select("card_id, quantity").eq("deck_id", d.id);
        if (dce) throw dce;
        return { ...d, cards: dc || [] };
      }));
      
      return decksWithCards as Deck[];
    },
    enabled: !!user?.id,
  });

  const qtyInCollection = useMemo(() => {
    const m = new Map<string, number>();
    (mine ?? []).forEach((r) => m.set(r.card_id, r.quantity));
    return m;
  }, [mine]);

  const cardsMap = useMemo(() => {
    const m = new Map<string, TcgCard>();
    (cards ?? []).forEach((c) => m.set(c.id, c));
    return m;
  }, [cards]);

  useEffect(() => {
    if (selectedDeckId && decks) {
      const d = decks.find(x => x.id === selectedDeckId);
      if (d) {
        setDeckName(d.name);
        setDeckCards(d.cards);
      }
    } else {
        setDeckName("");
        setDeckCards([]);
    }
  }, [selectedDeckId, decks]);

  const totalCardsInDeck = useMemo(() => deckCards.reduce((acc, c) => acc + c.quantity, 0), [deckCards]);

  const createDeck = useMutation({
    mutationFn: async () => {
      if ((decks?.length ?? 0) >= 3) throw new Error("Limite de 3 baralhos atingido.");
      const { data, error } = await supabase.from("decks").insert({ user_id: user!.id, name: "Novo Baralho" }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tcg-user-decks", user?.id] });
      setSelectedDeckId(data.id);
      toast.success("Baralho criado!");
      void progression.sync();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveDeck = useMutation({
    mutationFn: async () => {
      if (!selectedDeckId) return;
      
      // Update name
      const { error: nameError } = await supabase.from("decks").update({ name: deckName }).eq("id", selectedDeckId);
      if (nameError) throw nameError;
      
      // Update cards (delete and re-insert for simplicity)
      const { error: delError } = await supabase.from("deck_cards").delete().eq("deck_id", selectedDeckId);
      if (delError) throw delError;
      
      if (deckCards.length > 0) {
        const { error: insError } = await supabase.from("deck_cards").insert(
          deckCards.map(c => ({ deck_id: selectedDeckId, card_id: c.card_id, quantity: c.quantity }))
        );
        if (insError) throw insError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tcg-user-decks", user?.id] });
      toast.success("Baralho salvo!");
      void progression.sync();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteDeck = useMutation({
      mutationFn: async (id: string) => {
          const { error } = await supabase.from("decks").delete().eq("id", id);
          if (error) throw error;
      },
      onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["tcg-user-decks", user?.id] });
          if (selectedDeckId) setSelectedDeckId(null);
          toast.success("Baralho excluído.");
      },
      onError: (e: Error) => toast.error(e.message),
  });

  const addCard = (cardId: string) => {
    if (totalCardsInDeck >= 20) {
      toast.error("Limite de 20 cartas no baralho.");
      return;
    }
    
    const inDeck = deckCards.find(c => c.card_id === cardId);
    if (inDeck && inDeck.quantity >= 2) {
      toast.error("Máximo de 2 cópias da mesma carta.");
      return;
    }
    
    const available = qtyInCollection.get(cardId) ?? 0;
    if (inDeck && inDeck.quantity >= available) {
        toast.error("Você não possui mais cópias desta carta.");
        return;
    }
    if (!inDeck && available < 1) {
        toast.error("Você não possui esta carta.");
        return;
    }

    if (inDeck) {
      setDeckCards(deckCards.map(c => c.card_id === cardId ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setDeckCards([...deckCards, { card_id: cardId, quantity: 1 }]);
    }
  };

  const removeCard = (cardId: string) => {
    const inDeck = deckCards.find(c => c.card_id === cardId);
    if (!inDeck) return;
    
    if (inDeck.quantity > 1) {
      setDeckCards(deckCards.map(c => c.card_id === cardId ? { ...c, quantity: c.quantity - 1 } : c));
    } else {
      setDeckCards(deckCards.filter(c => c.card_id !== cardId));
    }
  };

  const filteredCollection = (cards ?? []).filter(c => {
      const cost = c.cost ?? 0;
      if (q) {
          const s = q.trim().toLowerCase();
          const byName = c.name.toLowerCase().includes(s);
          // busca também por custo: "3", "custo 3", "custo: 3"
          const costTerm = s.replace(/^custo\s*:?\s*/, "");
          const byCost = /^\d+$/.test(costTerm) && cost === Number(costTerm);
          if (!byName && !byCost) return false;
      }
      if (rarityFilter !== "ALL" && c.rarity !== rarityFilter) return false;
      if (costFilter !== "ALL" && cost !== costFilter) return false;
      return true;
  });


  if (loadingDecks || loadingCards) {
    return <div className="p-10"><Skeleton className="h-40 w-full bg-sea-surface/40" /></div>;
  }

  return (
    <div>
      <TcgPageHeader
        eyebrow="Construção"
        title="Baralhos"
        description="Monte seus baralhos estratégicos para os duelos. Limite de 20 cartas e 2 cópias por carta."
      />

      <div className="grid lg:grid-cols-[300px_1fr] gap-6">
        {/* Sidebar - Lista de Baralhos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs tracking-[0.3em] uppercase text-gold/70">Meus Baralhos</h2>
            <button 
                onClick={() => createDeck.mutate()}
                disabled={(decks?.length ?? 0) >= 3 || createDeck.isPending}
                className="p-1.5 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 disabled:opacity-30"
            >
                <Plus className="size-4" />
            </button>
          </div>
          
          <div className="space-y-2">
            {decks?.map(d => (
              <div 
                key={d.id}
                className={`group relative flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${selectedDeckId === d.id ? "bg-gold/10 border-gold/50 shadow-[0_0_15px_-5px_rgba(255,201,84,0.4)]" : "bg-sea-surface/40 border-gold/15 hover:border-gold/30"}`}
                onClick={() => setSelectedDeckId(d.id)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-display truncate">{d.name}</p>
                  <p className="text-[10px] text-parchment/50 uppercase tracking-widest mt-1">
                    {d.cards.reduce((acc, c) => acc + c.quantity, 0)} / 20 cartas
                  </p>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); deleteDeck.mutate(d.id); }}
                    className="p-1.5 text-parchment/30 hover:text-wop-red transition-colors"
                >
                    <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            {(decks?.length ?? 0) === 0 && (
                <div className="p-8 border border-dashed border-gold/15 rounded-xl text-center">
                    <AlertCircle className="size-6 text-parchment/20 mx-auto mb-2" />
                    <p className="text-[10px] uppercase tracking-widest text-parchment/40">Nenhum baralho</p>
                </div>
            )}
          </div>
        </div>

        {/* Editor de Baralho */}
        <div className="min-w-0">
          {!selectedDeckId ? (
            <TcgPlaceholder label="Selecione ou crie um baralho para começar" />
          ) : (
            <div className="space-y-6">
                {/* Cabeçalho do Editor */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-sea-surface/40 p-5 rounded-2xl border border-gold/20">
                    <div className="flex-1">
                        <input 
                            value={deckName}
                            onChange={(e) => setDeckName(e.target.value)}
                            className="bg-transparent border-none p-0 text-xl font-display text-parchment focus:ring-0 w-full"
                            placeholder="Nome do baralho..."
                        />
                        <div className="flex items-center gap-4 mt-2">
                             <div className="flex items-center gap-2">
                                <div className="h-1.5 w-32 bg-sea-deep/80 rounded-full overflow-hidden border border-gold/10">
                                    <div 
                                        className={`h-full transition-all duration-500 ${totalCardsInDeck > 20 ? "bg-wop-red" : "bg-gold"}`}
                                        style={{ width: `${(totalCardsInDeck / 20) * 100}%` }}
                                    />
                                </div>
                                <span className={`text-[10px] font-bold ${totalCardsInDeck === 20 ? "text-gold" : totalCardsInDeck > 20 ? "text-wop-red" : "text-parchment/60"}`}>
                                    {totalCardsInDeck} / 20
                                </span>
                             </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => saveDeck.mutate()}
                        disabled={saveDeck.isPending}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-primary text-[11px] tracking-widest uppercase text-black font-bold hover:shadow-lg transition-all disabled:opacity-50"
                    >
                        <Save className="size-4" /> {saveDeck.isPending ? "Salvando..." : "Salvar Baralho"}
                    </button>
                </div>

                {/* Cartas no Baralho */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {deckCards.map(dc => {
                        const card = cardsMap.get(dc.card_id);
                        if (!card) return null;
                        const r = (RARITIES.includes(card.rarity as Rarity) ? card.rarity : "COMUM") as Rarity;
                        return (
                            <div key={dc.card_id} className={`relative group aspect-[5/7] rounded-xl border overflow-hidden bg-sea-deep/60 ${RARITY_STYLE[r]}`}>
                                <img src={card.image_url || ""} className="size-full object-cover opacity-80" alt={card.name} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                                <CardCost cost={card.cost ?? 0} />
                                <div className="absolute bottom-2 left-2 right-2">
                                    <p className="text-[10px] font-bold truncate">{card.name}</p>
                                    <p className="text-[8px] text-gold/80 uppercase tracking-widest">x{dc.quantity}</p>
                                </div>
                                <button 
                                    onClick={() => removeCard(dc.card_id)}
                                    className="absolute top-10 right-1 z-10 p-1 bg-black/60 rounded-full text-parchment/60 hover:text-wop-red opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="size-3" />
                                </button>
                            </div>
                        );
                    })}
                    {deckCards.length === 0 && (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center text-parchment/30 border border-dashed border-gold/15 rounded-2xl">
                            <Layers className="size-8 mb-2 opacity-20" />
                            <p className="text-[10px] uppercase tracking-[0.2em]">Arraste cartas da coleção abaixo</p>
                        </div>
                    )}
                </div>

                {/* Coleção Disponível */}
                <div className="mt-10 border-t border-gold/15 pt-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h2 className="text-xs tracking-[0.3em] uppercase text-gold/70 flex items-center gap-2">
                            Minha Coleção
                        </h2>
                        <div className="flex items-center gap-3">
                            <div className="relative max-w-[200px]">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-parchment/30" />
                                <input 
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Buscar..."
                                    className="w-full bg-sea-surface/60 border border-gold/15 pl-8 pr-3 py-1.5 text-xs rounded-lg focus:outline-none focus:border-gold"
                                />
                            </div>
                            <select 
                                value={rarityFilter}
                                onChange={(e) => setRarityFilter(e.target.value as any)}
                                className="bg-sea-surface/60 border border-gold/15 px-3 py-1.5 text-xs rounded-lg focus:outline-none text-parchment/70"
                            >
                                <option value="ALL">Todas</option>
                                {RARITIES.map(r => <option key={r} value={r}>{RARITY_LABEL[r]}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                        {filteredCollection.map(c => {
                            const available = (qtyInCollection.get(c.id) ?? 0);
                            const inDeck = deckCards.find(dc => dc.card_id === c.id)?.quantity ?? 0;
                            const remaining = available - inDeck;
                            const r = (RARITIES.includes(c.rarity as Rarity) ? c.rarity : "COMUM") as Rarity;

                            return (
                                <TiltCard key={c.id} max={10}>
                                <button 
                                    onClick={() => addCard(c.id)}
                                    disabled={remaining <= 0}
                                    className={`group relative w-full aspect-[5/7] rounded-xl border overflow-hidden ${remaining > 0 ? `${RARITY_STYLE[r]} bg-sea-surface/40` : "opacity-30 grayscale border-gold/10"}`}
                                >
                                    <img src={c.image_url || ""} className="size-full object-cover" alt={c.name} />
                                    <CardCost cost={c.cost ?? 0} />
                                    <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1.5 text-center">
                                        <p className="text-[9px] font-bold truncate mb-0.5">{c.name}</p>
                                        <p className="text-[8px] text-parchment/50">Disponível: {remaining}</p>
                                    </div>
                                    {remaining > 0 && (
                                        <div className="absolute inset-0 bg-gold/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <Plus className="size-6 text-gold drop-shadow" />
                                        </div>
                                    )}
                                </button>
                                </TiltCard>
                            );
                        })}
                    </div>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const X = ({ className }: { className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
);
