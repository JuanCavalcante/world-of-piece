import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Send, Search } from "lucide-react";
import { toast } from "sonner";
import {
  adminDeleteCard,
  adminSaveCard,
  listCards,
  RARITIES,
  RARITY_LABEL,
  RARITY_STYLE,
  type Rarity,
  type TcgCard,
  adminReleaseCards,
} from "@/lib/tcg/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { RACE_LIST } from "@/lib/races/catalog";
import { ORGANIZATIONS } from "@/lib/characters/types";
import { CardCost } from "@/components/tcg/card-cost";
import { EFFECT_CODES, EFFECT_LABEL, type EffectCode } from "@/lib/tcg/duel";
import { CardSortSelect, sortCards, type CardSort } from "@/lib/tcg/sort";
import { CardEffectsEditor } from "@/components/admin/card-effects-editor";


export const Route = createFileRoute("/admin/woptcg/cartas")({
  component: TcgCardsAdmin,
});

const TYPES = ["Atirador", "Lutador", "Espadachim", "Suporte", "Médico"];

type Draft = {
  id?: string;
  name: string;
  rarity: Rarity;
  power: number;
  atk: number;
  effect_code: EffectCode;
  cost: number;
  effect: string;
  image_url: string;
  type: string;
  organization: string;
  race: string;
  family: string;
  status: "WAITING" | "ACTIVE";
};

const EMPTY: Draft = {
  name: "",
  rarity: "COMUM",
  power: 50,
  atk: 10,
  effect_code: "NONE",
  cost: 0,
  effect: "",
  image_url: "",
  type: TYPES[0],
  organization: ORGANIZATIONS[0],
  race: RACE_LIST[0],
  family: "",
  status: "WAITING",
};


const rarityOf = (r: string): Rarity => (RARITIES.includes(r as Rarity) ? (r as Rarity) : "COMUM");

export function TcgCardsAdmin() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [q, setQ] = useState("");
  const [rarityFilter, setRarityFilter] = useState<"ALL" | Rarity>("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sort, setSort] = useState<CardSort>("name_asc");

  const { data: allCards, isLoading } = useQuery({ queryKey: ["tcg-cards"], queryFn: () => listCards("ACTIVE") });
  const { data: waitingCards } = useQuery({ queryKey: ["tcg-waiting-cards"], queryFn: () => listCards("WAITING") });

  const save = useMutation({
    mutationFn: (d: Draft) => adminSaveCard(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tcg-cards"] });
      qc.invalidateQueries({ queryKey: ["tcg-waiting-cards"] });
      setDraft(null);
      toast.success("Carta salva.");
    },
    onError: (e: unknown) => {
      const err = e as { message?: string; details?: string; hint?: string } | null;
      const msg = [err?.message, err?.details, err?.hint].filter(Boolean).join(" — ");
      toast.error(msg || "Falha ao salvar a carta.");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteCard(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tcg-cards"] });
      qc.invalidateQueries({ queryKey: ["tcg-waiting-cards"] });
      setConfirmDelete(null);
      setConfirmText("");
      setDraft(null);
      toast.success("Carta removida.");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao remover a carta."),
  });

  const release = useMutation({
    mutationFn: () => adminReleaseCards(),
    onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["tcg-cards"] });
        qc.invalidateQueries({ queryKey: ["tcg-waiting-cards"] });
        toast.success("Cartas lançadas com sucesso!");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao lançar cartas."),
  });

  const field = "w-full bg-sea-surface/60 border border-gold/15 px-3 py-2 text-sm rounded-lg focus:outline-none focus:border-gold";

  const applyFilters = (list: TcgCard[] | undefined) =>
    sortCards(
      (list ?? []).filter((c) => {
        if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
        if (rarityFilter !== "ALL" && rarityOf(c.rarity) !== rarityFilter) return false;
        if (typeFilter !== "ALL" && (c.type || "") !== typeFilter) return false;
        return true;
      }),
      sort,
    );

  const activeList = applyFilters(allCards);
  const waitingList = applyFilters(waitingCards);

  function openCard(c: TcgCard) {
    setDraft({
      id: c.id,
      name: c.name,
      rarity: rarityOf(c.rarity),
      power: c.power,
      atk: c.atk ?? 10,
      effect_code: (EFFECT_CODES.includes(c.effect_code as EffectCode) ? c.effect_code : "NONE") as EffectCode,
      cost: c.cost ?? 0,

      effect: c.effect ?? "",
      image_url: c.image_url ?? "",
      type: c.type || TYPES[0],
      organization: c.organization || ORGANIZATIONS[0],
      race: c.race || RACE_LIST[0],
      family: c.family ?? "",
      status: c.status || "WAITING",
    });
  }

  const renderCard = (c: TcgCard) => {
    const r = rarityOf(c.rarity);
    return (
      <button
        key={c.id}
        onClick={() => openCard(c)}
        className={`text-left rounded-2xl border overflow-hidden bg-sea-surface/40 transition-transform hover:-translate-y-1 ${RARITY_STYLE[r]}`}
      >
        <div className="aspect-[5/7] bg-sea-deep/60 overflow-hidden relative">
          {c.image_url ? (
            <img src={c.image_url} alt={c.name} loading="lazy" className="size-full object-cover" />
          ) : (
            <div className="size-full grid place-items-center text-[11px] text-parchment/30">Sem imagem</div>
          )}
          <CardCost cost={c.cost ?? 0} />
          <div className="absolute bottom-1 left-1 right-1 bg-black/60 rounded px-1 py-0.5 text-[9px] text-parchment truncate">
             {c.type} • {c.organization} • {c.race}
          </div>
        </div>
        <div className="p-3 border-t border-gold/10">
          <p className="text-sm truncate">{c.name}</p>
          <p className="text-[10px] tracking-[0.2em] uppercase text-gold/70 mt-1">
            {RARITY_LABEL[r]} · {c.power} HP · {c.atk ?? 0} ATK
          </p>
        </div>
      </button>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-parchment/60">{allCards?.length ?? 0} cartas ativas</p>
        <div className="flex gap-2">
            <button
                onClick={() => release.mutate()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gold/40 text-[11px] tracking-widest uppercase text-gold hover:bg-gold/10 disabled:opacity-50"
                disabled={!waitingCards?.length || release.isPending}
            >
                <Send className="size-3.5" /> Lançar {waitingCards?.length || 0} cartas
            </button>
            <button
            onClick={() => setDraft({ ...EMPTY })}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gold/40 text-[11px] tracking-widest uppercase text-gold hover:bg-gold/10"
            >
            <Plus className="size-3.5" /> Adicionar
            </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-parchment/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar carta pelo nome..."
            className="w-full bg-sea-surface/60 border border-gold/15 pl-10 pr-3 py-2.5 text-sm rounded-xl focus:outline-none focus:border-gold"
          />
        </div>
        <select
          value={rarityFilter}
          onChange={(e) => setRarityFilter(e.target.value as "ALL" | Rarity)}
          className="bg-sea-surface/60 border border-gold/15 px-3 py-2.5 text-sm rounded-xl focus:outline-none focus:border-gold text-parchment"
          aria-label="Filtrar por raridade"
        >
          <option value="ALL" className="bg-sea-deep">Todas raridades</option>
          {RARITIES.map((r) => (
            <option key={r} value={r} className="bg-sea-deep">{RARITY_LABEL[r]}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-sea-surface/60 border border-gold/15 px-3 py-2.5 text-sm rounded-xl focus:outline-none focus:border-gold text-parchment"
          aria-label="Filtrar por tipo"
        >
          <option value="ALL" className="bg-sea-deep">Todos os tipos</option>
          {TYPES.map((t) => (
            <option key={t} value={t} className="bg-sea-deep">{t}</option>
          ))}
        </select>
        <CardSortSelect value={sort} onChange={setSort} />
      </div>

      {waitingList.length > 0 && (
          <div className="mb-8">
              <p className="text-xs tracking-[0.3em] uppercase text-wop-red/70 mb-3">Aguardando revisão ({waitingList.length})</p>
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                  {waitingList.map(renderCard)}
              </div>
          </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[5/7] rounded-2xl bg-sea-surface/40" />
          ))}
        </div>
      ) : (
        <div>
            <p className="text-xs tracking-[0.3em] uppercase text-gold/70 mb-3">Cartas ativas ({activeList.length})</p>
            {activeList.length === 0 ? (
              <p className="text-sm text-parchment/50">Nenhuma carta encontrada com esses filtros.</p>
            ) : (
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                  {activeList.map(renderCard)}
              </div>
            )}
        </div>
      )}

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="bg-sea-deep border-gold/25 text-parchment max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide">
              {draft?.id ? "Editar carta" : "Nova carta"}
            </DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] tracking-widest uppercase text-parchment/50">URL da imagem</label>
                <input className={field} value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] tracking-widest uppercase text-parchment/50">Nome</label>
                <input className={field} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="text-[10px] tracking-widest uppercase text-parchment/50">Tipo</label>
                    <select className={field} value={draft.type} onChange={(e) => setDraft({...draft, type: e.target.value})}>
                        {TYPES.map(t => <option key={t} value={t} className="bg-sea-deep">{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] tracking-widest uppercase text-parchment/50">Organização</label>
                    <select className={field} value={draft.organization} onChange={(e) => setDraft({...draft, organization: e.target.value})}>
                        {ORGANIZATIONS.map(o => <option key={o} value={o} className="bg-sea-deep">{o}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] tracking-widest uppercase text-parchment/50">Raça</label>
                    <select className={field} value={draft.race} onChange={(e) => setDraft({...draft, race: e.target.value})}>
                        {RACE_LIST.map(r => <option key={r} value={r} className="bg-sea-deep">{r}</option>)}
                    </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-parchment/50">HP</label>
                  <input type="number" className={field} value={draft.power} onChange={(e) => setDraft({ ...draft, power: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-parchment/50">MP</label>
                  <select
                    className={field}
                    value={draft.cost}
                    onChange={(e) => setDraft({ ...draft, cost: Number(e.target.value) })}
                  >
                    {Array.from({ length: 11 }).map((_, n) => (
                      <option key={n} value={n} className="bg-sea-deep">
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-parchment/50">Raridade</label>
                  <select className={field} value={draft.rarity} onChange={(e) => setDraft({ ...draft, rarity: e.target.value as Rarity })}>
                    {RARITIES.map((r) => <option key={r} value={r} className="bg-sea-deep">{RARITY_LABEL[r]}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-parchment/50">ATK</label>
                  <input
                    type="number"
                    className={field}
                    value={draft.atk}
                    onChange={(e) => setDraft({ ...draft, atk: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-parchment/50">Efeito automático</label>
                  <select
                    className={field}
                    value={draft.effect_code}
                    onChange={(e) => setDraft({ ...draft, effect_code: e.target.value as EffectCode })}
                  >
                    {EFFECT_CODES.map((c) => (
                      <option key={c} value={c} className="bg-sea-deep">
                        {EFFECT_LABEL[c]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] tracking-widest uppercase text-parchment/50">Família (opcional — ex.: Morningstar)</label>
                <input
                  className={field}
                  value={draft.family}
                  placeholder="Sem família"
                  onChange={(e) => setDraft({ ...draft, family: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] tracking-widest uppercase text-parchment/50">Descrição do efeito</label>
                <textarea rows={3} className={field} value={draft.effect} onChange={(e) => setDraft({ ...draft, effect: e.target.value })} />
              </div>
              {draft.id ? (
                <CardEffectsEditor cardId={draft.id} />
              ) : (
                <p className="text-[11px] text-parchment/50">
                  Salve a carta primeiro para configurar os efeitos (Effect Engine v2).
                </p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  disabled={!draft.name.trim() || save.isPending}
                  onClick={() => save.mutate(draft)}
                  className="px-4 py-2 rounded-xl bg-gradient-primary text-[11px] tracking-widest uppercase disabled:opacity-50"
                >
                  Salvar
                </button>
                {draft.id && (
                  <button
                    disabled={remove.isPending}
                    onClick={() => {
                      setConfirmText("");
                      setConfirmDelete({ id: draft.id!, name: draft.name });
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-wop-red/40 text-wop-red text-[11px] tracking-widest uppercase hover:bg-wop-red/10"
                  >
                    <Trash2 className="size-3.5" /> Excluir
                  </button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!confirmDelete}
        onOpenChange={(o) => {
          if (!o) {
            setConfirmDelete(null);
            setConfirmText("");
          }
        }}
      >
        <DialogContent className="bg-sea-deep border-wop-red/30 text-parchment max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide">Excluir carta</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-parchment/70">
            Esta ação é permanente. Digite{" "}
            <span className="text-wop-red font-medium">{confirmDelete?.name}</span> para confirmar.
          </p>
          <input
            autoFocus
            className={field}
            value={confirmText}
            placeholder="Nome da carta"
            onChange={(e) => setConfirmText(e.target.value)}
          />
          <div className="flex items-center gap-3 pt-1">
            <button
              disabled={
                remove.isPending ||
                confirmText.trim().toLowerCase() !== (confirmDelete?.name ?? "").trim().toLowerCase()
              }
              onClick={() => confirmDelete && remove.mutate(confirmDelete.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-wop-red/40 text-wop-red text-[11px] tracking-widest uppercase hover:bg-wop-red/10 disabled:opacity-40"
            >
              <Trash2 className="size-3.5" /> Excluir definitivamente
            </button>
            <button
              onClick={() => {
                setConfirmDelete(null);
                setConfirmText("");
              }}
              className="px-4 py-2 rounded-xl border border-gold/25 text-[11px] tracking-widest uppercase text-parchment/70 hover:bg-gold/5"
            >
              Cancelar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
