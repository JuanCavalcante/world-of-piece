import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  attackWith,
  canAttack,
  canAttackThisTurn,
  createPvpDuel,
  endTurn,
  hasGuard,
  isValidTarget,
  playCard,
  runAiTurn,
  surrender,
  type DuelState,
  type EffectCode,
  type InPlayCard,
} from "@/lib/tcg/duel";
import { pendingChoiceTargets, resolveChoice } from "@/lib/tcg/effects/engine";
import type { Ability } from "@/lib/tcg/effects/types";
import type { TcgCard } from "@/lib/tcg/api";

/* ============================================================================
 * FASE 4 — Testes de regressão da integração do Effect Engine v2.
 *
 * Objetivo: garantir que a migração de Guarda/ataque-duplo/contra-ataque para
 * o pipeline novo NÃO mudou o comportamento de duelos sem habilidades, que os
 * effect_code legados continuam funcionando, e que replays JxIA completos são
 * determinísticos e terminam com vencedor.
 * ========================================================================== */

/* ------------------------------ RNG seedável ------------------------------ */

const realRandom = Math.random;

/** mulberry32 — PRNG determinístico para replays. */
function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

beforeEach(() => {
  Math.random = seededRandom(42);
});

afterEach(() => {
  Math.random = realRandom;
});

/* --------------------------------- helpers --------------------------------- */

let n = 0;
function mkCard(over: Partial<TcgCard> & { abilities?: Ability[] } = {}): TcgCard {
  n += 1;
  return {
    id: `reg-${n}`,
    name: over.name ?? `Carta ${n}`,
    rarity: "COMUM",
    image_url: null,
    power: over.power ?? 10,
    effect: null,
    cost: over.cost ?? 0,
    atk: over.atk ?? 2,
    effect_code: over.effect_code ?? "NONE",
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
  trigger: "ON_PLAY",
  target: "SELF",
  condition: { type: "NONE", value: null },
  params: {},
  slot: 1,
  ...partial,
});

function mkDuel(p1: TcgCard[], p2: TcgCard[]): DuelState {
  return createPvpDuel("P1", p1, "P2", p2);
}

/**
 * Cria um InPlayCard bem formado via um duelo auxiliar e o coloca na MÃO do
 * lado indicado (sem jogar). Permite ajustar effect_code ANTES do playCard,
 * exercitando o caminho legado de applyEffect.
 */
function putInHand(s: DuelState, side: "you" | "foe", card: TcgCard, effectCode?: EffectCode): InPlayCard {
  const tcg = { ...card, cost: 0 };
  const aux = createPvpDuel("a", [tcg, tcg, tcg, tcg, tcg], "b", [tcg, tcg, tcg, tcg, tcg]);
  const c = aux.you.hand[0];
  if (effectCode) c.effect_code = effectCode;
  s[side].hand.push(c);
  s[side].ap = 10;
  return c;
}

/** Coloca uma carta diretamente em campo (jogada da mão, efeitos ON_PLAY rodam). */
function putOnField(s: DuelState, side: "you" | "foe", card: TcgCard, slot: number): InPlayCard {
  const c = putInHand(s, side, card);
  playCard(s, side, c.uid, slot);
  return s[side].field[slot]!;
}

const filler = () => mkCard({ power: 5, atk: 1 });
const fiveFillers = () => [filler(), filler(), filler(), filler(), filler()];

/* ------------------- regressão: regras básicas de combate ------------------- */

describe("Regressão — combate básico sem habilidades (comportamento idêntico ao v1)", () => {
  test("contra-ataque universal: atacante sofre o ATK da vítima", () => {
    const s = mkDuel(fiveFillers(), fiveFillers());
    putOnField(s, "you", mkCard({ name: "A", atk: 3, power: 10 }), 0);
    putOnField(s, "foe", mkCard({ name: "B", atk: 2, power: 8 }), 0);
    s.turnCount = 3;
    s.you.field[0]!.ready = true;
    attackWith(s, "you", s.you.field[0]!.uid, { kind: "card", slot: 0 });
    expect(s.foe.field[0]?.ps).toBe(5); // 8 - 3
    expect(s.you.field[0]?.ps).toBe(8); // 10 - 2 (contra-ataque)
  });

  test("ataques bloqueados nos 2 primeiros turnos e liberados a partir do 3º", () => {
    const s = mkDuel(fiveFillers(), fiveFillers());
    expect(canAttackThisTurn(s, "you")).toBe(false); // turno 1
    endTurn(s);
    expect(canAttackThisTurn(s, "foe")).toBe(false); // turno 2
    endTurn(s);
    expect(canAttackThisTurn(s, "you")).toBe(true); // turno 3
  });

  test("jogar carta consome PA, ocupa o slot e sai da mão", () => {
    const s = mkDuel(fiveFillers(), fiveFillers());
    const handBefore = s.you.hand.length;
    const c = putInHand(s, "you", mkCard({ name: "Cara", cost: 3, atk: 4, power: 6 }));
    s.you.ap = 5;
    playCard(s, "you", c.uid, 2);
    expect(s.you.ap).toBe(2);
    expect(s.you.field[2]?.name).toBe("Cara");
    expect(s.you.hand.length).toBe(handBefore); // +1 do putInHand, -1 da jogada
    // sem PA não joga
    const c2 = putInHand(s, "you", mkCard({ name: "Caríssima", cost: 9 }));
    s.you.ap = 1;
    playCard(s, "you", c2.uid);
    expect(s.you.hand.some((h) => h.uid === c2.uid)).toBe(true);
  });

  test("ataque direto reduz HP do jogador e zera o jogo com vencedor", () => {
    const s = mkDuel(fiveFillers(), fiveFillers());
    putOnField(s, "you", mkCard({ name: "A", atk: 30, power: 10 }), 0);
    s.turnCount = 3;
    s.you.field[0]!.ready = true;
    attackWith(s, "you", s.you.field[0]!.uid, { kind: "player" });
    expect(s.foe.hp).toBe(0);
    expect(s.over).toBe(true);
    expect(s.winner).toBe("you");
  });

  test("endTurn passa o turno, incrementa turnCount e startTurn compra 2 e escala PA até 10", () => {
    const s = mkDuel(fiveFillers(), fiveFillers());
    const foeHandBefore = s.foe.hand.length;
    expect(s.turn).toBe("you");
    endTurn(s);
    expect(s.turn).toBe("foe");
    expect(s.turnCount).toBe(2);
    expect(s.foe.hand.length).toBe(foeHandBefore + 2);
    expect(s.foe.maxAp).toBe(2);
    expect(s.foe.ap).toBe(2);
    // escala até o teto de 10
    for (let i = 0; i < 30 && !s.over; i++) endTurn(s);
    expect(s.you.maxAp).toBe(10);
    expect(s.foe.maxAp).toBe(10);
  });

  test("rendição encerra com o oponente como vencedor", () => {
    const s = mkDuel(fiveFillers(), fiveFillers());
    surrender(s, "you");
    expect(s.over).toBe(true);
    expect(s.winner).toBe("foe");
  });
});

/* --------------------- regressão: effect_code legado ----------------------- */

describe("Regressão — effect_code legado (applyEffect) continua funcional", () => {
  test("beta: toInPlay força NONE mesmo com effect_code no banco", () => {
    const s = mkDuel(fiveFillers(), fiveFillers());
    const c = putInHand(s, "you", mkCard({ name: "Beta", effect_code: "DRAW_1" as EffectCode }));
    // a carta foi criada pelo fluxo oficial (toInPlay) → efeito congelado
    expect(c.effect_code).toBe("NONE");
    const handBefore = s.you.hand.length;
    playCard(s, "you", c.uid, 0);
    expect(s.you.hand.length).toBe(handBefore - 1); // saiu da mão, NÃO comprou
  });

  test("DRAW_1 compra 1 carta ao entrar", () => {
    const s = mkDuel(fiveFillers(), fiveFillers());
    const c = putInHand(s, "you", mkCard({ name: "Saque" }), "DRAW_1");
    const handBefore = s.you.hand.length;
    playCard(s, "you", c.uid, 0);
    expect(s.you.hand.length).toBe(handBefore); // -1 jogada, +1 comprada
    expect(s.log.some((l) => l.text.includes("comprou 1 carta"))).toBe(true);
  });

  test("GAIN_1_AP devolve 1 PA ao entrar", () => {
    const s = mkDuel(fiveFillers(), fiveFillers());
    const c = putInHand(s, "you", mkCard({ name: "Bateria", cost: 2 }), "GAIN_1_AP");
    s.you.ap = 5;
    playCard(s, "you", c.uid, 0);
    expect(s.you.ap).toBe(4); // 5 - 2 + 1
  });

  test("BUFF_ATK_25 e BUFF_PS_30 sobem os valores base", () => {
    const s = mkDuel(fiveFillers(), fiveFillers());
    const c1 = putInHand(s, "you", mkCard({ name: "Bruta", atk: 2, power: 10 }), "BUFF_ATK_25");
    playCard(s, "you", c1.uid, 0);
    expect(s.you.field[0]?.atk).toBe(27);
    expect(s.you.field[0]?.baseAtk).toBe(27);

    const c2 = putInHand(s, "you", mkCard({ name: "Parruda", atk: 2, power: 10 }), "BUFF_PS_30");
    playCard(s, "you", c2.uid, 1);
    expect(s.you.field[1]?.maxPs).toBe(40);
    expect(s.you.field[1]?.ps).toBe(40);
    expect(s.you.field[1]?.baseMaxPs).toBe(40);
  });

  test("HEAL_DEF_50 cura a aliada mais ferida até o máximo", () => {
    const s = mkDuel(fiveFillers(), fiveFillers());
    putOnField(s, "you", mkCard({ name: "Ferida", power: 100, atk: 1 }), 0);
    s.you.field[0]!.ps = 20;
    const c = putInHand(s, "you", mkCard({ name: "Médica" }), "HEAL_DEF_50");
    playCard(s, "you", c.uid, 1);
    expect(s.you.field[0]?.ps).toBe(70);
  });

  test("SWAP_WITH_DEFENSE entra pronta para atacar", () => {
    const s = mkDuel(fiveFillers(), fiveFillers());
    const c = putInHand(s, "you", mkCard({ name: "Veloz" }), "SWAP_WITH_DEFENSE");
    playCard(s, "you", c.uid, 0);
    expect(s.you.field[0]?.ready).toBe(true);
    s.turnCount = 3;
    expect(canAttack(s, "you", s.you.field[0]!.uid)).toBe(true);
  });

  test("DOUBLE_ATTACK legado desfere 2 golpes (e sofre 2 contra-ataques)", () => {
    const s = mkDuel(fiveFillers(), fiveFillers());
    const att = putOnField(s, "you", mkCard({ name: "Dupla", atk: 3, power: 20 }), 0);
    att.effect_code = "DOUBLE_ATTACK"; // ataque-duplo é lido no momento do ataque
    putOnField(s, "foe", mkCard({ name: "Alvo", atk: 2, power: 10 }), 0);
    s.turnCount = 3;
    att.ready = true;
    attackWith(s, "you", att.uid, { kind: "card", slot: 0 });
    expect(s.foe.field[0]?.ps).toBe(4); // 10 - 3 - 3
    expect(s.you.field[0]?.ps).toBe(16); // 20 - 2 - 2
    expect(att.attacked).toBe(true); // gastou o ataque do turno
  });

  test("GUARD legado (effect_code) ainda obriga o inimigo a atacá-la", () => {
    const s = mkDuel(fiveFillers(), fiveFillers());
    const tank = putOnField(s, "foe", mkCard({ name: "Tank", power: 30, atk: 1 }), 0);
    tank.effect_code = "GUARD"; // Guarda legada é lida na validação de alvo
    putOnField(s, "foe", mkCard({ name: "Frágil", power: 5, atk: 1 }), 1);
    putOnField(s, "you", mkCard({ name: "Aggro", atk: 3, power: 10 }), 0);
    expect(hasGuard(s.foe)).toBe(true);
    s.turnCount = 3;
    const aggro = s.you.field[0]!;
    aggro.ready = true;
    expect(isValidTarget(s, "you", { kind: "player" }, aggro.uid)).toBe(false);
    expect(isValidTarget(s, "you", { kind: "card", slot: 1 }, aggro.uid)).toBe(false);
    expect(isValidTarget(s, "you", { kind: "card", slot: 0 }, aggro.uid)).toBe(true);
    attackWith(s, "you", aggro.uid, { kind: "card", slot: 0 });
    expect(s.foe.field[0]?.ps).toBe(27);
  });
});

/* ---------------------- regressão: replay JxIA completo --------------------- */

/** Política simples e determinística do jogador humano simulado. */
function playHumanTurn(s: DuelState) {
  // 1. joga a carta de maior custo possível enquanto houver PA e espaço
  let guard = 0;
  while (guard++ < 10 && !s.over) {
    const playable = s.you.hand
      .filter((c) => c.cost <= s.you.ap)
      .sort((a, b) => b.cost - a.cost || b.atk - a.atk)[0];
    if (!playable || s.you.field.every((f) => f !== null)) break;
    playCard(s, "you", playable.uid);
    // resolve escolhas pendentes de efeitos (1º alvo válido)
    let g2 = 0;
    while (s.pendingChoice && s.pendingChoice.side === "you" && g2++ < 5) {
      const targets = pendingChoiceTargets(s, "you");
      resolveChoice(s, "you", targets[0]?.card.uid ?? null);
    }
  }
  // 2. ataca com cada carta pronta: no jogador se puder, senão na 1ª carta válida
  if (canAttackThisTurn(s, "you")) {
    for (const c of [...s.you.field]) {
      if (!c || s.over) continue;
      if (!canAttack(s, "you", c.uid)) continue;
      if (isValidTarget(s, "you", { kind: "player" }, c.uid)) {
        attackWith(s, "you", c.uid, { kind: "player" });
        continue;
      }
      const slot = s.foe.field.findIndex(
        (v) => !!v && isValidTarget(s, "you", { kind: "card", slot: s.foe.field.indexOf(v) }, c.uid),
      );
      if (slot !== -1) attackWith(s, "you", c.uid, { kind: "card", slot });
    }
  }
  if (!s.over) endTurn(s);
}

/** Simula um duelo JxIA completo até o fim. */
function simulateAiDuel(seed: number, playerDeck: TcgCard[], aiDeck: TcgCard[]): DuelState {
  Math.random = seededRandom(seed);
  const s = mkDuel(playerDeck, aiDeck);
  let steps = 0;
  while (!s.over && steps++ < 300) {
    if (s.turn === "you") playHumanTurn(s);
    else runAiTurn(s);
  }
  return s;
}

/** Baralho de 24 cartas sem habilidades, stats variados deterministicamente. */
function plainDeck(prefix: string): TcgCard[] {
  const out: TcgCard[] = [];
  for (let i = 0; i < 24; i++) {
    out.push(
      mkCard({
        name: `${prefix}-${i}`,
        cost: (i % 6) + 1,
        atk: (i % 4) + 1,
        power: 3 + ((i * 7) % 9),
      }),
    );
  }
  return out;
}

function snapshot(s: DuelState) {
  return {
    winner: s.winner,
    over: s.over,
    turnCount: s.turnCount,
    youHp: s.you.hp,
    foeHp: s.foe.hp,
    youField: s.you.field.map((c) => c && [c.name, c.atk, c.ps, c.maxPs]),
    foeField: s.foe.field.map((c) => c && [c.name, c.atk, c.ps, c.maxPs]),
    logLen: s.log.length,
  };
}

describe("Regressão — replay de duelos JxIA completos", () => {
  test("duelo sem habilidades termina com vencedor e estado íntegro", () => {
    const s = simulateAiDuel(7, plainDeck("J"), plainDeck("I"));
    expect(s.over).toBe(true);
    expect(s.winner).not.toBeNull();
    const loser = s.winner === "you" ? s.foe : s.you;
    expect(loser.hp).toBe(0);
    // invariantes de integridade do estado
    (["you", "foe"] as const).forEach((k) => {
      s[k].field.forEach((c) => {
        if (!c) return;
        expect(c.ps).toBeGreaterThan(0);
        expect(c.ps).toBeLessThanOrEqual(c.maxPs);
        expect(c.atk).toBeGreaterThanOrEqual(0);
      });
    });
  });

  test("replay com a mesma seed produz resultado idêntico (determinismo)", () => {
    const run = () => simulateAiDuel(99, plainDeck("J"), plainDeck("I"));
    const a = snapshot(run());
    const b = snapshot(run());
    expect(a).toEqual(b);
  });

  test("duelo com habilidades do motor v2 em ambos os lados termina sem exceções", () => {
    const abilityPool: Ability[][] = [
      [ab({ effectKey: "KEYWORD", trigger: "PASSIVE", params: { keyword: "GUARD" } })],
      [ab({ effectKey: "THORNS", trigger: "PASSIVE", params: { amount: 1 } })],
      [ab({ effectKey: "DAMAGE_ON_PLAY", target: "ALL_ENEMIES", params: { amount: 1 } })],
      [ab({ effectKey: "AURA_BUFF_ATK", trigger: "PASSIVE", target: "AURA_FILTER", params: { amount: 1, classes: "Lutador" } })],
      [ab({ effectKey: "GRANT_STATUS", params: { status: "RUSH", duration: "PERMANENT" } })],
      [ab({ effectKey: "DAMAGE_ON_PLAY", target: "ENEMY_CHOSEN", params: { amount: 2 } })],
      [ab({ effectKey: "HEAL_ON_PLAY", target: "ALL_ALLIES", params: { amount: 2 } })],
    ];
    const mkAbilityDeck = (prefix: string): TcgCard[] => {
      const out: TcgCard[] = [];
      for (let i = 0; i < 24; i++) {
        out.push(
          mkCard({
            name: `${prefix}-${i}`,
            cost: (i % 5) + 1,
            atk: (i % 4) + 1,
            power: 3 + ((i * 5) % 8),
            abilities: abilityPool[i % abilityPool.length].map((x) => ({ ...x })),
          }),
        );
      }
      return out;
    };
    const s = simulateAiDuel(123, mkAbilityDeck("J"), mkAbilityDeck("I"));
    expect(s.over).toBe(true);
    expect(s.winner).not.toBeNull();
    expect(s.pendingChoice ?? null).toBeNull();
    (["you", "foe"] as const).forEach((k) => {
      s[k].field.forEach((c) => {
        if (!c) return;
        expect(c.ps).toBeGreaterThan(0);
        expect(c.ps).toBeLessThanOrEqual(c.maxPs);
      });
    });
  });

  test("replay com habilidades também é determinístico", () => {
    const deck = (prefix: string): TcgCard[] => {
      const out: TcgCard[] = [];
      for (let i = 0; i < 24; i++) {
        out.push(
          mkCard({
            name: `${prefix}-${i}`,
            cost: (i % 5) + 1,
            atk: (i % 3) + 2,
            power: 4 + ((i * 3) % 7),
            abilities:
              i % 3 === 0
                ? [ab({ effectKey: "THORNS", trigger: "PASSIVE", params: { amount: 1 } })]
                : i % 3 === 1
                  ? [ab({ effectKey: "KEYWORD", trigger: "PASSIVE", params: { keyword: "GUARD" } })]
                  : [],
          }),
        );
      }
      return out;
    };
    const run = () => simulateAiDuel(555, deck("J"), deck("I"));
    expect(snapshot(run())).toEqual(snapshot(run()));
  });
});
