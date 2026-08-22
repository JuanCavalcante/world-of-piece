import { describe, expect, test } from "bun:test";
import {
  attackWith,
  createPvpDuel,
  endTurn,
  hasGuard,
  playCard,
  type DuelState,
  type InPlayCard,
} from "@/lib/tcg/duel";
import { normalizeState, resolveChoice, tickTurnStart } from "@/lib/tcg/effects/engine";
import { addStatus } from "@/lib/tcg/effects/status";
import type { Ability } from "@/lib/tcg/effects/types";
import type { TcgCard } from "@/lib/tcg/api";

let n = 0;
function mkCard(over: Partial<TcgCard> & { abilities?: Ability[] } = {}): TcgCard {
  n += 1;
  return {
    id: `card-${n}`,
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
  trigger: "ON_PLAY",
  target: "SELF",
  condition: { type: "NONE", value: null },
  params: {},
  slot: 1,
  ...partial,
});

function mkDuel(p1: TcgCard[], p2: TcgCard[]): DuelState {
  const s = createPvpDuel("P1", p1, "P2", p2);
  // mão inicial determinística: garante as 4 primeiras cartas de cada deck
  return s;
}

/** Coloca uma carta diretamente no campo (atalho de teste). */
function putOnField(s: DuelState, side: "you" | "foe", card: TcgCard, slot: number): InPlayCard {
  const tcg = { ...card, cost: 0 };
  const aux = createPvpDuel("a", [tcg, tcg, tcg, tcg, tcg], "b", [tcg, tcg, tcg, tcg, tcg]);
  s[side].hand.push(aux.you.hand[0]);
  s[side].ap = 10;
  const handCard = s[side].hand[s[side].hand.length - 1];
  playCard(s, side, handCard.uid, slot);
  return s[side].field[slot]!;
}

const filler = () => mkCard({ power: 5, atk: 1 });
const fiveFillers = () => [filler(), filler(), filler(), filler(), filler()];

describe("Effect Engine v2 — regras de combate", () => {
  test("Guarda obriga ataque à carta de Guarda", () => {
    const guard = mkCard({ name: "Tank", power: 30, atk: 1, abilities: [ab({ effectKey: "KEYWORD", trigger: "PASSIVE", params: { keyword: "GUARD" } })] });
    const s = mkDuel(fiveFillers(), [guard, ...fiveFillers()]);
    putOnField(s, "you", mkCard({ name: "Aggro", atk: 3, power: 10 }), 0);
    putOnField(s, "foe", guard, 0);
    putOnField(s, "foe", mkCard({ name: "Frágil", atk: 1, power: 5 }), 1);
    s.turnCount = 3; // libera ataques
    const aggro = s.you.field[0]!;
    aggro.ready = true;
    // não pode atacar o jogador nem a carta frágil
    attackWith(s, "you", aggro.uid, { kind: "player" });
    expect(s.foe.hp).toBe(30);
    attackWith(s, "you", aggro.uid, { kind: "card", slot: 1 });
    expect(s.foe.field[1]?.ps).toBe(5);
    // pode atacar a Guarda
    attackWith(s, "you", aggro.uid, { kind: "card", slot: 0 });
    expect(s.foe.field[0]?.ps).toBe(27);
  });

  test("contra-dano e Fura-Guarta (Corte Silencioso)", () => {
    const guard = mkCard({ name: "Tank", power: 30, atk: 2, abilities: [ab({ effectKey: "KEYWORD", trigger: "PASSIVE", params: { keyword: "GUARD" } })] });
    const s = mkDuel(fiveFillers(), [guard, ...fiveFillers()]);
    putOnField(s, "you", mkCard({
      name: "Assassina", atk: 4, power: 10,
      abilities: [ab({ effectKey: "BUFF_ATK", trigger: "ON_ATTACK_DECLARED", params: { amount: 2, duration: "END_OF_TURN", grant_ignore_guard: true } })],
    }), 0);
    putOnField(s, "foe", guard, 0);
    s.turnCount = 3;
    const att = s.you.field[0]!;
    att.ready = true;
    attackWith(s, "you", att.uid, { kind: "player" });
    expect(s.foe.hp).toBe(30 - 6); // 4 base + 2 do buff
    // buff expira no fim do turno
    endTurn(s);
    expect(s.you.field[0]?.atk).toBe(4);
  });

  test("Vôo: só pode ser alvo de Vôo ou Atirador", () => {
    const flyer = mkCard({ name: "Voadora", power: 20, atk: 1, abilities: [ab({ effectKey: "KEYWORD", trigger: "PASSIVE", params: { keyword: "FLYING" } })] });
    const s = mkDuel(fiveFillers(), [flyer, ...fiveFillers()]);
    putOnField(s, "foe", flyer, 0);
    putOnField(s, "you", mkCard({ name: "Terrestre", type: "Lutador", atk: 3, power: 30 }), 0);
    putOnField(s, "you", mkCard({ name: "Atiradora", type: "Atirador", atk: 4, power: 30 }), 1);
    s.turnCount = 3;
    const terrestre = s.you.field[0]!;
    terrestre.ready = true;
    attackWith(s, "you", terrestre.uid, { kind: "card", slot: 0 });
    expect(s.foe.field[0]?.ps).toBe(20); // não pode alvejar
    const atiradora = s.you.field[1]!;
    atiradora.ready = true;
    attackWith(s, "you", atiradora.uid, { kind: "card", slot: 0 });
    expect(s.foe.field[0]?.ps).toBe(16); // Atirador alcança
  });
});

describe("Effect Engine v2 — gatilho ao entrar (ON_PLAY)", () => {
  test("dano ao entrar com alvo escolhido gera pendingChoice e resolve", () => {
    const bolt = mkCard({ name: "Raio", power: 5, atk: 1, abilities: [ab({ effectKey: "DAMAGE_ON_PLAY", target: "ENEMY_CHOSEN", params: { amount: 3 } })] });
    const s = mkDuel([bolt, ...fiveFillers()], fiveFillers());
    putOnField(s, "foe", mkCard({ name: "Alvo", power: 8, atk: 1 }), 2);
    s.you.hand = [];
    const tcg = { ...bolt, cost: 0 };
    const aux = createPvpDuel("a", [tcg, tcg, tcg, tcg, tcg], "b", [tcg, tcg, tcg, tcg, tcg]);
    s.you.hand.push(aux.you.hand[0]);
    s.you.ap = 10;
    playCard(s, "you", s.you.hand[0].uid, 0);
    expect(s.pendingChoice?.side).toBe("you");
    expect(s.foe.field[2]?.ps).toBe(8); // ainda não aplicou
    const targetUid = s.foe.field[2]!.uid;
    resolveChoice(s, "you", targetUid);
    expect(s.pendingChoice).toBeNull();
    expect(s.foe.field[2]?.ps).toBe(5);
  });

  test("dano em área ao entrar atinge todos os inimigos e destrói os fracos", () => {
    const bomb = mkCard({ name: "Bomba", power: 5, atk: 1, abilities: [ab({ effectKey: "DAMAGE_ON_PLAY", target: "ALL_ENEMIES", params: { amount: 3 } })] });
    const s = mkDuel([bomb, ...fiveFillers()], fiveFillers());
    putOnField(s, "foe", mkCard({ name: "Fraca", power: 3, atk: 1 }), 0);
    putOnField(s, "foe", mkCard({ name: "Forte", power: 6, atk: 1 }), 1);
    putOnField(s, "you", bomb, 0);
    expect(s.foe.field[0]).toBeNull(); // destruída
    expect(s.foe.field[1]?.ps).toBe(3);
  });

  test("dano direto ao jogador ao entrar (DAMAGE_PLAYER_ON_PLAY)", () => {
    const sniper = mkCard({ name: "Franco", power: 5, atk: 1, abilities: [ab({ effectKey: "DAMAGE_PLAYER_ON_PLAY", target: "ENEMY_PLAYER", params: { amount: 2 } })] });
    const s = mkDuel([sniper, ...fiveFillers()], fiveFillers());
    putOnField(s, "you", sniper, 0);
    expect(s.foe.hp).toBe(28);
  });

  test("cura em área respeita Imunidade a Suporte (Ignorante)", () => {
    const healer = mkCard({ name: "Curandeira", power: 10, atk: 1, abilities: [ab({ effectKey: "HEAL_ON_PLAY", target: "ALL_ALLIES", params: { amount: 5 } })] });
    const proud = mkCard({ name: "Orgulhoso", power: 10, atk: 1, abilities: [ab({ effectKey: "KEYWORD", trigger: "PASSIVE", params: { keyword: "IMMUNE_SUPPORT" } })] });
    const s = mkDuel([healer, proud, ...fiveFillers()], fiveFillers());
    putOnField(s, "you", proud, 0);
    putOnField(s, "you", mkCard({ name: "Ferido", power: 10, atk: 1 }), 1);
    s.you.field[0]!.ps = 5;
    s.you.field[1]!.ps = 5;
    putOnField(s, "you", healer, 2);
    expect(s.you.field[0]?.ps).toBe(5); // imune a suporte: não curou
    expect(s.you.field[1]?.ps).toBe(10); // curou até o máximo
  });

  test("Cura e HP (BUFF_MAX_HP) aumenta HP máximo e cura", () => {
    const beluga = mkCard({ name: "Beluga", power: 10, atk: 1, abilities: [ab({ effectKey: "BUFF_MAX_HP", params: { amount: 3 } })] });
    const s = mkDuel([beluga, ...fiveFillers()], fiveFillers());
    putOnField(s, "you", beluga, 0);
    expect(s.you.field[0]?.maxPs).toBe(13);
    expect(s.you.field[0]?.ps).toBe(13);
  });

  test("Paramecia da Arma (COPY_ATK_ON_PLAY) copia o ATK do alvo escolhido", () => {
    const copy = mkCard({ name: "Paramecia", power: 8, atk: 1, abilities: [ab({ effectKey: "COPY_ATK_ON_PLAY", target: "ENEMY_CHOSEN" })] });
    const s = mkDuel([copy, ...fiveFillers()], fiveFillers());
    putOnField(s, "foe", mkCard({ name: "Fortão", power: 20, atk: 7 }), 0);
    putOnField(s, "you", copy, 0);
    expect(s.pendingChoice?.side).toBe("you");
    resolveChoice(s, "you", s.foe.field[0]!.uid);
    expect(s.you.field[0]?.atk).toBe(7);
  });

  test("Debuff de ATK reduz inimigos, respeita imunidade e expira no fim do turno", () => {
    const debuffer = mkCard({ name: "Enfraquecedor", power: 5, atk: 1, abilities: [ab({ effectKey: "DEBUFF_ATK", target: "ALL_ENEMIES", params: { amount: 2, duration: "END_OF_TURN" } })] });
    const immune = mkCard({ name: "Imune", power: 10, atk: 4, abilities: [ab({ effectKey: "KEYWORD", trigger: "PASSIVE", params: { keyword: "IMMUNE_DEBUFF_ATK" } })] });
    const s = mkDuel([debuffer, ...fiveFillers()], [immune, ...fiveFillers()]);
    putOnField(s, "foe", mkCard({ name: "Comum", power: 10, atk: 4 }), 0);
    putOnField(s, "foe", immune, 1);
    putOnField(s, "you", debuffer, 0);
    expect(s.foe.field[0]?.atk).toBe(2);
    expect(s.foe.field[1]?.atk).toBe(4); // imune a debuff de ATK
    endTurn(s);
    expect(s.foe.field[0]?.atk).toBe(4); // expirou
  });

  test("Ímpeto (RUSH) permite atacar no turno em que entra", () => {
    const rusher = mkCard({ name: "Veloz", power: 8, atk: 3, abilities: [ab({ effectKey: "GRANT_STATUS", params: { status: "RUSH", duration: "PERMANENT" } })] });
    const s = mkDuel([rusher, ...fiveFillers()], fiveFillers());
    s.turnCount = 3;
    putOnField(s, "you", rusher, 0);
    attackWith(s, "you", s.you.field[0]!.uid, { kind: "player" });
    expect(s.foe.hp).toBe(27);
  });

  test("Imunidade a status condicional (IMMUNE_STATUS + CONTROLS_CARD)", () => {
    const mkAbbadon = () => mkCard({
      name: "Abbadon", power: 12, atk: 3,
      abilities: [ab({ effectKey: "IMMUNE_STATUS", trigger: "PASSIVE", params: { status: "LAZY" }, condition: { type: "CONTROLS_CARD", value: "Papa Morningstar" } })],
    });
    const mkCaster = () => mkCard({ name: "Amaldiçoador", power: 5, atk: 1, abilities: [ab({ effectKey: "GRANT_STATUS", target: "ENEMY_CHOSEN", params: { status: "LAZY", duration: "PERMANENT" } })] });

    // Sem Papa Morningstar em campo: Preguiça é aplicada
    const s1 = mkDuel(fiveFillers(), fiveFillers());
    putOnField(s1, "foe", mkAbbadon(), 0);
    putOnField(s1, "you", mkCaster(), 0);
    resolveChoice(s1, "you", s1.foe.field[0]!.uid);
    expect(s1.foe.field[0]!.statuses.some((st) => st.key === "LAZY")).toBe(true);

    // Com Papa Morningstar em campo: imune
    const s2 = mkDuel(fiveFillers(), fiveFillers());
    putOnField(s2, "foe", mkCard({ name: "Papa Morningstar", power: 10, atk: 1 }), 0);
    putOnField(s2, "foe", mkAbbadon(), 1);
    putOnField(s2, "you", mkCaster(), 0);
    resolveChoice(s2, "you", s2.foe.field[1]!.uid);
    expect(s2.foe.field[1]!.statuses.some((st) => st.key === "LAZY")).toBe(false);
  });

  test("Clean (CLEANSE) remove condições negativas e debuffs de ATK", () => {
    const cleanser = mkCard({ name: "Purificador", power: 8, atk: 1, abilities: [ab({ effectKey: "CLEANSE", target: "ALL_ALLIES" })] });
    const s = mkDuel([cleanser, ...fiveFillers()], fiveFillers());
    putOnField(s, "you", mkCard({ name: "Doente", power: 12, atk: 5 }), 0);
    const doente = s.you.field[0]!;
    addStatus(doente, "LAZY", "PERMANENT", 1);
    addStatus(doente, "POISON", "PERMANENT", 1, 2);
    doente.mods.push({ id: "m1", stat: "ATK", amount: -2, duration: "PERMANENT", source: "fx:test", appliedTurn: 1 });
    putOnField(s, "you", cleanser, 1);
    expect(doente.statuses).toHaveLength(0);
    expect(doente.atk).toBe(5); // debuff removido e recalculado
  });
});

describe("Effect Engine v2 — gatilhos de ataque", () => {
  test("Impacto Board (DAMAGE_ON_ATTACK) atinge as demais cartas inimigas", () => {
    const impact = mkCard({
      name: "Impacto", power: 30, atk: 3,
      abilities: [ab({ effectKey: "DAMAGE_ON_ATTACK", trigger: "ON_ATTACK_RESOLVED", params: { amount: 1 } })],
    });
    const s = mkDuel([impact, ...fiveFillers()], fiveFillers());
    putOnField(s, "you", impact, 0);
    putOnField(s, "foe", mkCard({ name: "Vítima", power: 20, atk: 1 }), 0);
    putOnField(s, "foe", mkCard({ name: "Vizinha1", power: 5, atk: 1 }), 1);
    putOnField(s, "foe", mkCard({ name: "Vizinha2", power: 5, atk: 1 }), 2);
    s.turnCount = 3;
    const att = s.you.field[0]!;
    att.ready = true;
    attackWith(s, "you", att.uid, { kind: "card", slot: 0 });
    expect(s.foe.field[0]?.ps).toBe(17); // só o ataque
    expect(s.foe.field[1]?.ps).toBe(4); // impacto
    expect(s.foe.field[2]?.ps).toBe(4);
  });

  test("Dano Espaçado (SPLASH_ON_ATTACK) atinge adjacentes ao alvo", () => {
    const splash = mkCard({
      name: "Onda", power: 30, atk: 3,
      abilities: [ab({ effectKey: "SPLASH_ON_ATTACK", trigger: "ON_ATTACK_RESOLVED", params: { amount: 2 } })],
    });
    const s = mkDuel([splash, ...fiveFillers()], fiveFillers());
    putOnField(s, "you", splash, 0);
    putOnField(s, "foe", mkCard({ name: "Esq", power: 6, atk: 1 }), 0);
    putOnField(s, "foe", mkCard({ name: "Alvo", power: 20, atk: 1 }), 1);
    putOnField(s, "foe", mkCard({ name: "Dir", power: 6, atk: 1 }), 2);
    putOnField(s, "foe", mkCard({ name: "Longe", power: 6, atk: 1 }), 4);
    s.turnCount = 3;
    const att = s.you.field[0]!;
    att.ready = true;
    attackWith(s, "you", att.uid, { kind: "card", slot: 1 });
    expect(s.foe.field[1]?.ps).toBe(17);
    expect(s.foe.field[0]?.ps).toBe(4); // adjacente
    expect(s.foe.field[2]?.ps).toBe(4); // adjacente
    expect(s.foe.field[4]?.ps).toBe(6); // fora do alcance
  });

  test("Remove Guarda T (REMOVE_GUARD_ON_ATTACK) libera ataque direto temporário", () => {
    const breaker = mkCard({
      name: "Quebrador", power: 30, atk: 3,
      abilities: [ab({ effectKey: "REMOVE_GUARD_ON_ATTACK", trigger: "ON_ATTACK_DECLARED", params: { duration: "UNTIL_NEXT_TURN" } })],
    });
    const guard = mkCard({ name: "Tank", power: 30, atk: 1, abilities: [ab({ effectKey: "KEYWORD", trigger: "PASSIVE", params: { keyword: "GUARD" } })] });
    const s = mkDuel([breaker, ...fiveFillers()], [guard, ...fiveFillers()]);
    putOnField(s, "you", breaker, 0);
    putOnField(s, "foe", guard, 0);
    s.turnCount = 3;
    const att = s.you.field[0]!;
    att.ready = true;
    attackWith(s, "you", att.uid, { kind: "player" });
    expect(s.foe.hp).toBe(27); // guarda suprimida neste ataque
    endTurn(s); // início do turno do dono expira UNTIL_NEXT_TURN
    expect(hasGuard(s.foe)).toBe(true);
  });
});

describe("Effect Engine v2 — passivos e pipeline de dano", () => {
  test("Redução de dano, bônus irredutível e Ignora Redução", () => {
    const wall = mkCard({ name: "Muralha", power: 30, atk: 1, abilities: [ab({ effectKey: "DAMAGE_REDUCTION", trigger: "PASSIVE", params: { amount: 2 } })] });
    const s = mkDuel(fiveFillers(), [wall, ...fiveFillers()]);
    putOnField(s, "foe", wall, 0);
    putOnField(s, "you", mkCard({ name: "A", power: 30, atk: 4 }), 0);
    putOnField(s, "you", mkCard({ name: "B", power: 30, atk: 4, abilities: [ab({ effectKey: "IRREDUCIBLE_BONUS", trigger: "PASSIVE", params: { amount: 1 } })] }), 1);
    putOnField(s, "you", mkCard({ name: "C", power: 30, atk: 4, abilities: [ab({ effectKey: "KEYWORD", trigger: "PASSIVE", params: { keyword: "IGNORE_REDUCTION" } })] }), 2);
    s.turnCount = 3;
    for (const slot of [0, 1, 2]) {
      const att = s.you.field[slot]!;
      att.ready = true;
      attackWith(s, "you", att.uid, { kind: "card", slot: 0 });
    }
    // A: 4-2=2 | B: (4-2)+1=3 | C: 4 (ignora redução) → total 9
    expect(s.foe.field[0]?.ps).toBe(21);
  });

  test("Reflete (THORNS) devolve dano mesmo se a vítima morrer; soma ao contra-ataque se viva", () => {
    const mkSpiky = (power: number) => mkCard({ name: "Espinho", power, atk: 1, abilities: [ab({ effectKey: "THORNS", trigger: "PASSIVE", params: { amount: 2 } })] });

    // Vítima morre: atacante sofre só o reflexo
    const s1 = mkDuel(fiveFillers(), fiveFillers());
    putOnField(s1, "foe", mkSpiky(3), 0);
    putOnField(s1, "you", mkCard({ name: "Batedor", power: 20, atk: 5 }), 0);
    s1.turnCount = 3;
    s1.you.field[0]!.ready = true;
    attackWith(s1, "you", s1.you.field[0]!.uid, { kind: "card", slot: 0 });
    expect(s1.foe.field[0]).toBeNull();
    expect(s1.you.field[0]?.ps).toBe(18); // 20 - 2 de reflexo

    // Vítima vive: reflexo + contra-ataque
    const s2 = mkDuel(fiveFillers(), fiveFillers());
    putOnField(s2, "foe", mkSpiky(30), 0);
    putOnField(s2, "you", mkCard({ name: "Batedor", power: 20, atk: 5 }), 0);
    s2.turnCount = 3;
    s2.you.field[0]!.ready = true;
    attackWith(s2, "you", s2.you.field[0]!.uid, { kind: "card", slot: 0 });
    expect(s2.you.field[0]?.ps).toBe(17); // 20 - (2 reflexo + 1 contra-ataque)
  });

  test("aura de ATK por classe e remoção ao destruir a fonte", () => {
    const leader = mkCard({ name: "Líder", power: 20, atk: 1, abilities: [ab({ effectKey: "AURA_BUFF_ATK", trigger: "PASSIVE", target: "AURA_FILTER", params: { amount: 2, classes: "Lutador" } })] });
    const s = mkDuel([leader, ...fiveFillers()], fiveFillers());
    putOnField(s, "you", leader, 0);
    putOnField(s, "you", mkCard({ name: "Soldado", type: "Lutador", atk: 3, power: 10 }), 1);
    putOnField(s, "you", mkCard({ name: "Snake", type: "Atirador", atk: 3, power: 10 }), 2);
    expect(s.you.field[1]?.atk).toBe(5); // 3 + 2 aura
    expect(s.you.field[2]?.atk).toBe(3); // classe diferente
    // destrói a fonte da aura
    s.you.field[0] = null;
    putOnField(s, "you", mkCard({ name: "Extra", power: 5, atk: 1 }), 3);
    expect(s.you.field[1]?.atk).toBe(3);
  });

  test("aura de HP máximo por raça (AURA_BUFF_MAX_HP) não afeta a própria fonte", () => {
    const aura = mkCard({ name: "Totem", race: "Gigante", power: 10, atk: 1, abilities: [ab({ effectKey: "AURA_BUFF_MAX_HP", trigger: "PASSIVE", target: "AURA_FILTER", params: { amount: 2, races: "Gigante" } })] });
    const s = mkDuel([aura, ...fiveFillers()], fiveFillers());
    putOnField(s, "you", aura, 0);
    putOnField(s, "you", mkCard({ name: "Gigante Aliado", race: "Gigante", power: 10, atk: 2 }), 1);
    putOnField(s, "you", mkCard({ name: "Humano", race: "Humano", power: 10, atk: 2 }), 2);
    expect(s.you.field[0]?.maxPs).toBe(10); // fonte não se afeta
    expect(s.you.field[1]?.maxPs).toBe(12);
    expect(s.you.field[2]?.maxPs).toBe(10); // raça diferente
  });

  test("keyword condicional (CONTROLS_CARD) liga e desliga com o tabuleiro", () => {
    const devoto = mkCard({
      name: "Devoto", power: 15, atk: 2,
      abilities: [ab({ effectKey: "CONDITIONAL_KEYWORD", trigger: "PASSIVE", params: { keyword: "GUARD" }, condition: { type: "CONTROLS_CARD", value: "Papa Morningstar" } })],
    });
    const s = mkDuel([devoto, ...fiveFillers()], fiveFillers());
    putOnField(s, "you", devoto, 0);
    expect(hasGuard(s.you)).toBe(false);
    putOnField(s, "you", mkCard({ name: "Papa Morningstar", power: 10, atk: 1 }), 1);
    expect(hasGuard(s.you)).toBe(true);
    // Papa sai do campo: keyword some na próxima recalculagem
    s.you.field[1] = null;
    putOnField(s, "you", filler(), 2);
    expect(hasGuard(s.you)).toBe(false);
  });
});

describe("Effect Engine v2 — morte, turnos e status", () => {
  test("Logia Sangue (ON_ANY_DEATH_TRIGGER): sem condição cura; com condição satisfeita buffa", () => {
    // Sem condição: cura ao morrer qualquer carta
    const logia = mkCard({ name: "Logia", power: 10, atk: 2, abilities: [ab({ effectKey: "ON_ANY_DEATH_TRIGGER", trigger: "ON_ANY_DEATH", params: { heal_amount: 3 } })] });
    const s1 = mkDuel([logia, ...fiveFillers()], fiveFillers());
    putOnField(s1, "you", logia, 0);
    putOnField(s1, "you", mkCard({ name: "Caçadora", power: 30, atk: 5 }), 1);
    putOnField(s1, "foe", mkCard({ name: "Presa", power: 3, atk: 1 }), 0);
    s1.you.field[0]!.ps = 5;
    s1.turnCount = 3;
    s1.you.field[1]!.ready = true;
    attackWith(s1, "you", s1.you.field[1]!.uid, { kind: "card", slot: 0 });
    expect(s1.foe.field[0]).toBeNull();
    expect(s1.you.field[0]?.ps).toBe(8); // curou 3

    // Com condição satisfeita: ganha HP máximo em vez de curar
    const logia2 = mkCard({
      name: "Logia", power: 10, atk: 2,
      abilities: [ab({ effectKey: "ON_ANY_DEATH_TRIGGER", trigger: "ON_ANY_DEATH", params: { heal_amount: 3, buff_amount: 2 }, condition: { type: "CONTROLS_CARD", value: "Totem" } })],
    });
    const s2 = mkDuel([logia2, ...fiveFillers()], fiveFillers());
    putOnField(s2, "you", mkCard({ name: "Totem", power: 10, atk: 1 }), 0);
    putOnField(s2, "you", logia2, 1);
    putOnField(s2, "you", mkCard({ name: "Caçadora", power: 30, atk: 5 }), 2);
    putOnField(s2, "foe", mkCard({ name: "Presa", power: 3, atk: 1 }), 0);
    s2.you.field[1]!.ps = 5;
    s2.turnCount = 3;
    s2.you.field[2]!.ready = true;
    attackWith(s2, "you", s2.you.field[2]!.uid, { kind: "card", slot: 0 });
    expect(s2.you.field[1]?.maxPs).toBe(12); // buffou
    expect(s2.you.field[1]?.ps).toBe(7); // 5 + 2 do buff (sem cura)
  });

  test("Doença (SELF_DAMAGE_EOT) causa dano a si no fim do turno", () => {
    const doente = mkCard({ name: "Doente", power: 10, atk: 2, abilities: [ab({ effectKey: "SELF_DAMAGE_EOT", trigger: "ON_END_TURN", params: { amount: 2 } })] });
    const s = mkDuel([doente, ...fiveFillers()], fiveFillers());
    putOnField(s, "you", doente, 0);
    expect(s.turn).toBe("you");
    endTurn(s);
    expect(s.you.field[0]?.ps).toBe(8);
  });

  test("Envenenamento (POISON) causa dano no fim do turno do dono", () => {
    const caster = mkCard({ name: "Venenoso", power: 5, atk: 1, abilities: [ab({ effectKey: "GRANT_STATUS", target: "ENEMY_CHOSEN", params: { status: "POISON", duration: "PERMANENT", amount: 2 } })] });
    const s = mkDuel([caster, ...fiveFillers()], fiveFillers());
    putOnField(s, "foe", mkCard({ name: "Alvo", power: 10, atk: 1 }), 0);
    putOnField(s, "you", caster, 0);
    resolveChoice(s, "you", s.foe.field[0]!.uid);
    expect(s.foe.field[0]?.ps).toBe(10); // veneno não dói na aplicação
    s.turn = "foe";
    endTurn(s); // fim do turno do dono da carta envenenada
    expect(s.foe.field[0]?.ps).toBe(8);
  });

  test("Preguiça desperta ao sofrer dano e Furtividade bloqueia alvo", () => {
    const lazy = mkCard({ name: "Preguiçoso", power: 12, atk: 5, abilities: [ab({ effectKey: "GRANT_STATUS", params: { status: "LAZY", duration: "PERMANENT" } })] });
    const stealth = mkCard({ name: "Sombra", power: 6, atk: 2, abilities: [ab({ effectKey: "GRANT_STATUS", params: { status: "STEALTH_UNTIL_ATTACK", duration: "PERMANENT" } })] });
    const s = mkDuel(fiveFillers(), [lazy, stealth, ...fiveFillers()]);
    putOnField(s, "foe", lazy, 0);
    putOnField(s, "foe", stealth, 1);
    putOnField(s, "you", mkCard({ name: "Aggro", atk: 3, power: 10 }), 0);
    s.turnCount = 3;
    const aggro = s.you.field[0]!;
    aggro.ready = true;
    // furtiva não pode ser alvo
    attackWith(s, "you", aggro.uid, { kind: "card", slot: 1 });
    expect(s.foe.field[1]?.ps).toBe(6);
    // preguiçosa pode ser atacada e desperta
    attackWith(s, "you", aggro.uid, { kind: "card", slot: 0 });
    const lazyCard = s.foe.field[0]!;
    expect(lazyCard.ps).toBe(9);
    expect(lazyCard.statuses.some((st) => st.key === "LAZY")).toBe(false);
  });

  test("Furtividade Temporária (UNTIL_NEXT_TURN) expira no início do próximo turno do dono", () => {
    const ninja = mkCard({ name: "Ninja", power: 8, atk: 2, abilities: [ab({ effectKey: "GRANT_STATUS", params: { status: "STEALTH_TEMP", duration: "UNTIL_NEXT_TURN" } })] });
    const s = mkDuel([ninja, ...fiveFillers()], fiveFillers());
    putOnField(s, "you", ninja, 0);
    expect(s.you.field[0]!.statuses.some((st) => st.key === "STEALTH_TEMP")).toBe(true);
    endTurn(s); // turno do oponente: ainda furtiva
    expect(s.you.field[0]!.statuses.some((st) => st.key === "STEALTH_TEMP")).toBe(true);
    endTurn(s); // voltou para o dono: expira
    expect(s.you.field[0]!.statuses.some((st) => st.key === "STEALTH_TEMP")).toBe(false);
  });

  test("duração N_TURNS decai a cada turno do dono", () => {
    const s = mkDuel(fiveFillers(), fiveFillers());
    putOnField(s, "you", mkCard({ name: "Abençoada", power: 10, atk: 2 }), 0);
    const card = s.you.field[0]!;
    s.turnCount = 3;
    addStatus(card, "BLESSED", "N_TURNS", 3, 2);
    expect(card.statuses.find((st) => st.key === "BLESSED")?.turnsLeft).toBe(2);
    s.turnCount = 4;
    tickTurnStart(s, "you");
    expect(card.statuses.find((st) => st.key === "BLESSED")?.turnsLeft).toBe(1);
    s.turnCount = 5;
    tickTurnStart(s, "you");
    expect(card.statuses.some((st) => st.key === "BLESSED")).toBe(false);
  });

  test("normalizeState migra estado v1 preenchendo os campos do motor v2", () => {
    const raw = {
      state_version: 1,
      you: {
        name: "P1", hp: 30, maxHp: 30, ap: 1, maxAp: 1, attacksUsed: 0,
        field: [{ uid: "a", atk: 3, ps: 10, maxPs: 10 }],
        hand: [],
        deck: [],
      },
      foe: { name: "P2", hp: 30, maxHp: 30, ap: 1, maxAp: 1, attacksUsed: 0, field: [], hand: [], deck: [] },
      turn: "you", turnCount: 1, log: [], over: false, winner: null,
      fx: { target: null, kind: null, stamp: 0 },
    } as unknown as DuelState;
    const s2 = normalizeState(raw);
    expect(s2.state_version).toBe(2);
    expect(s2.pendingChoice).toBeNull();
    const c = s2.you.field[0]!;
    expect(c.abilities).toEqual([]);
    expect(c.keywords).toEqual([]);
    expect(c.statuses).toEqual([]);
    expect(c.mods).toEqual([]);
    expect(c.baseAtk).toBe(3);
    expect(c.baseMaxPs).toBe(10);
  });
});
