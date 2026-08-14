import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getProfession, getProfessionMeta } from "@/lib/professions/catalog";
import {
  PROFESSION_TIERS,
  TIER_LABELS,
  TIER_ORDER,
  type Ability,
  type ProfessionTier,
} from "@/lib/professions/types";

export type ProfessionSlotValues = {
  professionId: string | null;
  tier: string | null;
  xpCurrent: number;
  xpMax: number;
  specialization: string | null;
  domain: string | null;
};

export type ProfessionSlotPatch = Partial<ProfessionSlotValues>;

export function ProfessionPanel({
  open,
  onOpenChange,
  slotLabel,
  values,
  onPatch,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  slotLabel: string;
  values: ProfessionSlotValues;
  onPatch: (patch: ProfessionSlotPatch) => void;
}) {
  const meta = getProfessionMeta(values.professionId);
  const data = getProfession(values.professionId);
  const currentTierOrder = values.tier ? TIER_ORDER[values.tier as ProfessionTier] ?? 0 : 0;
  const showSpec = currentTierOrder >= TIER_ORDER.TIER_IV;
  const showDomain = currentTierOrder >= TIER_ORDER.TIER_VIII;
  const selectedSpec = data?.specializations.find((s) => s.id === values.specialization) ?? null;
  const selectedDomain = selectedSpec?.domains.find((d) => d.id === values.domain) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        {meta?.image && (
          <div className="-mt-2 rounded-sm overflow-hidden border border-gold/20 bg-sea-surface/40">
            <img
              src={meta.image}
              alt={meta.name}
              className="w-full h-48 object-cover"
            />
          </div>
        )}
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-gold">
            {meta?.name ?? "—"}
          </DialogTitle>
          {data && (
            <DialogDescription className="whitespace-pre-line text-parchment/70 text-sm leading-relaxed">
              {data.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-3 mt-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Tier</Label>
            <Select
              value={values.tier ?? ""}
              onValueChange={(v) => onPatch({ tier: v || null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {PROFESSION_TIERS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIER_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">XP atual</Label>
            <Input
              type="number"
              min={0}
              max={10}
              value={values.xpCurrent}
              onChange={(e) => {
                const n = Math.max(0, Math.min(10, Number(e.target.value) || 0));
                const patch: ProfessionSlotPatch = { xpCurrent: n };
                if (values.xpMax !== 10) patch.xpMax = 10;
                onPatch(patch);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">XP máx</Label>
            <Input type="number" value={10} readOnly disabled />
          </div>
        </div>


        {!data && (
          <div className="mt-6 border border-gold/20 rounded-sm p-6 text-center text-parchment/60 text-sm bg-sea-surface/40">
            Conteúdo desta profissão em breve. O Tier e a XP já ficam salvos.
          </div>
        )}

        {data && data.specializations.length > 0 && showSpec && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Especialização</Label>
              <Select
                value={values.specialization ?? ""}
                onValueChange={(v) =>
                  onPatch({ specialization: v || null, domain: null })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {data.specializations.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showDomain && selectedSpec && (
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Domínio</Label>
                <Select
                  value={values.domain ?? ""}
                  onValueChange={(v) => onPatch({ domain: v || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedSpec.domains.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {data && (
          <div className="mt-6 space-y-6">
            <Section title={data.specializations.length > 0 ? "Habilidades Iniciais" : "Habilidades Gerais"}>
              <AbilityList abilities={data.initialAbilities} currentTier={values.tier} />
            </Section>


            {data.specializations.length > 0 && (
              <>
                <Section
                  title={
                    selectedSpec
                      ? `Especialização: ${selectedSpec.name}`
                      : "Especialização"
                  }
                >
                  {selectedSpec ? (
                    <>
                      <p className="text-sm text-parchment/70 leading-relaxed whitespace-pre-line mb-3">
                        {selectedSpec.description}
                      </p>
                      <AbilityList
                        abilities={selectedSpec.abilities}
                        currentTier={values.tier}
                      />
                    </>
                  ) : (
                    <EmptyHint
                      msg={
                        showSpec
                          ? "Escolha uma especialização acima para ver as habilidades."
                          : "Disponível a partir do Tier IV."
                      }
                    />
                  )}
                </Section>

                <Section
                  title={
                    selectedDomain
                      ? `Domínio: ${selectedDomain.name}`
                      : "Domínio"
                  }
                >
                  {selectedDomain ? (
                    <>
                      <p className="text-sm text-parchment/70 leading-relaxed whitespace-pre-line mb-3">
                        {selectedDomain.description}
                      </p>
                      <AbilityList
                        abilities={selectedDomain.abilities}
                        currentTier={values.tier}
                      />
                    </>
                  ) : (
                    <EmptyHint
                      msg={
                        showDomain && selectedSpec
                          ? "Escolha um domínio acima para ver as habilidades."
                          : "Disponível a partir do Tier VIII."
                      }
                    />
                  )}
                </Section>
              </>
            )}

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-serif text-lg text-gold border-b border-gold/20 pb-1 mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function EmptyHint({ msg }: { msg: string }) {
  return (
    <div className="border border-dashed border-gold/20 rounded-sm p-4 text-center text-xs text-parchment/50 bg-sea-surface/20">
      {msg}
    </div>
  );
}

function AbilityList({
  abilities,
  currentTier,
}: {
  abilities: Ability[];
  currentTier: string | null;
}) {
  return (
    <div className="space-y-3">
      {abilities.map((a) => {
        const isCurrent = currentTier === a.tier;
        const isUnlocked =
          currentTier && TIER_ORDER[currentTier as ProfessionTier] >= TIER_ORDER[a.tier];
        return (
          <div
            key={a.tier + a.title}
            className={`border rounded-sm p-4 ${
              isCurrent
                ? "border-gold bg-gold/5"
                : isUnlocked
                ? "border-gold/30 bg-sea-surface/40"
                : "border-gold/10 bg-sea-surface/20 opacity-70"
            }`}
          >
            <div className="flex items-center justify-between mb-2 gap-3">
              <h4 className="font-serif text-base text-parchment">{a.title}</h4>
              <Badge variant={isUnlocked ? "default" : "outline"} className="text-[10px]">
                {TIER_LABELS[a.tier]}
              </Badge>
            </div>
            <p className="text-sm text-parchment/75 leading-relaxed whitespace-pre-line">
              {a.body}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// Wrapper hook helper for opening panels controlled from outside if needed
export function useProfessionPanelState() {
  const [openSlot, setOpenSlot] = useState<1 | 2 | null>(null);
  return { openSlot, setOpenSlot };
}
