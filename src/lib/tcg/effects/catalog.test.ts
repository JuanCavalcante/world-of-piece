import { describe, expect, test } from "bun:test";
import { CATALOG_EFFECT_KEYS, CATALOG_STATUS_KEYS } from "@/lib/tcg/effects/catalog";
import { HANDLED_EFFECT_KEYS } from "@/lib/tcg/effects/registry";
import { NEGATIVE_STATUSES, STEALTH_STATUSES } from "@/lib/tcg/effects/status";

describe("Catálogo de efeitos ↔ motor", () => {
  test("todo efeito do catálogo tem handler implementado", () => {
    const handled = new Set<string>(HANDLED_EFFECT_KEYS);
    const missing = CATALOG_EFFECT_KEYS.filter((k) => !handled.has(k));
    expect(missing).toEqual([]);
  });

  test("nenhum handler órfão (sem entrada no catálogo)", () => {
    const catalog = new Set<string>(CATALOG_EFFECT_KEYS);
    const orphans = HANDLED_EFFECT_KEYS.filter((k) => !catalog.has(k));
    expect(orphans).toEqual([]);
  });

  test("não há chaves duplicadas", () => {
    expect(new Set(CATALOG_EFFECT_KEYS).size).toBe(CATALOG_EFFECT_KEYS.length);
    expect(new Set(HANDLED_EFFECT_KEYS).size).toBe(HANDLED_EFFECT_KEYS.length);
  });

  test("status usados pelo motor existem no catálogo de status", () => {
    const catalog = new Set<string>(CATALOG_STATUS_KEYS);
    [...NEGATIVE_STATUSES, ...STEALTH_STATUSES].forEach((st) => {
      expect(catalog.has(st)).toBe(true);
    });
  });
});

/* Regressão: HEAL_SELF_EOT estava catalogado sem handler no motor. */
import { createPvpDuel, endTurn, playCard, type DuelState } from "@/lib/tcg/duel";
import type { TcgCard } from "@/lib/tcg/api";

function card(over: Partial<TcgCard> = {}): TcgCard {
  return {
    id: `cat-${Math.random().toString(36).slice(2)}`,
    name: "Regenerador",
    rarity: "COMUM",
    image_url: null,
    power: 10,
    effect: null,
    cost: 0,
    atk: 1,
    effect_code: "NONE",
    type: "Lutador",
    organization: null,
    race: null,
    family: null,
    status: "ACTIVE",
    abilities: [],
    ...over,
  } as TcgCard;
}

test("HEAL_SELF_EOT cura a própria carta no fim do turno do dono", () => {
  const regen = card({
    name: "Regen",
    abilities: [
      {
        effectKey: "HEAL_SELF_EOT",
        name: "Regeneração",
        trigger: "ON_END_TURN",
        target: "SELF",
        condition: { type: "NONE", value: null },
        params: { amount: 3 },
        slot: 1,
      },
    ],
  });
  const fill = () => card({ name: "F", power: 5 });
  const s: DuelState = createPvpDuel("P1", [regen, regen, regen, regen, regen], "P2", [fill(), fill(), fill(), fill(), fill()]);
  const hand = s.you.hand.find((c) => c.name === "Regen");
  expect(hand).toBeDefined();
  s.you.ap = 10;
  playCard(s, "you", hand!.uid, 0);
  const inPlay = s.you.field[0]!;
  inPlay.ps = 4;
  endTurn(s);
  expect(s.you.field[0]!.ps).toBe(7);
});
