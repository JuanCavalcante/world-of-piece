import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  attackWith,
  createPvpDuel,
  endTurn,
  playCard,
  surrender,
  type AttackTarget,
  type DuelState,
  type SideKey,
} from "@/lib/tcg/duel";
import type { TcgCard } from "@/lib/tcg/api";

export type PvpAction =
  | { type: "PLAY"; uid: string; slot: number }
  | { type: "ATTACK"; uid: string; target: AttackTarget }
  | { type: "END_TURN" }
  | { type: "SURRENDER" };

type MatchRow = {
  id: string;
  p1_id: string;
  p2_id: string;
  p1_name: string;
  p2_name: string;
  p1_deck_snapshot: { card_id: string; quantity: number }[];
  p2_deck_snapshot: { card_id: string; quantity: number }[];
  status: string;
  state: DuelState | null;
  version: number;
  turn_count: number;
  winner_id: string | null;
};

function admin(): SupabaseClient {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) {
    throw new Error(
      "Configuração ausente: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente do servidor.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Valida o bearer token do chamador e devolve o user id. */
export async function requireUserId(authHeader: string | null | undefined): Promise<string> {
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token || token.split(".").length !== 3) throw new Error("Não autenticado.");
  const { data, error } = await admin().auth.getUser(token);
  if (error || !data.user) throw new Error("Não autenticado.");
  return data.user.id;
}

async function lockMatch(db: SupabaseClient, matchId: string, actor: string): Promise<MatchRow> {
  const { data, error } = await db.rpc("tcg_pvp_lock_match", { _match_id: matchId, _actor: actor });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as MatchRow | null;
  if (!row) throw new Error("Partida não encontrada.");
  return row;
}

async function loadCards(db: SupabaseClient, ids: string[]): Promise<Map<string, TcgCard>> {
  const map = new Map<string, TcgCard>();
  if (!ids.length) return map;
  const { data, error } = await db.from("cards").select("*").in("id", ids);
  if (error) throw new Error(error.message);
  (data ?? []).forEach((c) => map.set(String(c.id), c as unknown as TcgCard));
  return map;
}

function expand(
  snapshot: { card_id: string; quantity: number }[] | null,
  cards: Map<string, TcgCard>,
): TcgCard[] {
  const out: TcgCard[] = [];
  (snapshot ?? []).forEach((entry) => {
    const card = cards.get(String(entry.card_id));
    if (!card) return;
    const qty = Math.max(0, Math.min(10, Number(entry.quantity) || 0));
    for (let i = 0; i < qty; i++) out.push(card);
  });
  return out;
}

function sideOf(row: MatchRow, userId: string): SideKey {
  if (userId === row.p1_id) return "you";
  if (userId === row.p2_id) return "foe";
  throw new Error("Você não participa desta partida.");
}

async function persist(
  db: SupabaseClient,
  row: MatchRow,
  state: DuelState,
  actor: string,
  actionType: string,
  actionData: Record<string, unknown>,
) {
  const turnUser = state.turn === "you" ? row.p1_id : row.p2_id;
  const winnerId = state.over && state.winner ? (state.winner === "you" ? row.p1_id : row.p2_id) : null;
  const { data, error } = await db.rpc("tcg_pvp_apply_state", {
    _match_id: row.id,
    _actor: actor,
    _expected_version: row.version,
    _state: state as unknown as Record<string, unknown>,
    _turn_user_id: turnUser,
    _turn_count: state.turnCount,
    _over: state.over,
    _winner_id: winnerId,
    _action_type: actionType,
    _action_data: actionData,
  });
  if (error) throw new Error(error.message);
  const res = (Array.isArray(data) ? data[0] : data) as
    | { out_ok: boolean; out_version: number; out_status: string }
    | null;
  if (!res?.out_ok) throw new Error("A partida mudou de estado. Recarregando...");
  return res;
}

/** Cria o estado inicial da partida (idempotente). */
export async function startPvpMatch(matchId: string, userId: string) {
  const db = admin();
  const row = await lockMatch(db, matchId, userId);
  sideOf(row, userId);
  if (row.state) return { ok: true, alreadyStarted: true };
  if (row.status !== "PREPARING") return { ok: true, alreadyStarted: true };

  const ids = [
    ...(row.p1_deck_snapshot ?? []).map((c) => String(c.card_id)),
    ...(row.p2_deck_snapshot ?? []).map((c) => String(c.card_id)),
  ];
  const cards = await loadCards(db, Array.from(new Set(ids)));
  const p1Deck = expand(row.p1_deck_snapshot, cards);
  const p2Deck = expand(row.p2_deck_snapshot, cards);
  if (p1Deck.length < 2 || p2Deck.length < 2) throw new Error("Baralho inválido para a partida.");

  const state = createPvpDuel(row.p1_name, p1Deck, row.p2_name, p2Deck);
  await persist(db, row, state, userId, "MATCH_START", {});
  return { ok: true, alreadyStarted: false };
}

/** Executa uma ação validada pelo servidor. O cliente nunca escreve estado. */
export async function submitPvpAction(matchId: string, userId: string, action: PvpAction) {
  const db = admin();
  const row = await lockMatch(db, matchId, userId);
  const me = sideOf(row, userId);
  if (!row.state) throw new Error("Partida ainda não iniciada.");
  if (row.status !== "ACTIVE" && row.status !== "PREPARING") throw new Error("Partida encerrada.");

  const state = structuredClone(row.state) as DuelState;
  if (state.over) throw new Error("Partida encerrada.");

  if (action.type !== "SURRENDER" && state.turn !== me) throw new Error("Não é o seu turno.");

  switch (action.type) {
    case "PLAY": {
      const slot = Number(action.slot);
      if (!Number.isInteger(slot) || slot < 0 || slot > 6) throw new Error("Slot inválido.");
      const before = state[me].field.filter(Boolean).length;
      playCard(state, me, String(action.uid), slot);
      if (state[me].field.filter(Boolean).length === before) throw new Error("Jogada inválida.");
      break;
    }
    case "ATTACK": {
      const target = action.target;
      if (
        !target ||
        (target.kind !== "player" &&
          (target.kind !== "card" || !Number.isInteger(target.slot) || target.slot < 0 || target.slot > 6))
      ) {
        throw new Error("Alvo inválido.");
      }
      attackWith(state, me, String(action.uid), target);
      break;
    }
    case "END_TURN":
      endTurn(state);
      break;
    case "SURRENDER":
      surrender(state, me);
      break;
    default:
      throw new Error("Ação desconhecida.");
  }

  await persist(db, row, state, userId, action.type, action as unknown as Record<string, unknown>);
  return { ok: true };
}
