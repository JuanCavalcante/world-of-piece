import { describe, expect, test } from "bun:test";
import {
  attackWith,
  createPvpDuel,
  endTurn,
  playCard,
  type DuelState,
  type InPlayCard,
} from "@/lib/tcg/duel";
import { recomputeAuras, tickTurnEnd, tickTurnStart } from "@/lib/tcg/effects/engine";
import {
  addStatus,
  blocksAttack,
  cleanse,
  hasStatus,
  isGuard,
  isUntargetable,
  removeStatus,
  wakeOnDamage,
} from "@/lib/tcg/effects/status";
import type { Ability } from "@/lib/tcg/effects/types";
import type { TcgCard } from "@/lib/tcg/api";

let n = 0;
function mkCard(over: Partial<TcgCard> & { abilities?: Ability[] } = {}): TcgCard {
  n += 1;
  return {
    id: `st-card-${n}`,
    name: over.name ?? `Carta ${n}`,
    rarity: "COMUM",
    image_url: null,
    power: over.power ?? 10,
    effect: null,
    cost: over.cost ?? 0,
    atk: over.atk ?? 2,
    effect_code: "NONE",
    type: over.type ?? "Lutador",
    organization: over.organization ?? null,
    race: over.race ?? null,
    family: over.family ?? null,
    status: "ACTIVE",
    abilities: over.abilities ?? [],
  };
}

const ab = (partial: Partial<Ability> & Pick<Ability, "effectKey">): Ability => ({
  name: partial.effectKey,
  trigger: "PASSIVE",
  target: "SELF",
  condition: { type: "NONE", value: null },
  params: {},
  slot: 1,
  ...partial,
});

const filler = () => mkCard({ power: 5, atk: 1 });
const fiveFillers = () => [filler(), filler(), filler(), filler(), filler()];

function putOnField(s: DuelState, side: "you" | "foe", card: TcgCard, slot: number): InPlayCard {
  const tcg = { ...card, cost: 0 };
  const aux = createPvpDuel("a", [tcg, tcg, tcg, tcg, tcg], "b", [tcg, tcg, tcg, tcg, tcg]);
  s[side].hand.push(aux.you.hand[0]);
  s[side].ap = 10;
  const handCard = s[side].hand[s[side].hand.length - 1];
  playCard(s, side, handCard.uid, slot);
  return s[side].field[slot]!;
}

function newDuel(): DuelState {
  return createPvpDuel("P1", fiveFillers(), "P2", fiveFillers());
}

/** Avança um turno completo (fim do turno atual + início do próximo). */
function passTurn(s: DuelState) {
  endTurn(s);
}

describe("Status Engine — durações", () => {
  test("END_OF_TURN expira no fim do turno", () => {
    const s = newDuel();
    const c = putOnField(s, "you", mkCard({ name: "Alvo" }), 0);
    addStatus(c, "DISTRACTED", "END_OF_TURN", s.turnCount);
    expect(hasStatus(c, "DISTRACTED")).toBe(true);
    passTurn(s);
    expect(hasStatus(s.you.field[0]!, "DISTRACTED")).toBe(false);
  });

  test("UNTIL_NEXT_TURN sobrevive ao turno do oponente e expira no turno do dono", () => {
    const s = newDuel();
    const c = putOnField(s, "you", mkCard({ name: "Furtiva" }), 0);
    addStatus(c, "STEALTH_TEMP", "UNTIL_NEXT_TURN", s.turnCount);
    expect(isUntargetable(c)).toBe(true);
    passTurn(s); // turno do oponente
    expect(hasStatus(s.you.field[0]!, "STEALTH_TEMP")).toBe(true);
    passTurn(s); // volta para o dono
    expect(hasStatus(s.you.field[0]!, "STEALTH_TEMP")).toBe(false);
  });

  test("N_TURNS decrementa a cada início de turno do dono", () => {
    const s = newDuel();
    const c = putOnField(s, "you", mkCard({ name: "Imobilizada" }), 0);
    addStatus(c, "IMMOBILIZED", "N_TURNS", s.turnCount, 2);
    expect(c.statuses?.find((x) => x.key === "IMMOBILIZED")?.turnsLeft).toBe(2);
    passTurn(s);
    passTurn(s); // 1º início de turno do dono
    expect(s.you.field[0]!.statuses?.find((x) => x.key === "IMMOBILIZED")?.turnsLeft).toBe(1);
    passTurn(s);
    passTurn(s); // 2º início: expira
    expect(hasStatus(s.you.field[0]!, "IMMOBILIZED")).toBe(false);
  });

  test("PERMANENT e WHILE_IN_PLAY não expiram com a passagem de turnos", () => {
    const s = newDuel();
    const c = putOnField(s, "you", mkCard({ name: "Ímpeto" }), 0);
    addStatus(c, "RUSH", "PERMANENT", s.turnCount);
    addStatus(c, "STEALTH", "WHILE_IN_PLAY", s.turnCount);
    for (let i = 0; i < 4; i++) passTurn(s);
    const card = s.you.field[0]!;
    expect(hasStatus(card, "RUSH")).toBe(true);
    expect(hasStatus(card, "STEALTH")).toBe(true);
  });

  test("reaplicar status não-empilhável renova a duração", () => {
    const s = newDuel();
    const c = putOnField(s, "you", mkCard(), 0);
    addStatus(c, "SLEEP", "UNTIL_NEXT_TURN", 1);
    addStatus(c, "SLEEP", "UNTIL_NEXT_TURN", 5);
    expect((c.statuses ?? []).filter((x) => x.key === "SLEEP").length).toBe(1);
    expect(c.statuses?.find((x) => x.key === "SLEEP")?.appliedTurn).toBe(5);
  });
});

describe("Status Engine — Envenenamento", () => {
  test("POISON empilha e causa dano no fim do turno do dono", () => {
    const s = newDuel();
    const c = putOnField(s, "you", mkCard({ name: "Doente", power: 10 }), 0);
    addStatus(c, "POISON", "PERMANENT", s.turnCount, 2);
    addStatus(c, "POISON", "PERMANENT", s.turnCount, 1);
    expect((c.statuses ?? []).filter((x) => x.key === "POISON").length).toBe(2);
    const before = c.ps;
    tickTurnEnd(s, "you");
    expect(s.you.field[0]!.ps).toBe(before - 3);
  });

  test("POISON pode matar a carta e ela sai do campo", () => {
    const s = newDuel();
    const c = putOnField(s, "you", mkCard({ name: "Frágil", power: 2 }), 0);
    addStatus(c, "POISON", "PERMANENT", s.turnCount, 5);
    tickTurnEnd(s, "you");
    expect(s.you.field[0]).toBe(null);
  });

  test("POISON não dana no fim do turno do oponente", () => {
    const s = newDuel();
    const c = putOnField(s, "you", mkCard({ name: "Doente", power: 10 }), 0);
    addStatus(c, "POISON", "PERMANENT", s.turnCount, 3);
    tickTurnEnd(s, "foe");
    expect(s.you.field[0]!.ps).toBe(10);
  });
});

describe("Status Engine — Preguiça, Sono e Distração", () => {
  test("LAZY impede atacar e desperta no 2º turno em campo", () => {
    const s = newDuel();
    const c = putOnField(s, "you", mkCard({ name: "Preguiçosa", atk: 3 }), 0);
    addStatus(c, "LAZY", "WHILE_IN_PLAY", s.turnCount);
    expect(blocksAttack(c)).toBe(true);
    tickTurnStart(s, "you"); // mesmo turno: continua preguiçosa
    expect(hasStatus(s.you.field[0]!, "LAZY")).toBe(true);
    s.turnCount += 2;
    tickTurnStart(s, "you");
    expect(hasStatus(s.you.field[0]!, "LAZY")).toBe(false);
    expect(blocksAttack(s.you.field[0]!)).toBe(false);
  });

  test("dano desperta LAZY, SLEEP e DISTRACTED", () => {
    const s = newDuel();
    const c = putOnField(s, "you", mkCard({ name: "Adormecida", power: 20 }), 0);
    addStatus(c, "LAZY", "WHILE_IN_PLAY", s.turnCount);
    addStatus(c, "SLEEP", "WHILE_IN_PLAY", s.turnCount);
    addStatus(c, "DISTRACTED", "WHILE_IN_PLAY", s.turnCount);
    wakeOnDamage(c);
    expect(hasStatus(c, "LAZY")).toBe(false);
    expect(hasStatus(c, "SLEEP")).toBe(false);
    expect(hasStatus(c, "DISTRACTED")).toBe(false);
  });

  test("SLEEP impede ser alvo e impede atacar", () => {
    const s = newDuel();
    const c = putOnField(s, "foe", mkCard({ name: "Dorminhoca", power: 20 }), 0);
    addStatus(c, "SLEEP", "WHILE_IN_PLAY", s.turnCount);
    expect(isUntargetable(c)).toBe(true);
    expect(blocksAttack(c)).toBe(true);
    const att = putOnField(s, "you", mkCard({ name: "Atacante", atk: 4, power: 20 }), 0);
    s.turnCount = 3;
    att.ready = true;
    attackWith(s, "you", att.uid, { kind: "card", slot: 0 });
    expect(s.foe.field[0]!.ps).toBe(20); // ataque bloqueado
  });
});

describe("Status Engine — Furtividades", () => {
  test("STEALTH_UNTIL_ATTACK cai quando a carta ataca", () => {
    const s = newDuel();
    const att = putOnField(s, "you", mkCard({ name: "Sombra", atk: 3, power: 20 }), 0);
    addStatus(att, "STEALTH_UNTIL_ATTACK", "WHILE_IN_PLAY", s.turnCount);
    expect(isUntargetable(att)).toBe(true);
    s.turnCount = 3;
    att.ready = true;
    attackWith(s, "you", att.uid, { kind: "player" });
    expect(hasStatus(s.you.field[0]!, "STEALTH_UNTIL_ATTACK")).toBe(false);
    expect(isUntargetable(s.you.field[0]!)).toBe(false);
  });

  test("carta furtiva não pode ser alvo de ataque", () => {
    const s = newDuel();
    const hidden = putOnField(s, "foe", mkCard({ name: "Oculta", power: 20 }), 0);
    addStatus(hidden, "STEALTH", "WHILE_IN_PLAY", s.turnCount);
    const att = putOnField(s, "you", mkCard({ name: "Caçador", atk: 5, power: 20 }), 0);
    s.turnCount = 3;
    att.ready = true;
    attackWith(s, "you", att.uid, { kind: "card", slot: 0 });
    expect(s.foe.field[0]!.ps).toBe(20);
  });
});

describe("Status Engine — Guarda e limpeza", () => {
  test("GUARD_DOWN suprime a Guarda e expira no fim do turno", () => {
    const s = newDuel();
    const guard = putOnField(
      s,
      "you",
      mkCard({
        name: "Tank",
        power: 30,
        abilities: [ab({ effectKey: "KEYWORD", params: { keyword: "GUARD" } })],
      }),
      0,
    );
    expect(isGuard(guard)).toBe(true);
    addStatus(guard, "GUARD_DOWN", "END_OF_TURN", s.turnCount);
    expect(isGuard(guard)).toBe(false);
    passTurn(s);
    expect(isGuard(s.you.field[0]!)).toBe(true);
  });

  test("cleanse remove status negativos e debuffs de ATK, preserva buffs", () => {
    const s = newDuel();
    const c = putOnField(s, "you", mkCard({ name: "Purificada", atk: 4, power: 20 }), 0);
    addStatus(c, "POISON", "PERMANENT", s.turnCount, 2);
    addStatus(c, "LAZY", "WHILE_IN_PLAY", s.turnCount);
    addStatus(c, "RUSH", "PERMANENT", s.turnCount);
    c.mods = [
      { id: "m1", stat: "ATK", amount: -2, duration: "PERMANENT", source: "x", appliedTurn: 0 },
      { id: "m2", stat: "ATK", amount: 3, duration: "PERMANENT", source: "y", appliedTurn: 0 },
    ];
    cleanse(c);
    recomputeAuras(s);
    const card = s.you.field[0]!;
    expect(hasStatus(card, "POISON")).toBe(false);
    expect(hasStatus(card, "LAZY")).toBe(false);
    expect(hasStatus(card, "RUSH")).toBe(true);
    expect(card.atk).toBe(7); // 4 base + 3 buff, debuff removido
  });

  test("removeStatus informa se removeu algo", () => {
    const s = newDuel();
    const c = putOnField(s, "you", mkCard(), 0);
    addStatus(c, "SLEEP", "PERMANENT", s.turnCount);
    expect(removeStatus(c, "SLEEP")).toBe(true);
    expect(removeStatus(c, "SLEEP")).toBe(false);
  });
});
