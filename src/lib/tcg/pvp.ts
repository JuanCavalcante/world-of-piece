import { supabase } from "@/lib/supabase";
import type { AttackTarget, DuelState } from "@/lib/tcg/duel";
import { startPvpMatchFn, submitPvpActionFn } from "@/lib/tcg/pvp.functions";

export type QueueStatus = "IDLE" | "SEARCHING" | "MATCHED" | "IN_MATCH" | "ALREADY_MATCHED";

export type QueueResult = { status: QueueStatus; matchId: string | null };

export type PvpMatchView = {
  match_id: string;
  status: "PREPARING" | "ACTIVE" | "FINISHED" | "CANCELLED";
  version: number;
  winner_id: string | null;
  opponent_id: string | null;
  opponent_name: string | null;
  opponent_seen_at?: string | null;
  is_my_turn: boolean;
  state: DuelState | null;
};

function one<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T) ?? null;
  return (data as T) ?? null;
}

export async function joinQueue(deckId: string): Promise<QueueResult> {
  const { data, error } = await supabase.rpc("tcg_pvp_join_queue", { _deck_id: deckId });
  if (error) throw new Error(error.message);
  const row = one<{ out_status: QueueStatus; out_match_id: string | null }>(data);
  return { status: row?.out_status ?? "IDLE", matchId: row?.out_match_id ?? null };
}

export async function leaveQueue(): Promise<QueueResult> {
  const { data, error } = await supabase.rpc("tcg_pvp_leave_queue");
  if (error) throw new Error(error.message);
  const row = one<{ out_status: QueueStatus; out_match_id: string | null }>(data);
  return { status: row?.out_status ?? "IDLE", matchId: row?.out_match_id ?? null };
}

export async function queueStatus(): Promise<QueueResult> {
  const { data, error } = await supabase.rpc("tcg_pvp_queue_status");
  if (error) throw new Error(error.message);
  const row = one<{ out_status: QueueStatus; out_match_id: string | null }>(data);
  return { status: row?.out_status ?? "IDLE", matchId: row?.out_match_id ?? null };
}

export async function activeMatch(): Promise<string | null> {
  const { data, error } = await supabase.rpc("tcg_pvp_active_match");
  if (error) throw new Error(error.message);
  const row = one<{ out_match_id: string; out_status: string }>(data);
  return row?.out_match_id ?? null;
}

export async function pingMatch(matchId: string): Promise<{ status: string; version: number } | null> {
  const { data, error } = await supabase.rpc("tcg_pvp_ping", { _match_id: matchId });
  if (error) throw new Error(error.message);
  const row = one<{ out_status: string; out_version: number }>(data);
  return row ? { status: row.out_status, version: row.out_version } : null;
}

/** Leitura redigida: a mão e o deck do adversário chegam apenas como contagem. */
export async function fetchMatchView(matchId: string): Promise<PvpMatchView> {
  const { data, error } = await supabase.rpc("tcg_pvp_match_view", { _match_id: matchId });
  if (error) throw new Error(error.message);
  return data as unknown as PvpMatchView;
}

export async function myMatchResult(matchId: string): Promise<{ won: boolean; status: string } | null> {
  const { data, error } = await supabase.rpc("tcg_pvp_my_reward", { _match_id: matchId });
  if (error) throw new Error(error.message);
  const row = one<{ out_won: boolean; out_status: string }>(data);
  return row ? { won: !!row.out_won, status: row.out_status } : null;
}

export async function startMatch(matchId: string) {
  return startPvpMatchFn({ data: { matchId } });
}

export async function submitAction(
  matchId: string,
  action:
    | { type: "PLAY"; uid: string; slot: number }
    | { type: "ATTACK"; uid: string; target: AttackTarget }
    | { type: "END_TURN" }
    | { type: "SURRENDER" },
) {
  return submitPvpActionFn({ data: { matchId, action } });
}
