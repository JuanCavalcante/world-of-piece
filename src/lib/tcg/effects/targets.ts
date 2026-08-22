import { other, type DuelState, type InPlayCard, type SideKey } from "@/lib/tcg/duel";
import { hasKeyword } from "./status";
import { targetMatchesCondition, type Condition } from "./conditions";
import type { TargetMode } from "./types";

export type FieldRef = { side: SideKey; slot: number; card: InPlayCard };

export type Resolved = {
  items: FieldRef[];
  hitPlayer: SideKey | null;
  needsChoice: boolean;
};

const CHOICE_MODES: TargetMode[] = ["ALLY_CHOSEN", "ENEMY_CHOSEN", "ANY_CHOSEN"];

/** Efeitos benéficos não podem mirar cartas com Imunidade a Suporte (Ignorante). */
function supportImmuneFilter(beneficial: boolean, sourceUid: string) {
  return (ref: FieldRef) =>
    !beneficial || ref.card.uid === sourceUid || !hasKeyword(ref.card, "IMMUNE_SUPPORT");
}

export function fieldRefs(s: DuelState, side: SideKey): FieldRef[] {
  const out: FieldRef[] = [];
  s[side].field.forEach((c, slot) => {
    if (c) out.push({ side, slot, card: c });
  });
  return out;
}

/** Lista de alvos válidos para uma escolha pendente (UI/IA). */
export function choiceCandidates(
  s: DuelState,
  sideKey: SideKey,
  mode: TargetMode,
  beneficial: boolean,
  sourceUid: string,
  condition?: Condition | null,
): FieldRef[] {
  const foe = other(sideKey);
  let pool: FieldRef[] = [];
  if (mode === "ALLY_CHOSEN") pool = fieldRefs(s, sideKey);
  else if (mode === "ENEMY_CHOSEN") pool = fieldRefs(s, foe);
  else if (mode === "ANY_CHOSEN") pool = [...fieldRefs(s, sideKey), ...fieldRefs(s, foe)];
  return pool
    .filter(supportImmuneFilter(beneficial, sourceUid))
    .filter((ref) => targetMatchesCondition(ref.card, condition));
}

export function isChoiceMode(mode: TargetMode): boolean {
  return CHOICE_MODES.includes(mode);
}

/**
 * Resolve os alvos de uma habilidade. `choice.targetUid` é exigido para modos
 * *_CHOSEN; sem ele (e com candidatos disponíveis) retorna needsChoice.
 */
export function resolveTargets(
  s: DuelState,
  sideKey: SideKey,
  source: InPlayCard,
  mode: TargetMode,
  opts: {
    beneficial: boolean;
    choice?: { targetUid?: string | null };
    condition?: Condition | null;
    attackTargetSlot?: number | null;
  },
): Resolved {
  const foe = other(sideKey);
  const none: Resolved = { items: [], hitPlayer: null, needsChoice: false };

  switch (mode) {
    case "SELF": {
      const slot = s[sideKey].field.findIndex((c) => c?.uid === source.uid);
      return slot === -1 ? none : { items: [{ side: sideKey, slot, card: source }], hitPlayer: null, needsChoice: false };
    }
    case "ENEMY_PLAYER":
      return { items: [], hitPlayer: foe, needsChoice: false };
    case "ALL_ALLIES":
      return { items: fieldRefs(s, sideKey).filter(supportImmuneFilter(opts.beneficial, source.uid)), hitPlayer: null, needsChoice: false };
    case "ALL_ENEMIES":
      return { items: fieldRefs(s, foe), hitPlayer: null, needsChoice: false };
    case "ALL_OTHER_ENEMIES":
      // usado em gatilhos de ataque: o alvo do ataque é tratado à parte
      return { items: fieldRefs(s, foe), hitPlayer: null, needsChoice: false };
    case "ALL_OTHERS":
      return {
        items: [...fieldRefs(s, sideKey), ...fieldRefs(s, foe)].filter((r) => r.card.uid !== source.uid),
        hitPlayer: null,
        needsChoice: false,
      };
    case "ADJACENT": {
      const t = opts.attackTargetSlot;
      if (t == null) return none;
      const items = [t - 1, t + 1]
        .filter((slot) => slot >= 0 && slot < s[foe].field.length && !!s[foe].field[slot])
        .map((slot) => ({ side: foe, slot, card: s[foe].field[slot]! }));
      return { items, hitPlayer: null, needsChoice: false };
    }
    case "ALLY_CHOSEN":
    case "ENEMY_CHOSEN":
    case "ANY_CHOSEN": {
      const candidates = choiceCandidates(s, sideKey, mode, opts.beneficial, source.uid, opts.condition);
      const uid = opts.choice?.targetUid;
      if (!uid) {
        return candidates.length ? { items: [], hitPlayer: null, needsChoice: true } : none;
      }
      const picked = candidates.find((r) => r.card.uid === uid);
      return picked ? { items: [picked], hitPlayer: null, needsChoice: false } : none;
    }
    default:
      return none;
  }
}
