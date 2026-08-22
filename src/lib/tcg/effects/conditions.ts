import type { DuelState, InPlayCard, SideKey } from "@/lib/tcg/duel";

export type Condition = { type: string; value: string | null };

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

/** Avalia a condição de uma habilidade contra o tabuleiro do dono. */
export function checkCondition(
  s: DuelState,
  sideKey: SideKey,
  card: InPlayCard,
  cond: Condition | null | undefined,
): boolean {
  if (!cond || !cond.type || cond.type === "NONE") return true;
  const field = s[sideKey].field.filter((c): c is InPlayCard => !!c);
  const value = cond.value ?? "";
  switch (cond.type) {
    case "CONTROLS_CARD":
      return field.some((c) => norm(c.name) === norm(value));
    case "CONTROLS_CLASS":
      return field.some((c) => norm(c.type) === norm(value));
    case "CONTROLS_RACE":
      return field.some((c) => norm(c.race) === norm(value));
    case "CONTROLS_ORG":
      return field.some((c) => norm(c.organization) === norm(value));
    case "CONTROLS_FAMILY":
      return field.some((c) => norm(c.family) === norm(value));
    case "CONTROLS_COST_MIN": {
      const min = Number(value) || 0;
      return field.some((c) => c.cost >= min);
    }
    case "ALLY_COUNT_MIN": {
      const min = Number(value) || 0;
      return field.length >= min;
    }
    case "SELF_HP_FULL":
      return card.ps >= card.maxPs;
    case "TARGET_HAS":
      // avaliada por alvo em targetMatchesCondition; como condição geral, não bloqueia
      return true;
    default:
      return true;
  }
}

/** Condição aplicada sobre o ALVO escolhido (ex.: Subjugação — TARGET_HAS: Gigante). */
export function targetMatchesCondition(target: InPlayCard, cond: Condition | null | undefined): boolean {
  if (!cond || cond.type !== "TARGET_HAS") return true;
  const value = norm(cond.value);
  return norm(target.race) === value || norm(target.type) === value || norm(target.family) === value;
}
