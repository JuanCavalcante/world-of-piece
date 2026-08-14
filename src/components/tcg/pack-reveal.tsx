import { useMemo, useState } from "react";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TiltCard } from "@/components/tcg/tilt-card";
import { CardCost } from "@/components/tcg/card-cost";
import {
  RARITIES,
  RARITY_LABEL,
  RARITY_STYLE,
  type DailyRewardCard,
  type Rarity,
  type TcgCard,
} from "@/lib/tcg/api";

const rarityOf = (r: string | null | undefined): Rarity =>
  (RARITIES.includes((r ?? "") as Rarity) ? r : "COMUM") as Rarity;

export function PackRevealDialog({
  cards,
  catalog,
  title = "Pacote aberto!",
  onClose,
}: {
  cards: DailyRewardCard[] | null;
  catalog: TcgCard[];
  title?: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [details, setDetails] = useState<TcgCard | null>(null);

  const ordered = useMemo(
    () =>
      [...(cards ?? [])].sort(
        (a, b) => RARITIES.indexOf(rarityOf(a.rarity)) - RARITIES.indexOf(rarityOf(b.rarity)),
      ),
    [cards],
  );

  const open = !!cards && ordered.length > 0;
  const current = ordered[Math.min(index, ordered.length - 1)];
  const isLast = index >= ordered.length - 1;
  const full = current ? catalog.find((c) => c.id === current.card_id) ?? null : null;
  const r = rarityOf(current?.rarity);

  const close = () => {
    setIndex(0);
    setDetails(null);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-md bg-sea-deep border-gold/25 text-parchment">
          {current && (
            <div className="pt-2">
              <p className="text-center text-[10px] tracking-[0.3em] uppercase text-gold/70">{title}</p>
              <p className="mt-1 text-center text-[11px] tracking-widest uppercase text-parchment/40">
                Carta {index + 1} de {ordered.length}
              </p>

              <div className="mx-auto mt-5 w-[220px]">
                <TiltCard>
                  <button
                    onClick={() => full && setDetails(full)}
                    className={`group relative block w-full overflow-hidden rounded-2xl border bg-sea-surface/40 text-left ${RARITY_STYLE[r]}`}
                  >
                    <div className="relative aspect-[5/7] w-full overflow-hidden bg-sea-deep/60">
                      {current.image_url ? (
                        <img src={current.image_url} alt={current.name} className="size-full object-cover" />
                      ) : (
                        <div className="grid size-full place-items-center text-[11px] uppercase text-parchment/30">
                          Sem imagem
                        </div>
                      )}
                      <CardCost cost={full?.cost ?? 0} />
                    </div>
                    {current.is_new && (
                      <span className="absolute right-2 top-2 rounded-md bg-gradient-primary px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-black">
                        Inédita
                      </span>
                    )}
                    <div className="border-t border-gold/10 p-3">
                      <p className="truncate text-sm">{current.name}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-gold/70">
                        {RARITY_LABEL[r]} · +{current.xp} XP
                      </p>
                    </div>
                  </button>
                </TiltCard>
              </div>

              <p className="mt-3 text-center text-[10px] uppercase tracking-widest text-parchment/40">
                Clique na carta para ver os detalhes
              </p>

              <button
                onClick={() => (isLast ? close() : setIndex((i) => i + 1))}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-2.5 text-[11px] font-bold uppercase tracking-widest text-black shadow-glow"
              >
                {isLast ? (
                  <>
                    <Check className="size-3.5" /> Concluir
                  </>
                ) : (
                  <>
                    Próximo <ArrowRight className="size-3.5" />
                  </>
                )}
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-widest text-gold/70">
                <Sparkles className="size-3" /> Total +
                {ordered.reduce((s, c) => s + (c.xp ?? 0), 0)} XP
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!details} onOpenChange={(o) => !o && setDetails(null)}>
        <DialogContent className="max-w-3xl overflow-hidden border-gold/25 bg-sea-deep p-0 text-parchment">
          {details && (
            <div className="grid md:grid-cols-[minmax(0,320px)_1fr]">
              <div className="relative bg-sea-surface/40">
                {details.image_url ? (
                  <img src={details.image_url} alt={details.name} className="size-full object-cover" />
                ) : (
                  <div className="grid aspect-[5/7] place-items-center text-xs text-parchment/30">Sem imagem</div>
                )}
                <CardCost cost={details.cost ?? 0} />
                <div className="absolute bottom-2 left-2 right-2 rounded bg-black/70 px-2 py-1 text-center text-[10px] text-parchment">
                  {details.type} • {details.organization} • {details.race}
                </div>
              </div>
              <div className="p-6">
                <button
                  className="absolute right-4 top-4 text-parchment/50 hover:text-gold"
                  onClick={() => setDetails(null)}
                  aria-label="Fechar"
                >
                  <X className="size-4" />
                </button>
                <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-gold/70">
                  {RARITY_LABEL[rarityOf(details.rarity)]}
                </p>
                <h2 className="mb-4 font-display text-2xl">{details.name}</h2>
                <div className="mb-5 grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-gold/15 bg-sea-surface/40 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-parchment/50">HP</p>
                    <p className="text-xl">{details.power}</p>
                  </div>
                  <div className="rounded-xl border border-gold/15 bg-sea-surface/40 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-parchment/50">ATK</p>
                    <p className="text-xl">{details.atk ?? 0}</p>
                  </div>
                </div>
                <div className="mb-5 grid grid-cols-3 gap-2">
                  <div className="rounded border border-gold/10 bg-sea-surface/40 p-2 text-center">
                    <p className="text-[8px] uppercase text-parchment/40">Tipo</p>
                    <p className="text-[10px]">{details.type || "—"}</p>
                  </div>
                  <div className="rounded border border-gold/10 bg-sea-surface/40 p-2 text-center">
                    <p className="text-[8px] uppercase text-parchment/40">Org.</p>
                    <p className="text-[10px]">{details.organization || "—"}</p>
                  </div>
                  <div className="rounded border border-gold/10 bg-sea-surface/40 p-2 text-center">
                    <p className="text-[8px] uppercase text-parchment/40">Raça</p>
                    <p className="text-[10px]">{details.race || "—"}</p>
                  </div>
                </div>
                <p className="mb-2 text-[10px] uppercase tracking-widest text-parchment/50">Efeito</p>
                <p className="text-sm text-parchment/80">{details.effect || "Sem efeito registrado."}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function OpenPackButton({
  packs,
  loading,
  onOpen,
  className = "",
}: {
  packs: number;
  loading?: boolean;
  onOpen: () => void;
  className?: string;
}) {
  const disabled = packs <= 0 || !!loading;
  return (
    <button
      onClick={onOpen}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-all ${
        disabled
          ? "cursor-not-allowed border border-gold/15 bg-sea-deep/60 text-gold/40"
          : "bg-gradient-primary text-black shadow-glow"
      } ${className}`}
    >
      {disabled ? <PackLock /> : <PackIcon />}
      {loading ? "Abrindo..." : `Abrir pacote de cartas (${packs})`}
    </button>
  );
}

function PackIcon() {
  return <Sparkles className="size-3.5" />;
}

function PackLock() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
