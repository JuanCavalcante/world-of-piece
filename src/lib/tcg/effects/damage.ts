import { pushLog, type DuelState, type SideKey } from "@/lib/tcg/duel";
import type { EmitFn } from "./types";
import { passiveAmount, wakeOnDamage } from "./status";

/**
 * Pipeline central de dano em carta.
 * Ordem: bônus irredutível do atacante → redução do alvo (não reduz irredutível)
 * → aplicação → despertar de status → destruição → eventos.
 */
export function dealCardDamage(
  s: DuelState,
  emit: EmitFn,
  victimSide: SideKey,
  slot: number,
  rawAmount: number,
  opts: { irreducible?: number; ignoreReduction?: boolean; label?: string } = {},
): { dealt: number; died: boolean } {
  const victim = s[victimSide].field[slot];
  if (!victim || s.over) return { dealt: 0, died: false };

  const reduction = opts.ignoreReduction ? 0 : passiveAmount(victim, "DAMAGE_REDUCTION");
  const reducible = Math.max(0, Math.round(rawAmount) - reduction);
  const total = reducible + Math.max(0, Math.round(opts.irreducible ?? 0));

  if (total <= 0) {
    pushLog(s, victimSide, `${victim.name} resistiu ao dano${reduction > 0 ? " (redução)" : ""}.`);
    return { dealt: 0, died: false };
  }

  victim.ps -= total;
  pushLog(s, victimSide, `${victim.name} sofreu ${total} de dano${opts.label ? ` (${opts.label})` : ""}.`);
  wakeOnDamage(victim);
  emit(s, "CARD_DAMAGED", { side: victimSide, victimSide, victimSlot: slot, amount: total });

  if (victim.ps <= 0) {
    destroyCard(s, emit, victimSide, slot);
    return { dealt: total, died: true };
  }
  return { dealt: total, died: false };
}

/** Remove a carta do campo e dispara os eventos de destruição. */
export function destroyCard(s: DuelState, emit: EmitFn, side: SideKey, slot: number): void {
  const dead = s[side].field[slot];
  if (!dead) return;
  s[side].field[slot] = null;
  pushLog(s, side, `${dead.name} foi destruída!`);
  emit(s, "ON_DESTROYED", { side, deadSide: side, dead });
  emit(s, "ON_ANY_DEATH", { side, deadSide: side, dead });
}

/** Dano direto ao perfil do jogador (sem redução). Encerra o duelo ao zerar. */
export function damagePlayer(
  s: DuelState,
  victimSide: SideKey,
  amount: number,
  sourceName?: string,
): void {
  if (s.over) return;
  const side = s[victimSide];
  const dmg = Math.max(0, Math.round(amount));
  if (dmg <= 0) return;
  side.hp -= dmg;
  pushLog(
    s,
    victimSide,
    `${side.name} perdeu ${dmg} HP${sourceName ? ` (${sourceName})` : ""}.`,
  );
  s.fx = { target: victimSide, kind: "hit", stamp: Date.now() };
  if (side.hp <= 0) {
    side.hp = 0;
    s.over = true;
    s.winner = victimSide === "you" ? "foe" : "you";
    pushLog(s, "system", `${s[s.winner].name} venceu o duelo!`);
  }
}
