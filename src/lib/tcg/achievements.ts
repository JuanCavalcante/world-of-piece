import { supabase } from "@/lib/supabase";

export type AchievementCategory = "COLLECTION" | "DUEL" | "PROGRESSION" | "MARKET";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  icon: string | null;
  xp_reward: number;
  pack_reward: number;
  target_value: number;
  trigger_type: string;
  rarity_filter: string | null;
  is_active: boolean;
  created_at: string;
};

export type UserAchievement = {
  achievement_id: string;
  progress: number;
  completed: boolean;
  completed_at: string | null;
  reward_claimed: boolean;
};

export type DailyMission = {
  id: string;
  title: string;
  description: string;
  icon: string | null;
  xp_reward: number;
  target_value: number;
  trigger_type: string;
  is_active: boolean;
};

export type UserDailyMission = {
  mission_id: string;
  progress: number;
  completed: boolean;
  completed_at: string | null;
  mission_date: string;
  reward_claimed: boolean;
};

export type DailyStreak = {
  user_id: string;
  current_streak: number;
  best_streak: number;
  last_login_date: string | null;
  bonus_claimed_date: string | null;
};

export type SyncResult = {
  id: string;
  title: string;
  category: AchievementCategory;
  xp: number;
  packs: number;
};

export type DailyTrackResult = {
  mission_id: string | null;
  title: string;
  xp: number;
  bonus: boolean;
};

const sb = supabase as any;

/** Data local (America/Sao_Paulo) no formato YYYY-MM-DD, igual ao usado no banco. */
export function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/** Milissegundos restantes até o próximo reset diário (00:00 America/Sao_Paulo). */
export function msUntilDailyReset(): number {
  const now = new Date();
  const local = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const next = new Date(local);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, next.getTime() - local.getTime());
}

export async function listAchievements(): Promise<Achievement[]> {
  const { data, error } = await sb
    .from("achievements")
    .select("*")
    .eq("is_active", true)
    .order("category")
    .order("target_value");
  if (error) throw error;
  return (data ?? []) as Achievement[];
}

export async function listMyAchievements(userId: string): Promise<UserAchievement[]> {
  const { data, error } = await sb
    .from("user_achievements")
    .select("achievement_id, progress, completed, completed_at, reward_claimed")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as UserAchievement[];
}

export async function listDailyMissions(): Promise<DailyMission[]> {
  const { data, error } = await sb
    .from("daily_missions")
    .select("*")
    .eq("is_active", true)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as DailyMission[];
}

export async function listMyDailyMissions(userId: string): Promise<UserDailyMission[]> {
  const { data, error } = await sb
    .from("user_daily_missions")
    .select("mission_id, progress, completed, completed_at, mission_date, reward_claimed")
    .eq("user_id", userId)
    .eq("mission_date", todayKey());
  if (error) throw error;
  return (data ?? []) as UserDailyMission[];
}

export async function getDailyStreak(userId: string): Promise<DailyStreak | null> {
  const { data, error } = await sb.from("daily_streaks").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return (data ?? null) as DailyStreak | null;
}

export async function syncAchievements(): Promise<SyncResult[]> {
  const { data, error } = await sb.rpc("tcg_achievements_sync");
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    id: r.out_id,
    title: r.out_title,
    category: r.out_category,
    xp: r.out_xp ?? 0,
    packs: r.out_packs ?? 0,
  }));
}

export async function bootstrapDaily(): Promise<{ streak: number; best: number; newLogin: boolean }> {
  const { data, error } = await sb.rpc("tcg_daily_bootstrap");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    streak: row?.out_streak ?? 0,
    best: row?.out_best ?? 0,
    newLogin: !!row?.out_new_login,
  };
}

export async function trackDaily(trigger: string, amount = 1): Promise<DailyTrackResult[]> {
  const { data, error } = await sb.rpc("tcg_daily_track", { _trigger: trigger, _amount: amount });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    mission_id: r.out_mission_id ?? null,
    title: r.out_title,
    xp: r.out_xp ?? 0,
    bonus: !!r.out_bonus,
  }));
}

export async function trackEvent(trigger: string, amount = 1): Promise<void> {
  const { error } = await sb.rpc("tcg_track_event", { _trigger: trigger, _amount: amount });
  if (error) throw error;
}

export type ClaimResult = { id: string; title: string; xp: number; packs: number };

/** Resgata as recompensas de uma missão diária concluída (ou de todas, se omitido). */
export async function claimDailyMissions(missionId?: string): Promise<DailyTrackResult[]> {
  const { data, error } = await sb.rpc("tcg_claim_daily", { _mission_id: missionId ?? null });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    mission_id: r.out_mission_id ?? null,
    title: r.out_title,
    xp: r.out_xp ?? 0,
    bonus: !!r.out_bonus,
  }));
}

/** Resgata as recompensas de uma conquista concluída (ou de todas, se omitido). */
export async function claimAchievements(achievementId?: string): Promise<ClaimResult[]> {
  const { data, error } = await sb.rpc("tcg_claim_achievements", {
    _achievement_id: achievementId ?? null,
  });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    id: r.out_id,
    title: r.out_title,
    xp: r.out_xp ?? 0,
    packs: r.out_packs ?? 0,
  }));
}

/** Recompensas da sequência diária de 7 dias. */
export const STREAK_REWARDS: { day: number; xp: number; pack: number }[] = [
  { day: 1, xp: 20, pack: 0 },
  { day: 2, xp: 30, pack: 0 },
  { day: 3, xp: 40, pack: 0 },
  { day: 4, xp: 50, pack: 0 },
  { day: 5, xp: 60, pack: 0 },
  { day: 6, xp: 70, pack: 0 },
  { day: 7, xp: 100, pack: 1 },
];

export const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  COLLECTION: "Coleção",
  DUEL: "Duelo",
  PROGRESSION: "Progressão",
  MARKET: "Mercado",
};
