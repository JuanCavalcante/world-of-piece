import type { InPlayCard } from "@/lib/tcg/duel";
import type { Duration, KeywordInstance, Modifier, StatusInstance } from "./types";

/** Status considerados negativos (removidos por Cleanse). */
export const NEGATIVE_STATUSES = ["LAZY", "SLEEP", "POISON", "IMMOBILIZED", "DISTRACTED"] as const;
/** Status que impedem a carta de ser alvo de ataques. */
export const STEALTH_STATUSES = ["STEALTH", "STEALTH_TEMP", "STEALTH_UNTIL_ATTACK"] as const;
/** Status/keywords que impedem atacar. */
const ATTACK_BLOCKERS = ["LAZY", "SLEEP", "IMMOBILIZED", "DISTRACTED"] as const;

export function hasStatus(card: InPlayCard, key: string): boolean {
  return (card.statuses ?? []).some((st) => st.key === key);
}

export function getStatus(card: InPlayCard, key: string): StatusInstance | undefined {
  return (card.statuses ?? []).find((st) => st.key === key);
}

/** Palavra-chave ativa: pode vir da lista de keywords ou de um status concedido. */
export function hasKeyword(card: InPlayCard, key: string): boolean {
  if ((card.keywords ?? []).some((kw) => kw.key === key)) return true;
  return hasStatus(card, key);
}

export function addStatus(
  card: InPlayCard,
  key: string,
  duration: Duration,
  turnCount: number,
  amount = 0,
): void {
  card.statuses = card.statuses ?? [];
  const stackable = key === "POISON";
  const existing = card.statuses.find((st) => st.key === key);
  if (existing && !stackable) {
    existing.duration = duration;
    existing.appliedTurn = turnCount;
    existing.amount = amount;
    return;
  }
  card.statuses.push({ key, duration, appliedTurn: turnCount, turnsLeft: null, amount });
}

export function addKeyword(
  card: InPlayCard,
  key: string,
  duration: Duration,
  source: string,
  turnCount: number,
): void {
  card.keywords = card.keywords ?? [];
  const existing = card.keywords.find((kw) => kw.key === key && kw.source === source);
  if (existing) return;
  card.keywords.push({ key, duration, source, appliedTurn: turnCount });
}

export function removeStatus(card: InPlayCard, key: string): boolean {
  const before = (card.statuses ?? []).length;
  card.statuses = (card.statuses ?? []).filter((st) => st.key !== key);
  return card.statuses.length !== before;
}

/** Guarda efetiva: keyword GUARD, status GUARD ou efeito legado — salvo supressão. */
export function isGuard(card: InPlayCard): boolean {
  if (hasStatus(card, "GUARD_DOWN")) return false;
  return hasKeyword(card, "GUARD") || card.effect_code === "GUARD";
}

/** Não pode ser alvo de ataques (furtividade / sono). */
export function isUntargetable(card: InPlayCard): boolean {
  if (hasStatus(card, "SLEEP")) return true;
  return STEALTH_STATUSES.some((st) => hasStatus(card, st));
}

/** Não pode atacar neste turno. */
export function blocksAttack(card: InPlayCard): boolean {
  if (hasKeyword(card, "CANNOT_ATTACK")) return true;
  return ATTACK_BLOCKERS.some((st) => hasStatus(card, st));
}

/** Sofrer dano desperta Preguiça, Sono e quebra Distração. */
export function wakeOnDamage(card: InPlayCard): void {
  removeStatus(card, "LAZY");
  removeStatus(card, "SLEEP");
  removeStatus(card, "DISTRACTED");
}

/** Remove condições negativas e debuffs de ATK. */
export function cleanse(card: InPlayCard): void {
  card.statuses = (card.statuses ?? []).filter(
    (st) => !(NEGATIVE_STATUSES as readonly string[]).includes(st.key),
  );
  card.mods = (card.mods ?? []).filter((m) => !(m.stat === "ATK" && m.amount < 0));
}

function expiredByOwnerTurn(appliedTurn: number, duration: Duration, turnCount: number): boolean {
  return duration === "UNTIL_NEXT_TURN" && turnCount > appliedTurn;
}

function tickList<T extends { duration: Duration; appliedTurn: number; turnsLeft?: number | null }>(
  list: T[],
  phase: "OWNER_START" | "TURN_END",
  turnCount: number,
): T[] {
  return list.filter((item) => {
    if (phase === "TURN_END" && item.duration === "END_OF_TURN") return false;
    if (phase === "OWNER_START") {
      if (expiredByOwnerTurn(item.appliedTurn, item.duration, turnCount)) return false;
      if (item.duration === "N_TURNS" && item.turnsLeft != null) {
        item.turnsLeft -= 1;
        if (item.turnsLeft <= 0) return false;
      }
    }
    return true;
  });
}

/** Início do turno do DONO da carta: expira "até o próximo turno", desperta Preguiça no 2º turno. */
export function tickOwnerTurnStart(card: InPlayCard, turnCount: number): void {
  card.statuses = tickList(card.statuses ?? [], "OWNER_START", turnCount);
  card.keywords = tickList(card.keywords ?? [], "OWNER_START", turnCount);
  card.mods = tickList(card.mods ?? [], "OWNER_START", turnCount);
  const lazy = getStatus(card, "LAZY");
  if (lazy && turnCount >= lazy.appliedTurn + 2) removeStatus(card, "LAZY");
}

/** Fim de qualquer turno: expira tudo que dura "até o fim do turno". */
export function tickTurnEnd(card: InPlayCard, turnCount: number): void {
  card.statuses = tickList(card.statuses ?? [], "TURN_END", turnCount);
  card.keywords = tickList(card.keywords ?? [], "TURN_END", turnCount);
  card.mods = tickList(card.mods ?? [], "TURN_END", turnCount);
}

/** Soma de um parâmetro numérico em habilidades passivas de um tipo (ex.: THORNS). */
export function passiveAmount(card: InPlayCard, effectKey: string, param = "amount"): number {
  return (card.abilities ?? [])
    .filter((ab) => ab.effectKey === effectKey && ab.trigger === "PASSIVE")
    .reduce((sum, ab) => sum + (Number(ab.params[param]) || 0), 0);
}

/** Classes protegidas por NO_COUNTER_CLASSES (Cobertura). */
export function noCounterClasses(card: InPlayCard): string[] {
  const out: string[] = [];
  (card.abilities ?? [])
    .filter((ab) => ab.effectKey === "KEYWORD" && ab.params["keyword"] === "NO_COUNTER_CLASSES")
    .forEach((ab) => {
      String(ab.params["classes"] ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .forEach((c) => out.push(c));
    });
  return out;
}
