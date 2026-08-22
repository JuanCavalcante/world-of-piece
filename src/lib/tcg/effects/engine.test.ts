/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import {
  attackWith,
  createPvpDuel,
  endTurn,
  playCard,
  type DuelState,
  type InPlayCard,
} from "@/lib/tcg/duel";
import { resolveChoice } from "@/lib/tcg/effects/engine";
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
  s[side].hand.push({ ...({} as InPlayCard), ...({} as object) } as InPlayCard);
  s[side].hand.pop();
  // usa o fluxo real: injeta na mão e joga com custo 0
  const tcg = { ...card, cost: 0 };
  s[side].hand.push((createPvpDuel("x", [tcg], "y", [tcg]).you.hand[0] as InPlayCard | undefined) ?? ({} as InPlayCard));
  s[side].hand.pop();
  // caminho simples: playCard a partir da mão
  const c = { ...tcg };
  s[side].hand.push(((): InPlayCard => {
    // toInPlay é interno; simulamos via playCard de um duelo auxiliar
    const aux = createPvpDuel("a", [c, c, c, c, c], "b", [c, c, c, c, c]);
    return aux.you.hand[0];
  })());
  s[side].ap = 10;
  const handCard = s[side].hand[s[side].hand.length - 1];
  playCard(s, side, handCard.uid, slot);
  return s[side].field[slot]!;
}

describe("Effect Engine v2", () => {
  test("Guarda obriga ataque à carta de Guarda", () => {
    const guard = mkCard({ name: "Tank", power: 30, atk: 1, abilities: [ab({ effectKey: "KEYWORD", trigger: "PASSIVE", params: { keyword: "GUARD" } })] });
    const filler = mkCard({ power: 5, atk: 1 });
    const s = mkDuel([filler, filler, filler, filler, filler], [guard, filler, filler, filler, filler]);
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
    const filler = mkCard({ power: 5, atk: 1 });
    const s = mkDuel([filler, filler, filler, filler, filler], [guard, filler, filler, filler, filler]);
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

  test("dano ao entrar com alvo escolhido gera pendingChoice e resolve", () => {
    const bolt = mkCard({ name: "Raio", power: 5, atk: 1, abilities: [ab({ effectKey: "DAMAGE_ON_PLAY", target: "ENEMY_CHOSEN", params: { amount: 3 } })] });
    const filler = mkCard({ power: 8, atk: 1 });
    const s = mkDuel([bolt, filler, filler, filler, filler], [filler, filler, filler, filler, filler]);
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

  test("aura de ATK por classe e remoção ao destruir a fonte", () => {
    const leader = mkCard({ name: "Líder", power: 20, atk: 1, abilities: [ab({ effectKey: "AURA_BUFF_ATK", trigger: "PASSIVE", target: "AURA_FILTER", params: { amount: 2, classes: "Lutador" } })] });
    const filler = mkCard({ power: 5, atk: 1 });
    const s = mkDuel([leader, filler, filler, filler, filler], [filler, filler, filler, filler, filler]);
    putOnField(s, "you", leader, 0);
    putOnField(s, "you", mkCard({ name: "Soldado", type: "Lutador", atk: 3, power: 10 }), 1);
    putOnField(s, "you", mkCard({ name: "Snake", type: "Atirador", atk: 3, power: 10 }), 2);
    expect(s.you.field[1]?.atk).toBe(5); // 3 + 2 aura
    expect(s.you.field[2]?.atk).toBe(3); // classe diferente
    // destrói a fonte da aura
    s.you.field[0]!.ps = 0;
    s.you.field[0] = null;
    // recompute acontece no próximo playCard; forçamos via nova jogada
    putOnField(s, "you", mkCard({ name: "Extra", power: 5, atk: 1 }), 3);
    expect(s.you.field[1]?.atk).toBe(3);
  });

  test("Preguiça desperta ao sofrer dano e Furtividade bloqueia alvo", () => {
    const lazy = mkCard({ name: "Preguiçoso", power: 12, atk: 5, abilities: [ab({ effectKey: "GRANT_STATUS", params: { status: "LAZY", duration: "PERMANENT" } })] });
    const stealth = mkCard({ name: "Sombra", power: 6, atk: 2, abilities: [ab({ effectKey: "GRANT_STATUS", params: { status: "STEALTH_UNTIL_ATTACK", duration: "PERMANENT" } })] });
    const filler = mkCard({ power: 5, atk: 1 });
    const s = mkDuel([filler, filler, filler, filler, filler], [lazy, stealth, filler, filler, filler]);
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
});
