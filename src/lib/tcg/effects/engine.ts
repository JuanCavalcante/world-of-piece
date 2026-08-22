import { other, pushLog, type DuelState, type InPlayCard, type SideKey } from "@/lib/tcg/duel";
import type { Ability, EmitFn, EventInfo } from "./types";
import { checkCondition } from "./conditions";
import { choiceCandidates, type FieldRef } from "./targets";
import { runAbility } from "./registry";
import {
  NEGATIVE_STATUSES,
  addKeyword,
  hasKeyword,
  tickOwnerTurnStart,
  tickTurnEnd as tickCardTurnEnd,
} from "./status";
import { dealCardDamage } from "./damage";

/* ============================ barramento de eventos ============================ */

function eachFieldCard(s: DuelState, fn: (side: SideKey, slot: number, card: InPlayCard) => void) {
  (["you", "foe"] as SideKey[]).forEach((side) => {
    s[side].field.forEach((c, slot) => {
      if (c) fn(side, slot, c);
    });
  });
}

/** Executa habilidades de um gatilho para as cartas indicadas (escolha automática). */
function runTriggerFor(
  s: DuelState,
  side: SideKey,
  card: InPlayCard,
  trigger: Ability["trigger"],
  info?: EventInfo,
) {
  card.abilities.forEach((ability) => {
    if (ability.trigger !== trigger) return;
    const passed = checkCondition(s, side, card, ability.condition);
    // Reações a destruição decidem internamente (Logia Sangue); demais gatilhos exigem condição.
    if (!passed && ability.effectKey !== "ON_ANY_DEATH_TRIGGER") return;
    const result = runAbility({
      s,
      emit,
      side,
      card,
      ability,
      info: { ...info, conditionPassed: passed },
      choice: autoChoice(s, side, card, ability),
    });
    if (result === "choice") {
      // fora do ON_PLAY não há jogador para escolher: resolve com o 1º candidato válido
      runAbility({
        s,
        emit,
        side,
        card,
        ability,
        info: { ...info, conditionPassed: passed },
        choice: autoChoice(s, side, card, ability) ?? { targetUid: null },
      });
    }
  });
}

/** Escolha heurística para gatilhos automáticos (sem interação do jogador). */
function autoChoice(
  s: DuelState,
  side: SideKey,
  card: InPlayCard,
  ability: Ability,
): { targetUid: string | null } | undefined {
  const beneficial =
    ability.effectKey === "GRANT_STATUS"
      ? !(NEGATIVE_STATUSES as readonly string[]).includes(String(ability.params["status"] ?? ""))
      : ["HEAL_ON_PLAY", "BUFF_MAX_HP", "BUFF_ATK", "CLEANSE"].includes(ability.effectKey);
  const candidates = choiceCandidates(s, side, ability.target, beneficial, card.uid, ability.condition);
  if (!candidates.length) return undefined;
  const pick =
    ability.effectKey === "HEAL_ON_PLAY"
      ? [...candidates].sort((a, b) => a.card.ps / a.card.maxPs - b.card.ps / b.card.maxPs)[0]
      : [...candidates].sort((a, b) => b.card.atk - a.card.atk)[0];
  return { targetUid: pick.card.uid };
}

export const emit: EmitFn = (s, event, info) => {
  if (s.over && event !== "ON_ANY_DEATH" && event !== "ON_DESTROYED") return;
  switch (event) {
    case "ON_ANY_DEATH": {
      eachFieldCard(s, (side, _slot, card) => runTriggerFor(s, side, card, "ON_ANY_DEATH", info));
      break;
    }
    case "ON_START_TURN":
    case "ON_END_TURN": {
      const side = info.side;
      if (!side) break;
      s[side].field.forEach((c) => {
        if (c) runTriggerFor(s, side, c, event, info);
      });
      break;
    }
    case "ON_ATTACK_DECLARED":
    case "ON_ATTACK_RESOLVED": {
      const side = info.side;
      const source = info.source;
      if (!side || !source) break;
      runTriggerFor(s, side, source, event, info);
      break;
    }
    default:
      break;
  }
};

/* ================================ auras ================================ */

const csv = (v: unknown): string[] =>
  String(v ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

function auraMatches(params: Record<string, unknown>, source: InPlayCard, target: InPlayCard): boolean {
  if (params["include_self"] !== true && target.uid === source.uid) return false;
  const classes = csv(params["classes"]);
  if (classes.length && !classes.includes(String(target.type ?? "").toLowerCase())) return false;
  const races = csv(params["races"]);
  if (races.length && !races.includes(String(target.race ?? "").toLowerCase())) return false;
  const orgs = csv(params["organizations"]);
  if (orgs.length && !orgs.includes(String(target.organization ?? "").toLowerCase())) return false;
  const families = csv(params["families"]);
  if (families.length && !families.includes(String(target.family ?? "").toLowerCase())) return false;
  const costMin = Number(params["cost_min"]);
  if (Number.isFinite(costMin) && params["cost_min"] != null && params["cost_min"] !== "" && target.cost < costMin) return false;
  const costMax = Number(params["cost_max"]);
  if (Number.isFinite(costMax) && params["cost_max"] != null && params["cost_max"] !== "" && target.cost > costMax) return false;
  return true;
}

/**
 * Recalcula keywords base/condicionais e modificadores de aura, depois
 * regrava atk/maxPs efetivos a partir dos valores base + modificadores.
 * Deve ser chamada após qualquer mudança estrutural no campo.
 */
export function recomputeAuras(s: DuelState): void {
  // 1. limpa entradas derivadas (base/condicional/aura)
  eachFieldCard(s, (_side, _slot, card) => {
    card.keywords = (card.keywords ?? []).filter(
      (kw) => !kw.source.startsWith("base:") && !kw.source.startsWith("cond:"),
    );
    card.mods = (card.mods ?? []).filter((m) => !m.source.startsWith("aura:"));
  });

  // 2. keywords base e condicionais
  eachFieldCard(s, (side, _slot, card) => {
    card.abilities.forEach((ab) => {
      if (ab.effectKey === "KEYWORD") {
        const kw = String(ab.params["keyword"] ?? "");
        if (!kw || kw === "NO_COUNTER_CLASSES") return;
        const hasCond = ab.condition && ab.condition.type !== "NONE";
        if (!hasCond) addKeyword(card, kw, "PERMANENT", `base:${ab.slot}`, 0);
        else if (checkCondition(s, side, card, ab.condition))
          addKeyword(card, kw, "PERMANENT", `cond:${ab.slot}`, s.turnCount);
      }
      if (ab.effectKey === "CONDITIONAL_KEYWORD") {
        const kw = String(ab.params["keyword"] ?? "");
        if (kw && checkCondition(s, side, card, ab.condition))
          addKeyword(card, kw, "PERMANENT", `cond:${ab.slot}`, s.turnCount);
      }
    });
  });

  // 3. auras
  (["you", "foe"] as SideKey[]).forEach((side) => {
    s[side].field.forEach((source) => {
      if (!source) return;
      source.abilities.forEach((ab) => {
        if (ab.trigger !== "PASSIVE") return;
        const stat = ab.effectKey === "AURA_BUFF_ATK" ? "ATK" : ab.effectKey === "AURA_BUFF_MAX_HP" ? "MAXHP" : null;
        if (!stat) return;
        if (!checkCondition(s, side, source, ab.condition)) return;
        const amount = Number(ab.params["amount"]) || 0;
        if (!amount) return;
        s[side].field.forEach((target) => {
          if (!target || !auraMatches(ab.params, source, target)) return;
          if (stat === "ATK" && amount < 0 && hasKeyword(target, "IMMUNE_DEBUFF_ATK")) return;
          target.mods.push({
            id: `aura:${source.uid}:${ab.slot}:${target.uid}`,
            stat,
            amount,
            duration: "WHILE_IN_PLAY",
            source: `aura:${source.uid}:${ab.slot}`,
            appliedTurn: s.turnCount,
          });
        });
      });
    });
  });

  // 4. regrava valores efetivos
  eachFieldCard(s, (_side, _slot, card) => {
    const atkMod = (card.mods ?? []).filter((m) => m.stat === "ATK").reduce((a, m) => a + m.amount, 0);
    const hpMod = (card.mods ?? []).filter((m) => m.stat === "MAXHP").reduce((a, m) => a + m.amount, 0);
    card.atk = Math.max(0, (card.baseAtk ?? card.atk) + atkMod);
    const newMax = Math.max(1, (card.baseMaxPs ?? card.maxPs) + hpMod);
    if (newMax !== card.maxPs) {
      card.maxPs = newMax;
      if (card.ps > newMax) card.ps = newMax;
    }
  });
}

/* ============================ passagem de turno ============================ */

/** Início do turno do lado: expira efeitos "até o próximo turno", desperta Preguiça. */
export function tickTurnStart(s: DuelState, side: SideKey): void {
  s[side].field.forEach((c) => {
    if (c) tickOwnerTurnStart(c, s.turnCount);
  });
}

/** Fim do turno do lado: Envenenamento e expiração de efeitos "até o fim do turno". */
export function tickTurnEnd(s: DuelState, endingSide: SideKey): void {
  // Envenenamento das cartas do dono do turno
  const snapshot = s[endingSide].field.map((c, slot) => ({ c, slot }));
  snapshot.forEach(({ c, slot }) => {
    if (!c) return;
    const poison = (c.statuses ?? []).filter((st) => st.key === "POISON");
    if (!poison.length) return;
    const total = poison.reduce((a, st) => a + (st.amount || 1), 0);
    dealCardDamage(s, emit, endingSide, slot, total, { label: "Envenenamento" });
  });
  (["you", "foe"] as SideKey[]).forEach((side) => {
    s[side].field.forEach((c) => {
      if (c) tickCardTurnEnd(c, s.turnCount);
    });
  });
}

/* ====================== efeitos "ao entrar" e escolhas ====================== */

/** Roda as habilidades ON_PLAY da carta; registra pendingChoice se faltar alvo. */
export function playAbilities(
  s: DuelState,
  side: SideKey,
  card: InPlayCard,
  fromIndex = 0,
  choice?: { targetUid?: string | null },
): void {
  for (let i = fromIndex; i < card.abilities.length; i++) {
    const ability = card.abilities[i];
    if (ability.trigger !== "ON_PLAY") continue;
    if (!checkCondition(s, side, card, ability.condition)) continue;
    const result = runAbility({ s, emit, side, card, ability, choice: i === fromIndex ? choice : undefined });
    if (result === "choice") {
      s.pendingChoice = { side, cardUid: card.uid, abilityIndex: i };
      pushLog(s, side, `${card.name}: escolha um alvo para ${ability.name}.`);
      return;
    }
    if (s.over) return;
  }
}

/** Resolve a escolha pendente (targetUid null = jogador ignorou o efeito). */
export function resolveChoice(s: DuelState, side: SideKey, targetUid: string | null): boolean {
  const pc = s.pendingChoice;
  if (!pc || pc.side !== side) return false;
  const card = s[side].field.find((c) => c?.uid === pc.cardUid);
  s.pendingChoice = null;
  if (!card) return true;
  const ability = card.abilities[pc.abilityIndex];
  if (targetUid && ability) {
    runAbility({ s, emit, side, card, ability, choice: { targetUid } });
  }
  if (!s.over) playAbilities(s, side, card, pc.abilityIndex + 1);
  recomputeAuras(s);
  return true;
}

/** Alvos válidos da escolha pendente de um lado (para destacar na UI). */
export function pendingChoiceTargets(s: DuelState, side: SideKey): FieldRef[] {
  const pc = s.pendingChoice;
  if (!pc || pc.side !== side) return [];
  const card = s[side].field.find((c) => c?.uid === pc.cardUid);
  const ability = card?.abilities[pc.abilityIndex];
  if (!card || !ability) return [];
  const beneficial = ["HEAL_ON_PLAY", "BUFF_MAX_HP", "BUFF_ATK", "CLEANSE"].includes(ability.effectKey);
  return choiceCandidates(s, side, ability.target, beneficial, card.uid, ability.condition);
}

/** A IA resolve automaticamente qualquer escolha pendente do lado dela. */
export function aiAutoResolve(s: DuelState, side: SideKey): void {
  let guard = 0;
  while (s.pendingChoice && s.pendingChoice.side === side && guard++ < 5) {
    const card = s[side].field.find((c) => c?.uid === s.pendingChoice?.cardUid);
    const ability = card?.abilities[s.pendingChoice.abilityIndex];
    if (!card || !ability) {
      s.pendingChoice = null;
      return;
    }
    const pick = autoChoice(s, side, card, ability);
    resolveChoice(s, side, pick?.targetUid ?? null);
  }
}

/* ============================ compatibilidade ============================ */

/** Preenche os campos do motor v2 em estados antigos (state_version 1). */
export function normalizeState(s: DuelState): DuelState {
  const fix = (c: InPlayCard | null | undefined) => {
    if (!c) return;
    c.mods = c.mods ?? [];
    c.keywords = c.keywords ?? [];
    c.statuses = c.statuses ?? [];
    c.abilities = c.abilities ?? [];
    c.baseAtk = c.baseAtk ?? c.atk;
    c.baseMaxPs = c.baseMaxPs ?? c.maxPs;
    c.family = c.family ?? null;
    c.type = c.type ?? null;
    c.race = c.race ?? null;
    c.organization = c.organization ?? null;
  };
  (["you", "foe"] as SideKey[]).forEach((side) => {
    s[side].field.forEach(fix);
    s[side].hand.forEach(fix);
    s[side].deck.forEach(fix);
  });
  s.pendingChoice = s.pendingChoice ?? null;
  s.state_version = 2;
  return s;
}

export { other };
