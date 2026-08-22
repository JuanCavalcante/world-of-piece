import type { DuelState, InPlayCard, SideKey } from "@/lib/tcg/duel";

/* ============ Vocabulário do Effect Engine v2 ============ */

export const TRIGGERS = [
  "PASSIVE",
  "ON_PLAY",
  "ON_ATTACK_DECLARED",
  "ON_ATTACK_RESOLVED",
  "ON_DESTROYED",
  "ON_ANY_DEATH",
  "ON_START_TURN",
  "ON_END_TURN",
] as const;
export type TriggerCode = (typeof TRIGGERS)[number];

export const TARGET_MODES = [
  "SELF",
  "ALLY_CHOSEN",
  "ENEMY_CHOSEN",
  "ANY_CHOSEN",
  "ALL_ALLIES",
  "ALL_ENEMIES",
  "ALL_OTHERS",
  "ALL_OTHER_ENEMIES",
  "ENEMY_PLAYER",
  "ADJACENT",
  "AURA_FILTER",
] as const;
export type TargetMode = (typeof TARGET_MODES)[number];

export const DURATIONS = [
  "INSTANT",
  "END_OF_TURN",
  "UNTIL_NEXT_TURN",
  "N_TURNS",
  "WHILE_IN_PLAY",
  "PERMANENT",
] as const;
export type Duration = (typeof DURATIONS)[number];

export const CONDITION_TYPES = [
  "NONE",
  "CONTROLS_CARD",
  "CONTROLS_CLASS",
  "CONTROLS_RACE",
  "CONTROLS_ORG",
  "CONTROLS_FAMILY",
  "CONTROLS_COST_MIN",
  "SELF_HP_FULL",
  "TARGET_HAS",
  "ALLY_COUNT_MIN",
] as const;
export type ConditionType = (typeof CONDITION_TYPES)[number];

/** Habilidade concreta de uma carta (linha de card_effects + catálogo). */
export type Ability = {
  effectKey: string;
  name: string;
  trigger: TriggerCode;
  target: TargetMode;
  condition: { type: ConditionType | string; value: string | null };
  params: Record<string, unknown>;
  slot: number;
};

export type StatusInstance = {
  key: string;
  duration: Duration;
  appliedTurn: number;
  turnsLeft: number | null;
  amount: number;
};

export type KeywordInstance = {
  key: string;
  duration: Duration;
  source: string;
  appliedTurn: number;
};

export type Modifier = {
  id: string;
  stat: "ATK" | "MAXHP";
  amount: number;
  duration: Duration;
  source: string;
  appliedTurn: number;
};

/** Escolha de alvo pendente (efeito "ao entrar" com alvo escolhido). */
export type PendingChoice = {
  side: SideKey;
  cardUid: string;
  abilityIndex: number;
};

export type GameEvent =
  | "CARD_PLAYED"
  | "ON_ATTACK_DECLARED"
  | "ON_ATTACK_RESOLVED"
  | "CARD_DAMAGED"
  | "ON_DESTROYED"
  | "ON_ANY_DEATH"
  | "ON_START_TURN"
  | "ON_END_TURN";

export type EventInfo = {
  side?: SideKey;
  source?: InPlayCard | null;
  victimSide?: SideKey;
  victimSlot?: number;
  deadSide?: SideKey;
  dead?: InPlayCard | null;
  amount?: number;
};

export type EmitFn = (s: DuelState, event: GameEvent, info: EventInfo) => void;

/** Alvo escolhido pelo jogador para resolver um efeito pendente. */
export type ChoiceInput = { targetUid: string | null };
