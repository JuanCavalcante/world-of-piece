import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import {
  adminSaveCardEffects,
  listCardEffects,
  listEffectsCatalog,
  type TcgCardEffectRow,
  type TcgEffect,
} from "@/lib/tcg/api";
import { CONDITION_TYPES } from "@/lib/tcg/effects/types";

type SlotDraft = {
  effect_id: string;
  trigger_code: string;
  target_mode: string;
  condition_type: string;
  condition_value: string;
  params: Record<string, unknown>;
};

const EMPTY_SLOT: SlotDraft = {
  effect_id: "",
  trigger_code: "",
  target_mode: "",
  condition_type: "NONE",
  condition_value: "",
  params: {},
};

const CONDITION_LABEL: Record<string, string> = {
  NONE: "Sem condição",
  CONTROLS_CARD: "Controlar carta (nome)",
  CONTROLS_CLASS: "Controlar classe",
  CONTROLS_RACE: "Controlar raça",
  CONTROLS_ORG: "Controlar organização",
  CONTROLS_FAMILY: "Controlar família",
  CONTROLS_COST_MIN: "Controlar carta de custo ≥",
  SELF_HP_FULL: "Esta carta com HP cheio",
  TARGET_HAS: "Alvo possui (raça/tipo/família)",
  ALLY_COUNT_MIN: "Aliados em campo ≥",
};

function toDraft(row: TcgCardEffectRow | undefined): SlotDraft {
  if (!row) return { ...EMPTY_SLOT };
  return {
    effect_id: row.effect_id,
    trigger_code: row.trigger_code ?? "",
    target_mode: row.target_mode ?? "",
    condition_type: row.condition_type || "NONE",
    condition_value: row.condition_value ?? "",
    params: row.params ?? {},
  };
}

export function CardEffectsEditor({ cardId }: { cardId: string }) {
  const qc = useQueryClient();
  const { data: catalog } = useQuery({ queryKey: ["tcg-effects-catalog"], queryFn: listEffectsCatalog });
  const { data: current, isLoading } = useQuery({
    queryKey: ["tcg-card-effects", cardId],
    queryFn: () => listCardEffects(cardId),
  });
  const [slots, setSlots] = useState<SlotDraft[]>([{ ...EMPTY_SLOT }, { ...EMPTY_SLOT }, { ...EMPTY_SLOT }]);

  useEffect(() => {
    if (!current) return;
    const next = [{ ...EMPTY_SLOT }, { ...EMPTY_SLOT }, { ...EMPTY_SLOT }];
    current.slice(0, 3).forEach((row) => {
      if (row.slot >= 1 && row.slot <= 3) next[row.slot - 1] = toDraft(row);
    });
    setSlots(next);
  }, [current]);

  const save = useMutation({
    mutationFn: () =>
      adminSaveCardEffects(
        cardId,
        slots
          .map((s) => ({ ...s }))
          .filter((s) => s.effect_id)
          .map((s) => ({
            slot: 0,
            effect_id: s.effect_id,
            trigger_code: s.trigger_code || null,
            target_mode: s.target_mode || null,
            condition_type: s.condition_type,
            condition_value: s.condition_value || null,
            params: s.params,
          })),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tcg-card-effects", cardId] });
      qc.invalidateQueries({ queryKey: ["tcg-cards"] });
      toast.success("Efeitos da carta salvos.");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao salvar efeitos."),
  });

  const field =
    "w-full bg-sea-surface/60 border border-gold/15 px-2 py-1.5 text-xs rounded-lg focus:outline-none focus:border-gold";

  const effectOf = (id: string): TcgEffect | undefined => catalog?.find((e) => e.id === id);

  const update = (idx: number, patch: Partial<SlotDraft>) => {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  if (isLoading) return <p className="text-xs text-parchment/50">Carregando efeitos...</p>;

  return (
    <div className="rounded-xl border border-gold/20 bg-black/20 p-3 space-y-3">
      <p className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-gold/70">
        <Sparkles className="size-3.5" /> Efeitos (Effect Engine v2) — até 3 slots
      </p>
      {slots.map((slot, idx) => {
        const eff = effectOf(slot.effect_id);
        const schema = eff?.params_schema ?? {};
        return (
          <div key={idx} className="rounded-lg border border-gold/10 p-2.5 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] tracking-widest uppercase text-parchment/40">Efeito {idx + 1}</label>
                <select
                  className={field}
                  value={slot.effect_id}
                  onChange={(e) => {
                    const next = effectOf(e.target.value);
                    update(idx, {
                      effect_id: e.target.value,
                      trigger_code: next?.default_trigger ?? "",
                      target_mode: next?.allowed_targets?.[0] ?? "",
                      params: Object.fromEntries(
                        Object.entries(next?.params_schema ?? {}).map(([k, v]) => [k, v.default ?? ""]),
                      ),
                    });
                  }}
                >
                  <option value="" className="bg-sea-deep">— Nenhum —</option>
                  {(catalog ?? []).map((e) => (
                    <option key={e.id} value={e.id} className="bg-sea-deep">
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] tracking-widest uppercase text-parchment/40">Gatilho</label>
                <select
                  className={field}
                  value={slot.trigger_code}
                  disabled={!eff}
                  onChange={(e) => update(idx, { trigger_code: e.target.value })}
                >
                  {(eff?.allowed_triggers ?? []).map((t) => (
                    <option key={t} value={t} className="bg-sea-deep">{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] tracking-widest uppercase text-parchment/40">Alvo</label>
                <select
                  className={field}
                  value={slot.target_mode}
                  disabled={!eff}
                  onChange={(e) => update(idx, { target_mode: e.target.value })}
                >
                  {(eff?.allowed_targets ?? []).map((t) => (
                    <option key={t} value={t} className="bg-sea-deep">{t}</option>
                  ))}
                </select>
              </div>
            </div>
            {eff && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] tracking-widest uppercase text-parchment/40">Condição</label>
                    <select
                      className={field}
                      value={slot.condition_type}
                      onChange={(e) => update(idx, { condition_type: e.target.value })}
                    >
                      {CONDITION_TYPES.map((c) => (
                        <option key={c} value={c} className="bg-sea-deep">{CONDITION_LABEL[c] ?? c}</option>
                      ))}
                    </select>
                  </div>
                  {!["NONE", "SELF_HP_FULL"].includes(slot.condition_type) && (
                    <div>
                      <label className="text-[9px] tracking-widest uppercase text-parchment/40">Valor da condição</label>
                      <input
                        className={field}
                        value={slot.condition_value}
                        onChange={(e) => update(idx, { condition_value: e.target.value })}
                      />
                    </div>
                  )}
                </div>
                {Object.keys(schema).length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(schema).map(([key, def]) => (
                      <div key={key}>
                        <label className="text-[9px] tracking-widest uppercase text-parchment/40">
                          {def.label ?? key}
                        </label>
                        {def.type === "bool" ? (
                          <select
                            className={field}
                            value={String(slot.params[key] ?? def.default ?? false)}
                            onChange={(e) =>
                              update(idx, { params: { ...slot.params, [key]: e.target.value === "true" } })
                            }
                          >
                            <option value="false" className="bg-sea-deep">Não</option>
                            <option value="true" className="bg-sea-deep">Sim</option>
                          </select>
                        ) : def.type === "enum" ? (
                          <select
                            className={field}
                            value={String(slot.params[key] ?? def.default ?? "")}
                            onChange={(e) => update(idx, { params: { ...slot.params, [key]: e.target.value } })}
                          >
                            {(def.options ?? []).map((o) => (
                              <option key={o} value={o} className="bg-sea-deep">{o}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={def.type === "int" ? "number" : "text"}
                            className={field}
                            value={String(slot.params[key] ?? def.default ?? "")}
                            onChange={(e) =>
                              update(idx, {
                                params: {
                                  ...slot.params,
                                  [key]: def.type === "int" ? Number(e.target.value) || 0 : e.target.value,
                                },
                              })
                            }
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-parchment/40">{eff.description}</p>
              </>
            )}
          </div>
        );
      })}
      <button
        disabled={save.isPending}
        onClick={() => save.mutate()}
        className="px-4 py-2 rounded-xl border border-gold/40 text-[11px] tracking-widest uppercase text-gold hover:bg-gold/10 disabled:opacity-50"
      >
        Salvar efeitos
      </button>
    </div>
  );
}
