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
