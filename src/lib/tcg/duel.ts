import type { TcgCard } from "@/lib/tcg/api";

export const EFFECT_CODES = [
  "NONE",
  "DRAW_1",
  "GAIN_1_AP",
  "HEAL_DEF_50",
  "BUFF_ATK_25",
  "BUFF_PS_30",
  "SWAP_WITH_DEFENSE",
  "DOUBLE_ATTACK",
  "GUARD",
] as const;

export type EffectCode = (typeof EFFECT_CODES)[number];

export const EFFECT_LABEL: Record<EffectCode, string> = {
  NONE: "Nenhum",
  DRAW_1: "Comprar 1 carta",
  GAIN_1_AP: "Ganhar 1 PA",
  HEAL_DEF_50: "Curar 50 HP de uma carta aliada",
  BUFF_ATK_25: "+25 ATK permanente",
  BUFF_PS_30: "+30 HP permanente",
  SWAP_WITH_DEFENSE: "Pode atacar no turno em que entra",
  DOUBLE_ATTACK: "Ataque duplo",
  GUARD: "Guarda (inimigo deve atacar esta carta)",
};

export const FIELD_SLOTS = 7;

export type InPlayCard = {
  uid: string;
  id: string;
  name: string;
  image_url: string | null;
  rarity: string;
  cost: number;
  atk: number;
  ps: number;
  maxPs: number;
  effect_code: EffectCode;
  effect: string | null;
  attacked: boolean;
  ready: boolean;
};

export type SideKey = "you" | "foe";

export type Side = {
  name: string;
  hp: number;
  maxHp: number;
  ap: number;
  maxAp: number;
  deck: InPlayCard[];
  hand: InPlayCard[];
  field: (InPlayCard | null)[];
  attacksUsed: number;
  /** Preenchido apenas em estados redigidos (PvP): contagem sem revelar as cartas. */
  handCount?: number;
  deckCount?: number;
};

export type LogEntry = { id: number; side: SideKey | "system"; text: string };

export type AttackTarget = { kind: "player" } | { kind: "card"; slot: number };

export type DuelState = {
  /** Versão do formato serializado do estado (usado no PvP persistido). */
  state_version?: number;
  you: Side;
  foe: Side;
  turn: SideKey;
  turnCount: number;
  log: LogEntry[];
  over: boolean;
  winner: SideKey | null;
  fx: { target: SideKey | null; kind: "hit" | "attack" | null; stamp: number };
};

/** Formato atual do DuelState serializado. Incrementar ao mudar a forma do estado. */
export const ENGINE_STATE_VERSION = 1;

const MAX_AP = 10;
export const START_HP = 30;
const START_HAND = 4;

const uid = () =>
  `c${Math.random().toString(36).slice(2, 9)}${Math.random().toString(36).slice(2, 6)}`;

export function pushLog(s: DuelState, side: SideKey | "system", text: string) {
  const lastId = s.log.length ? s.log[s.log.length - 1].id : 0;
  s.log = [...s.log, { id: lastId + 1, side, text }].slice(-80);
}


function toInPlay(c: TcgCard): InPlayCard {
  const anyCard = c as TcgCard & { atk?: number; effect_code?: string; effect?: string | null };
  const ps = Math.max(10, Number(c.power) || 50);
  const code = (anyCard.effect_code ?? "NONE") as EffectCode;
  return {
    uid: uid(),
    id: c.id,
    name: c.name,
    image_url: c.image_url,
    rarity: c.rarity,
    cost: Math.max(0, Math.min(10, Number(c.cost) || 0)),
    atk: Math.max(1, Number(anyCard.atk ?? 10)),
    ps,
    maxPs: ps,
    effect_code: EFFECT_CODES.includes(code) ? code : "NONE",
    effect: anyCard.effect ?? null,
    attacked: false,
    ready: false,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(pool: TcgCard[], size = 24): InPlayCard[] {
  if (!pool.length) return [];
  const out: InPlayCard[] = [];
  const bag = shuffle(pool);
  for (let i = 0; i < size; i++) out.push(toInPlay(bag[i % bag.length]));
  return shuffle(out);
}

function newSide(name: string, pool: TcgCard[], exact?: TcgCard[]): Side {
  const deck = exact?.length ? shuffle(exact.map(toInPlay)) : buildDeck(pool);
  const hand = deck.splice(0, START_HAND);
  return {
    name,
    hp: START_HP,
    maxHp: START_HP,
    ap: 1,
    maxAp: 1,
    deck,
    hand,
    field: Array.from({ length: FIELD_SLOTS }, () => null),
    attacksUsed: 0,
  };
}

export function createDuel(pool: TcgCard[], playerName = "Você", playerDeck?: TcgCard[]): DuelState {
  const s: DuelState = {
    state_version: ENGINE_STATE_VERSION,
    you: newSide(playerName, pool, playerDeck),
    foe: newSide("Adversário", pool),
    turn: "you",
    turnCount: 1,
    log: [],
    over: false,
    winner: null,
    fx: { target: null, kind: null, stamp: 0 },
  };

  pushLog(s, "system", `O duelo começou! Você tem ${START_HP} HP e 1 PA.`);
  return s;
}


export const other = (k: SideKey): SideKey => (k === "you" ? "foe" : "you");

function draw(s: DuelState, k: SideKey, n: number) {
  const side = s[k];
  for (let i = 0; i < n; i++) {
    const c = side.deck.shift();
    if (!c) {
      pushLog(s, k, `${side.name} está sem cartas no deck.`);
      return;
    }
    if (side.hand.length >= 8) {
      pushLog(s, k, `${side.name} descartou ${c.name} (mão cheia).`);
      continue;
    }
    side.hand.push(c);
  }
}

/** Nenhum ataque é permitido nos dois primeiros turnos (1º turno de cada lado).
 *  A partir daí, todas as cartas em campo podem atacar no mesmo turno. */
export function canAttackThisTurn(s: DuelState, _k: SideKey) {
  return s.turnCount > 2;
}

export function startTurn(s: DuelState, k: SideKey) {
  const side = s[k];
  side.attacksUsed = 0;
  side.field.forEach((c) => {
    if (c) {
      c.attacked = false;
      c.ready = true;
    }
  });
  side.maxAp = Math.min(MAX_AP, side.maxAp + 1);
  side.ap = side.maxAp;
  draw(s, k, 2);
  pushLog(s, k, `Turno de ${side.name} — ${side.ap}/${side.maxAp} PA.`);
}

function firstEmptyField(side: Side) {
  return side.field.findIndex((f) => f === null);
}

export function canPlay(s: DuelState, k: SideKey, cardUid: string) {
  const side = s[k];
  const card = side.hand.find((c) => c.uid === cardUid);
  if (!card) return false;
  return side.ap >= card.cost && firstEmptyField(side) !== -1;
}

export function playCard(s: DuelState, k: SideKey, cardUid: string, slot?: number) {
  const side = s[k];
  const idx = side.hand.findIndex((c) => c.uid === cardUid);
  if (idx === -1 || s.over) return;
  const card = side.hand[idx];
  const target = slot != null && side.field[slot] === null ? slot : firstEmptyField(side);
  if (target === -1) return;
  if (side.ap < card.cost) return;
  side.ap -= card.cost;
  side.hand.splice(idx, 1);
  card.attacked = false;
  card.ready = card.effect_code === "SWAP_WITH_DEFENSE";
  side.field[target] = card;
  pushLog(s, k, `${side.name} jogou ${card.name} (${card.cost} MP) no Campo.`);
  applyEffect(s, k, card);
}

function applyEffect(s: DuelState, k: SideKey, card: InPlayCard) {
  const side = s[k];
  switch (card.effect_code) {
    case "DRAW_1":
      draw(s, k, 1);
      pushLog(s, k, `Efeito de ${card.name}: comprou 1 carta.`);
      break;
    case "GAIN_1_AP":
      side.ap = Math.min(MAX_AP, side.ap + 1);
      pushLog(s, k, `Efeito de ${card.name}: +1 PA.`);
      break;
    case "HEAL_DEF_50": {
      const hurt = side.field
        .filter((c): c is InPlayCard => !!c && c.ps < c.maxPs)
        .sort((a, b) => a.ps / a.maxPs - b.ps / b.maxPs)[0];
      if (hurt) {
        hurt.ps = Math.min(hurt.maxPs, hurt.ps + 50);
        pushLog(s, k, `Efeito de ${card.name}: ${hurt.name} recuperou 50 HP.`);
      }
      break;
    }
    case "BUFF_ATK_25":
      card.atk += 25;
      pushLog(s, k, `Efeito de ${card.name}: +25 ATK.`);
      break;
    case "BUFF_PS_30":
      card.maxPs += 30;
      card.ps += 30;
      pushLog(s, k, `Efeito de ${card.name}: +30 HP.`);
      break;
    case "SWAP_WITH_DEFENSE":
      pushLog(s, k, `Efeito de ${card.name}: pode atacar neste turno.`);
      break;
    case "GUARD":
      pushLog(s, k, `Efeito de ${card.name}: Guarda — o inimigo é obrigado a atacá-la.`);
      break;
    default:
      break;
  }
}

export function hasGuard(side: Side) {
  return side.field.some((c) => !!c && c.effect_code === "GUARD");
}

/** Se o defensor tiver ao menos uma carta com Guarda, só é possível atacar essas cartas. */
export function isValidTarget(s: DuelState, k: SideKey, target: AttackTarget) {
  const foe = s[other(k)];
  if (!hasGuard(foe)) return target.kind === "player" || !!foe.field[target.slot];
  if (target.kind === "player") return false;
  return foe.field[target.slot]?.effect_code === "GUARD";
}

export function surrender(s: DuelState, k: SideKey) {
  if (s.over) return;
  s.over = true;
  s.winner = other(k);
  pushLog(s, "system", `${s[k].name} se rendeu. ${s[other(k)].name} venceu o duelo!`);
}

export function canAttack(s: DuelState, k: SideKey, cardUid: string) {
  if (s.over || s.turn !== k || !canAttackThisTurn(s, k)) return false;
  const card = s[k].field.find((c) => c?.uid === cardUid);
  return !!card && card.ready && !card.attacked;
}

export function attackWith(s: DuelState, k: SideKey, cardUid: string, target: AttackTarget) {
  if (s.over) return;
  const side = s[k];
  const foe = s[other(k)];
  const slotIdx = side.field.findIndex((c) => c?.uid === cardUid);
  const attacker = slotIdx === -1 ? null : side.field[slotIdx];
  if (!attacker || !attacker.ready || attacker.attacked) return;
  if (!canAttackThisTurn(s, k)) return;
  if (!isValidTarget(s, k, target)) {
    pushLog(s, k, `Há cartas com Guarda em campo — ataque-as primeiro.`);
    return;
  }
  attacker.attacked = true;
  side.attacksUsed += 1;
  const strikes = attacker.effect_code === "DOUBLE_ATTACK" ? 2 : 1;
  s.fx = { target: other(k), kind: "attack", stamp: Date.now() };

  for (let i = 0; i < strikes; i++) {
    if (s.over) break;
    if (!isValidTarget(s, k, target)) break;
    if (target.kind === "card") {
      const victim = foe.field[target.slot];
      if (!victim) break;
      victim.ps -= attacker.atk;
      pushLog(s, k, `${attacker.name} atacou ${victim.name} causando ${attacker.atk} de dano.`);
      s.fx = { target: other(k), kind: "hit", stamp: Date.now() + i };
      if (victim.ps <= 0) {
        pushLog(s, k, `${victim.name} foi destruída!`);
        foe.field[target.slot] = null;
        break;
      }
    } else {
      foe.hp -= attacker.atk;
      pushLog(s, k, `${attacker.name} atacou diretamente! ${foe.name} perdeu ${attacker.atk} HP.`);
      s.fx = { target: other(k), kind: "hit", stamp: Date.now() + i };
      if (foe.hp <= 0) {
        foe.hp = 0;
        s.over = true;
        s.winner = k;
        pushLog(s, "system", `${side.name} venceu o duelo!`);
        break;
      }
    }
  }
}

export function endTurn(s: DuelState) {
  if (s.over) return;
  const next = other(s.turn);
  s.turn = next;
  s.turnCount += 1;
  startTurn(s, next);
}

/* ---------------- IA simples ---------------- */

export function runAiTurn(s: DuelState) {
  const k: SideKey = "foe";
  const side = s.foe;

  // 1. jogar a carta de maior custo possível enquanto houver PA e espaço
  let guard = 0;
  while (guard++ < 10) {
    const playable = side.hand
      .filter((c) => c.cost <= side.ap)
      .sort((a, b) => b.cost - a.cost || b.atk - a.atk)[0];
    if (!playable || side.field.every((f) => f !== null)) break;
    playCard(s, k, playable.uid);
  }

  // 2. cada carta pronta escolhe um alvo
  guard = 0;
  while (guard++ < FIELD_SLOTS && !s.over && canAttackThisTurn(s, k)) {
    const attacker = side.field.find((c) => c && c.ready && !c.attacked);
    if (!attacker) break;
    const you = s.you;
    const guarded = hasGuard(you);
    // prioriza destruir uma carta inimiga que morra com este ataque (a de maior ATK)
    let bestSlot = -1;
    you.field.forEach((c, i) => {
      if (!c) return;
      if (guarded && c.effect_code !== "GUARD") return;
      const lethal = c.ps <= attacker.atk;
      if (!lethal) return;
      if (bestSlot === -1 || c.atk > (you.field[bestSlot]?.atk ?? 0)) bestSlot = i;
    });
    let target: AttackTarget =
      bestSlot !== -1 && Math.random() < 0.85 ? { kind: "card", slot: bestSlot } : { kind: "player" };
    if (guarded) {
      const guardSlot =
        bestSlot !== -1
          ? bestSlot
          : you.field.findIndex((c) => !!c && c.effect_code === "GUARD");
      if (guardSlot === -1) break;
      target = { kind: "card", slot: guardSlot };
    }
    attackWith(s, k, attacker.uid, target);
  }

  // 3. encerrar turno
  if (!s.over) endTurn(s);
}
