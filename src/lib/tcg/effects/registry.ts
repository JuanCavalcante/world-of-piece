import { other, pushLog, type DuelState, type InPlayCard, type SideKey } from "@/lib/tcg/duel";
import type { Ability, Duration, EmitFn, EventInfo } from "./types";
import { resolveTargets } from "./targets";
import { checkCondition } from "./conditions";
import {
  NEGATIVE_STATUSES,
  addKeyword,
  addStatus,
  cleanse,
  hasKeyword,
} from "./status";
import { dealCardDamage, damagePlayer } from "./damage";

export type AbilityCtx = {
  s: DuelState;
  emit: EmitFn;
  side: SideKey;
  card: InPlayCard;
  ability: Ability;
  choice?: { targetUid?: string | null };
  info?: EventInfo & { conditionPassed?: boolean };
};

const num = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const asDuration = (v: unknown, d: Duration): Duration => {
  const s = String(v ?? "");
  return (["INSTANT", "END_OF_TURN", "UNTIL_NEXT_TURN", "N_TURNS", "WHILE_IN_PLAY", "PERMANENT"] as const).includes(
    s as Duration,
  )
    ? (s as Duration)
    : d;
};

/** Efeitos que beneficiam aliados (respeitam Imunidade a Suporte). */
const BENEFICIAL = new Set(["HEAL_ON_PLAY", "BUFF_MAX_HP", "BUFF_ATK", "CLEANSE"]);

function isBeneficial(ability: Ability): boolean {
  if (ability.effectKey === "GRANT_STATUS") {
    return !(NEGATIVE_STATUSES as readonly string[]).includes(String(ability.params["status"] ?? ""));
  }
  return BENEFICIAL.has(ability.effectKey);
}

function addMod(
  target: InPlayCard,
  stat: "ATK" | "MAXHP",
  amount: number,
  duration: Duration,
  source: string,
  turnCount: number,
): boolean {
  if (stat === "ATK" && amount < 0 && hasKeyword(target, "IMMUNE_DEBUFF_ATK")) return false;
  target.mods = target.mods ?? [];
  target.mods.push({
    id: `mod:${source}:${Math.random().toString(36).slice(2, 8)}`,
    stat,
    amount,
    duration: duration === "INSTANT" ? "END_OF_TURN" : duration,
    source,
    appliedTurn: turnCount,
  });
  return true;
}

/** Imunidade a status (ex.: Abbadon imune a Preguiça com Morningstar em campo). */
function immuneToStatus(s: DuelState, side: SideKey, target: InPlayCard, statusKey: string): boolean {
  return (target.abilities ?? []).some(
    (ab) =>
      ab.effectKey === "IMMUNE_STATUS" &&
      String(ab.params["status"] ?? "") === statusKey &&
      checkCondition(s, side, target, ab.condition),
  );
}

function heal(target: InPlayCard, amount: number): number {
  const before = target.ps;
  target.ps = Math.min(target.maxPs, target.ps + amount);
  return target.ps - before;
}

/**
 * Executa uma habilidade. Retorna "choice" quando o efeito exige alvo escolhido
 * e nenhum foi informado — o motor registra `pendingChoice` no estado.
 */
export function runAbility(ctx: AbilityCtx): "ok" | "choice" {
  const { s, emit, side, card, ability } = ctx;
  const p = ability.params;
  const key = ability.effectKey;

  switch (key) {
    /* -------- passivos: resolvidos por recomputeAuras / pipeline de dano -------- */
    case "KEYWORD":
    case "CONDITIONAL_KEYWORD":
    case "IMMUNE_STATUS":
    case "IRREDUCIBLE_BONUS":
    case "DAMAGE_REDUCTION":
    case "THORNS":
    case "AURA_BUFF_ATK":
    case "AURA_BUFF_MAX_HP":
      return "ok";

    /* ---------------------------------- DANO ---------------------------------- */
    case "DAMAGE_ON_PLAY": {
      const amount = num(p["amount"], 1);
      const targets = resolveTargets(s, side, card, ability.target, {
        beneficial: false,
        choice: ctx.choice,
        condition: ability.condition,
      });
      if (targets.needsChoice) return "choice";
      targets.items.forEach((t) =>
        dealCardDamage(s, emit, t.side, t.slot, amount, { label: ability.name }),
      );
      return "ok";
    }
    case "DAMAGE_PLAYER_ON_PLAY": {
      damagePlayer(s, other(side), num(p["amount"], 2), card.name);
      return "ok";
    }
    case "DAMAGE_ON_ATTACK": {
      const amount = num(p["amount"], 1);
      const foe = other(side);
      const skipSlot = ctx.info?.victimSlot;
      s[foe].field.forEach((c, slot) => {
        if (!c || slot === skipSlot) return;
        dealCardDamage(s, emit, foe, slot, amount, { label: ability.name });
      });
      return "ok";
    }
    case "SPLASH_ON_ATTACK": {
      const amount = num(p["amount"], 1);
      const targets = resolveTargets(s, side, card, "ADJACENT", {
        beneficial: false,
        attackTargetSlot: ctx.info?.victimSlot ?? null,
      });
      targets.items.forEach((t) =>
        dealCardDamage(s, emit, t.side, t.slot, amount, { label: ability.name }),
      );
      return "ok";
    }
    case "DEBUFF_ATK": {
      const amount = num(p["amount"], 2);
      const duration = asDuration(p["duration"], "END_OF_TURN");
      const targets = resolveTargets(s, side, card, ability.target, {
        beneficial: false,
        choice: ctx.choice,
        condition: ability.condition,
      });
      if (targets.needsChoice) return "choice";
      targets.items.forEach((t) => {
        if (addMod(t.card, "ATK", -amount, duration, `fx:${card.uid}`, s.turnCount)) {
          pushLog(s, t.side, `Efeito de ${card.name}: ${t.card.name} perdeu ${amount} ATK.`);
        }
      });
      return "ok";
    }
    case "SELF_DAMAGE_EOT": {
      const slot = s[side].field.findIndex((c) => c?.uid === card.uid);
      if (slot !== -1) dealCardDamage(s, emit, side, slot, num(p["amount"], 1), { label: ability.name });
      return "ok";
    }
    case "HEAL_SELF_EOT": {
      const healed = heal(card, num(p["amount"], 1));
      if (healed > 0) pushLog(s, side, `Efeito de ${card.name}: recuperou ${healed} HP.`);
      return "ok";
    }

    /* -------------------------------- BUFF/CURA -------------------------------- */
    case "HEAL_ON_PLAY": {
      const amount = num(p["amount"], 1);
      const targets = resolveTargets(s, side, card, ability.target, {
        beneficial: true,
        choice: ctx.choice,
        condition: ability.condition,
      });
      if (targets.needsChoice) return "choice";
      targets.items.forEach((t) => {
        const healed = heal(t.card, amount);
        if (healed > 0) pushLog(s, t.side, `Efeito de ${card.name}: ${t.card.name} recuperou ${healed} HP.`);
      });
      return "ok";
    }
    case "BUFF_MAX_HP": {
      const amount = num(p["amount"], 1);
      const duration = asDuration(p["duration"], "PERMANENT");
      const targets = resolveTargets(s, side, card, ability.target, {
        beneficial: true,
        choice: ctx.choice,
        condition: ability.condition,
      });
      if (targets.needsChoice) return "choice";
      targets.items.forEach((t) => {
        addMod(t.card, "MAXHP", amount, duration, `fx:${card.uid}`, s.turnCount);
        if (p["also_heal"] !== false) t.card.ps += amount;
        pushLog(s, t.side, `Efeito de ${card.name}: ${t.card.name} ganhou +${amount} HP máximo.`);
      });
      return "ok";
    }
    case "BUFF_ATK": {
      const amount = num(p["amount"], 2);
      const duration = asDuration(p["duration"], "PERMANENT");
      const targets = resolveTargets(s, side, card, ability.target, {
        beneficial: true,
        choice: ctx.choice,
        condition: ability.condition,
      });
      if (targets.needsChoice) return "choice";
      targets.items.forEach((t) => {
        addMod(t.card, "ATK", amount, duration, `fx:${card.uid}`, s.turnCount);
        if (p["grant_ignore_guard"]) {
          addKeyword(t.card, "IGNORE_GUARD", "END_OF_TURN", `fx:${card.uid}`, s.turnCount);
        }
        pushLog(s, t.side, `Efeito de ${card.name}: ${t.card.name} ganhou +${amount} ATK.`);
      });
      return "ok";
    }
    case "COPY_ATK_ON_PLAY": {
      const targets = resolveTargets(s, side, card, ability.target, {
        beneficial: false,
        choice: ctx.choice,
        condition: ability.condition,
      });
      if (targets.needsChoice) return "choice";
      const t = targets.items[0];
      if (t) {
        card.baseAtk = Math.max(0, t.card.atk);
        pushLog(s, side, `Efeito de ${card.name}: copiou o ATK de ${t.card.name} (${card.baseAtk}).`);
      }
      return "ok";
    }

    /* --------------------------------- STATUS --------------------------------- */
    case "GRANT_STATUS": {
      const statusKey = String(p["status"] ?? "RUSH");
      const duration = asDuration(p["duration"], "PERMANENT");
      const targets = resolveTargets(s, side, card, ability.target, {
        beneficial: isBeneficial(ability),
        choice: ctx.choice,
        condition: ability.condition,
      });
      if (targets.needsChoice) return "choice";
      targets.items.forEach((t) => {
        if (immuneToStatus(s, t.side, t.card, statusKey)) {
          pushLog(s, t.side, `${t.card.name} é imune a ${statusKey}.`);
          return;
        }
        addStatus(t.card, statusKey, duration, s.turnCount, num(p["amount"], 0));
        if (statusKey === "RUSH") t.card.ready = true;
        pushLog(s, t.side, `Efeito de ${card.name}: ${t.card.name} recebeu ${ability.name}.`);
      });
      return "ok";
    }
    case "CLEANSE": {
      const targets = resolveTargets(s, side, card, ability.target, {
        beneficial: true,
        choice: ctx.choice,
        condition: ability.condition,
      });
      if (targets.needsChoice) return "choice";
      targets.items.forEach((t) => {
        cleanse(t.card);
        pushLog(s, t.side, `Efeito de ${card.name}: condições de ${t.card.name} removidas.`);
      });
      return "ok";
    }
    case "REMOVE_GUARD_ON_ATTACK": {
      const duration = asDuration(p["duration"], "UNTIL_NEXT_TURN");
      const foe = other(side);
      s[foe].field.forEach((c) => {
        if (!c) return;
        addStatus(c, "GUARD_DOWN", duration, s.turnCount);
      });
      pushLog(s, side, `Efeito de ${card.name}: Guarda inimiga removida temporariamente.`);
      return "ok";
    }

    /* -------------------------------- ESPECIAL -------------------------------- */
    case "ON_ANY_DEATH_TRIGGER": {
      const healAmount = num(p["heal_amount"], 0);
      const buffAmount = num(p["buff_amount"], 0);
      const cond = ability.condition;
      const hasCond = cond && cond.type && cond.type !== "NONE";
      const passed = ctx.info?.conditionPassed ?? !hasCond;
      if (hasCond) {
        if (passed && buffAmount > 0) {
          card.baseMaxPs += buffAmount;
          card.ps += buffAmount;
          pushLog(s, side, `Efeito de ${card.name}: +${buffAmount} HP máximo.`);
        } else if (!passed && healAmount > 0) {
          const healed = heal(card, healAmount);
          if (healed > 0) pushLog(s, side, `Efeito de ${card.name}: recuperou ${healed} HP.`);
        }
      } else {
        if (healAmount > 0) heal(card, healAmount);
        if (buffAmount > 0) {
          card.baseMaxPs += buffAmount;
          card.ps += buffAmount;
        }
      }
      return "ok";
    }

    default:
      return "ok";
  }
}
