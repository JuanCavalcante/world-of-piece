import { supabase } from "@/lib/supabase";

const sb = supabase as any;

export type RankKind = "WINS" | "CARDS" | "VR" | "LEVEL";

export const RANK_LABEL: Record<RankKind, string> = {
  WINS: "Vitórias",
  CARDS: "Cartas",
  VR: "VR",
  LEVEL: "Nível",
};

export type RankRow = {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  level: number;
  xp: number;
  vr: number;
  wins: number;
  losses: number;
  win_streak: number;
  best_win_streak: number;
  total_cards: number;
  unique_cards: number;
};

export type MyRankRow = RankRow & { total: number };

export type PlayerStats = {
  vr: number;
  wins: number;
  losses: number;
  win_streak: number;
  loss_streak: number;
  best_win_streak: number;
};

export type PublicProfile = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  level: number;
  xp: number;
  vr: number;
  wins: number;
  losses: number;
  win_streak: number;
  best_win_streak: number;
  total_cards: number;
  unique_cards: number;
  rank_wins: number;
  rank_cards: number;
  rank_vr: number;
  rank_level: number;
};

export type PlayerSuggestion = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  level: number;
};

export type DuelReward = {
  user_id: string;
  won: boolean;
  xp: number;
  vr_delta: number;
  vr: number;
  win_streak: number;
  loss_streak: number;
  best_win_streak: number;
};

/** Taxa de vitória em % (0–100). */
export function winRatePct(wins: number, losses: number): number {
  const total = wins + losses;
  return total === 0 ? 0 : Math.round((wins / total) * 100);
}

function mapRankRow(r: any): RankRow {
  return {
    rank: Number(r.out_rank ?? 0),
    user_id: r.out_user_id,
    username: r.out_username ?? "Jogador",
    avatar_url: r.out_avatar_url ?? null,
    level: Number(r.out_level ?? 1),
    xp: Number(r.out_xp ?? 0),
    vr: Number(r.out_vr ?? 0),
    wins: Number(r.out_wins ?? 0),
    losses: Number(r.out_losses ?? 0),
    win_streak: Number(r.out_win_streak ?? 0),
    best_win_streak: Number(r.out_best_win_streak ?? 0),
    total_cards: Number(r.out_total_cards ?? 0),
    unique_cards: Number(r.out_unique_cards ?? 0),
  };
}

export async function listRanking(kind: RankKind, limit = 10): Promise<RankRow[]> {
  const { data, error } = await sb.rpc("tcg_ranking", { _kind: kind, _limit: limit });
  if (error) throw error;
  return ((data ?? []) as any[]).map(mapRankRow);
}

export async function getMyRanking(kind: RankKind): Promise<MyRankRow | null> {
  const { data, error } = await sb.rpc("tcg_my_ranking", { _kind: kind });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return { ...mapRankRow(row), user_id: "", total: Number(row.out_total ?? 0) };
}

export async function getMyStats(): Promise<PlayerStats> {
  const { data, error } = await sb.rpc("tcg_my_stats");
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) ?? {};
  return {
    vr: Number(row.out_vr ?? 0),
    wins: Number(row.out_wins ?? 0),
    losses: Number(row.out_losses ?? 0),
    win_streak: Number(row.out_win_streak ?? 0),
    loss_streak: Number(row.out_loss_streak ?? 0),
    best_win_streak: Number(row.out_best_win_streak ?? 0),
  };
}

export async function getPublicProfile(nickname: string): Promise<PublicProfile | null> {
  const { data, error } = await sb.rpc("tcg_public_profile", { _nickname: nickname });
  if (error) throw error;
  const r = Array.isArray(data) ? data[0] : data;
  if (!r) return null;
  return {
    user_id: r.out_user_id,
    username: r.out_username ?? "Jogador",
    avatar_url: r.out_avatar_url ?? null,
    banner_url: r.out_banner_url ?? null,
    level: Number(r.out_level ?? 1),
    xp: Number(r.out_xp ?? 0),
    vr: Number(r.out_vr ?? 0),
    wins: Number(r.out_wins ?? 0),
    losses: Number(r.out_losses ?? 0),
    win_streak: Number(r.out_win_streak ?? 0),
    best_win_streak: Number(r.out_best_win_streak ?? 0),
    total_cards: Number(r.out_total_cards ?? 0),
    unique_cards: Number(r.out_unique_cards ?? 0),
    rank_wins: Number(r.out_rank_wins ?? 0),
    rank_cards: Number(r.out_rank_cards ?? 0),
    rank_vr: Number(r.out_rank_vr ?? 0),
    rank_level: Number(r.out_rank_level ?? 0),
  };
}

export async function searchPlayers(q: string, limit = 5): Promise<PlayerSuggestion[]> {
  const term = q.trim();
  if (!term) return [];
  const { data, error } = await sb.rpc("tcg_search_players", { _q: term, _limit: limit });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    user_id: r.out_user_id,
    username: r.out_username ?? "Jogador",
    avatar_url: r.out_avatar_url ?? null,
    level: Number(r.out_level ?? 1),
  }));
}

/** Encerra o duelo de forma atômica: wins/losses, streaks, XP, VR e gatilhos de conquistas. */
export async function finishMatch(params: {
  winnerId: string | null;
  loserId: string | null;
  turns: number;
  winnerName: string;
  loserName: string;
}): Promise<DuelReward[]> {
  const { data, error } = await sb.rpc("tcg_finish_match", {
    _winner_id: params.winnerId,
    _loser_id: params.loserId,
    _turns: Math.max(0, params.turns),
    _winner_name: params.winnerName,
    _loser_name: params.loserName,
  });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    user_id: r.out_user_id,
    won: !!r.out_won,
    xp: Number(r.out_xp ?? 0),
    vr_delta: Number(r.out_vr_delta ?? 0),
    vr: Number(r.out_vr ?? 0),
    win_streak: Number(r.out_win_streak ?? 0),
    loss_streak: Number(r.out_loss_streak ?? 0),
    best_win_streak: Number(r.out_best_win_streak ?? 0),
  }));
}
