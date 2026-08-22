import { supabase } from "@/lib/supabase";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Ability } from "@/lib/tcg/effects/types";

export type Rarity = "COMUM" | "INCOMUM" | "RARA" | "EPICA" | "LENDARIA";

export const RARITIES: Rarity[] = ["COMUM", "INCOMUM", "RARA", "EPICA", "LENDARIA"];

export const RARITY_LABEL: Record<Rarity, string> = {
  COMUM: "Comum",
  INCOMUM: "Incomum",
  RARA: "Rara",
  EPICA: "Épica",
  LENDARIA: "Lendária",
};

export const RARITY_STYLE: Record<Rarity, string> = {
  COMUM: "border-parchment/25 shadow-[0_0_18px_-8px_rgba(255,255,255,0.35)]",
  INCOMUM: "border-emerald-400/50 shadow-[0_0_20px_-7px_rgba(52,211,153,0.5)]",
  RARA: "border-sky-400/50 shadow-[0_0_22px_-6px_rgba(56,189,248,0.55)]",
  EPICA: "border-fuchsia-400/50 shadow-[0_0_24px_-6px_rgba(232,121,249,0.55)]",
  LENDARIA: "border-gold/70 shadow-[0_0_28px_-4px_rgba(255,201,84,0.7)]",
};

export type TcgCard = {
  id: string;
  name: string;
  rarity: string;
  image_url: string | null;
  power: number;
  effect: string | null;
  cost: number;
  atk: number;
  effect_code: string;

  type: string | null;
  organization: string | null;
  race: string | null;
  family?: string | null;
  status: "WAITING" | "ACTIVE";
  created_at?: string;
  /** Effect Engine v2: habilidades associadas (preenchido via attachCardAbilities). */
  abilities?: Ability[];
};

export type TcgPlayer = {
  user_id: string;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  last_daily_reward_at: string | null;
  created_at: string;
  packs?: number;
  username?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
};


export type UserCard = { card_id: string; quantity: number };

export type TcgNotification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
};

export async function ensureTcgPlayer(): Promise<TcgPlayer | null> {
  const { data, error } = await supabase.rpc("tcg_ensure_player");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? null) as TcgPlayer | null;
}

export const XP_PER_RARITY: Record<string, number> = { COMUM: 5, INCOMUM: 8, RARA: 12, EPICA: 30, LENDARIA: 80 };
export const XP_FIRST_TIME_BONUS: Record<string, number> = {
  COMUM: 15,
  INCOMUM: 25,
  RARA: 40,
  EPICA: 100,
  LENDARIA: 250,
};

export function xpToNextLevel(level: number): number {
  return 100 + (Math.max(1, level) - 1) * 25;
}

export type DailyRewardCard = {
  card_id: string;
  name: string;
  rarity: string;
  image_url: string;
  is_new: boolean;
  xp: number;
  total_xp: number;
  streak: number;
};

export async function claimDailyReward(): Promise<DailyRewardCard[]> {
  const { data, error } = await supabase.rpc("tcg_claim_daily_reward");
  if (error) throw error;
  
  // Mapear os novos nomes dos campos de saída da RPC
  return (data ?? []).map((item: any) => ({
    card_id: item.out_card_id,
    name: item.out_name,
    rarity: item.out_rarity,
    image_url: item.out_image_url,
    is_new: !!item.out_is_new,
    xp: item.out_xp ?? 0,
    total_xp: item.out_total_xp ?? 0,
    streak: item.out_streak ?? 0,
  }));
}

export async function listCards(status: "ACTIVE" | "WAITING" = "ACTIVE"): Promise<TcgCard[]> {
  const { data, error } = await supabase.from("cards").select("*").eq("status", status).order("power", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TcgCard[];
}

export type OpenedPackCard = DailyRewardCard & { packs_left: number };

export async function openPack(): Promise<OpenedPackCard[]> {
  const { data, error } = await supabase.rpc("tcg_open_pack");
  if (error) throw error;
  return (data ?? []).map((item: any) => ({
    card_id: item.out_card_id,
    name: item.out_name,
    rarity: item.out_rarity,
    image_url: item.out_image_url,
    is_new: !!item.out_is_new,
    xp: item.out_xp ?? 0,
    total_xp: item.out_total_xp ?? 0,
    streak: 0,
    packs_left: item.out_packs_left ?? 0,
  }));
}

export async function listMyCards(userId: string): Promise<UserCard[]> {
  const { data, error } = await supabase.from("user_cards").select("card_id, quantity").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as UserCard[];
}

export async function listMyNotifications(userId: string): Promise<TcgNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as TcgNotification[];
}

export async function markNotificationAsRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsAsRead(userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
}

export async function clearAllNotifications(userId: string) {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}

/* ---------- admin ---------- */

export type TcgPlayerRow = {
  user_id: string;
  email: string;
  username: string;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  cards_count: number;
  last_daily_reward_at: string | null;
  created_at: string;
};

export async function adminListTcgPlayers(): Promise<TcgPlayerRow[]> {
  const { data, error } = await supabase.rpc("admin_list_tcg_players");
  if (error) throw error;
  return (data ?? []) as TcgPlayerRow[];
}

export async function adminResetDaily(userId: string) {
  const { error } = await supabase.rpc("admin_tcg_reset_daily", { _user_id: userId });
  if (error) throw error;
}

export async function adminGetTcgPlayer(userId: string): Promise<TcgPlayerRow | null> {
  const rows = await adminListTcgPlayers();
  return rows.find((r) => r.user_id === userId) ?? null;
}

export async function adminListPlayerCards(userId: string): Promise<UserCard[]> {
  const { data, error } = await supabase.rpc("admin_tcg_player_cards", { _user_id: userId });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ card_id: r.card_id, quantity: r.quantity })) as UserCard[];
}

export async function adminAdjustLevel(userId: string, delta: number) {
  const { error } = await supabase.rpc("admin_tcg_adjust_level", { _user_id: userId, _delta: delta });
  if (error) throw error;
}

export async function adminGivePack(userId: string, size = 5) {
  const { error } = await supabase.rpc("admin_tcg_give_pack", { _user_id: userId, _size: size });
  if (error) throw error;
}

export async function adminGivePackAll(size = 5): Promise<number> {
  const { data, error } = await (supabase as any).rpc("admin_tcg_give_pack_all", { _size: size });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function adminResetTcgAccount(userId: string) {
  const { error } = await supabase.rpc("admin_tcg_reset_account", { _user_id: userId });
  if (error) throw error;
}

export async function adminResetAllTcgAccounts(): Promise<number> {
  const { data, error } = await (supabase as any).rpc("admin_tcg_reset_all_accounts");
  if (error) throw error;
  return Number(data ?? 0);
}

export type AdminPlayerWallet = {
  essence: number;
  common_fragments: number;
  uncommon_fragments: number;
  rare_fragments: number;
  epic_fragments: number;
  legendary_fragments: number;
};

export async function adminGetPlayerWallet(userId: string): Promise<AdminPlayerWallet | null> {
  const { data, error } = await (supabase as any).rpc("admin_tcg_player_wallet", { _user_id: userId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? null) as AdminPlayerWallet | null;
}

export type AdminPlayerAchievement = {
  achievement_id: string;
  progress: number;
  completed: boolean;
  reward_claimed: boolean;
};

export async function adminListPlayerAchievements(userId: string): Promise<AdminPlayerAchievement[]> {
  const { data, error } = await (supabase as any).rpc("admin_tcg_player_achievements", { _user_id: userId });
  if (error) throw error;
  return (data ?? []) as AdminPlayerAchievement[];
}


export async function adminSaveCard(card: Partial<TcgCard> & { name: string }) {
  const payload = {
    name: card.name,
    rarity: card.rarity ?? "COMUM",
    power: card.power ?? 0,
    atk: Math.max(0, Number(card.atk ?? 10)),
    effect_code: card.effect_code || "NONE",
    cost: Math.max(0, Math.min(10, Number(card.cost ?? 0))),
    effect: card.effect ?? null,
    image_url: card.image_url || null,
    type: card.type || null,
    organization: card.organization || null,
    race: card.race || null,
    family: card.family || null,
    status: card.status || "WAITING"
  };

  if (card.id) {
    const { error } = await supabase.from("cards").update(payload).eq("id", card.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("cards").insert(payload);
    if (error) throw error;
  }
}

export async function adminReleaseCards() {
    const { error } = await supabase.rpc("admin_release_cards");
    if (error) throw error;
}

export async function adminDeleteCard(id: string) {
  const { error } = await supabase.from("cards").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- baralhos ---------- */

export type TcgDeck = {
  id: string;
  name: string;
  created_at: string;
  cards: { card_id: string; quantity: number }[];
};

export async function listMyDecks(userId: string): Promise<TcgDeck[]> {
  const { data, error } = await supabase
    .from("decks")
    .select("id, name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const decks = data ?? [];
  if (!decks.length) return [];
  const { data: dc, error: dce } = await supabase
    .from("deck_cards")
    .select("deck_id, card_id, quantity")
    .in("deck_id", decks.map((d) => d.id));
  if (dce) throw dce;
  return decks.map((d) => ({
    ...d,
    cards: (dc ?? []).filter((r: any) => r.deck_id === d.id).map((r: any) => ({ card_id: r.card_id, quantity: r.quantity })),
  })) as TcgDeck[];
}

/* ---------- duelos ---------- */

export type DuelMatch = {
  id: string;
  opponent: string;
  turns: number;
  won: boolean;
  is_pvp: boolean;
  created_at: string;
};

export async function listDuelHistory(userId: string, limit = 20): Promise<DuelMatch[]> {
  const { data, error } = await (supabase as any).rpc("tcg_duel_history", {
    _user_id: userId,
    _limit: limit,
  });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    id: r.out_match_id,
    opponent: r.out_opponent_name || "Adversário",
    turns: Number(r.out_turns ?? 0),
    won: !!r.out_won,
    is_pvp: !!r.out_is_pvp,
    created_at: r.out_created_at,
  }));
}


export async function saveDuelMatch(params: {
  userId: string;
  winner: string;
  loser: string;
  turns: number;
  won: boolean;
}) {
  const { error } = await supabase.rpc("tcg_record_duel_result", {
    _winner: params.winner,
    _loser: params.loser,
    _turns: params.turns,
    _won: params.won,
  });
  if (error) throw error;
}


export async function updateMyTcgProfile(params: { username?: string; avatar_url?: string }) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Usuário não autenticado.");
  const patch: Record<string, string | null> = {};
  if (params.username !== undefined) patch.username = params.username.trim() || null;
  if (params.avatar_url !== undefined) patch.avatar_url = params.avatar_url.trim() || null;
  const { error } = await (supabase.from("tcg_players") as any).update(patch).eq("user_id", userId);
  if (error) throw error;
}

/* ---------- banners ---------- */

export type TcgBanner = {
  id: string;
  name: string;
  image_url: string;
  created_at: string;
  is_ai?: boolean;
};

export async function listBanners(): Promise<TcgBanner[]> {
  const { data, error } = await (supabase.from("tcg_banners") as any)
    .select("id, name, image_url, created_at, is_ai")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TcgBanner[];
}

export async function getAiBannerUrl(): Promise<string | null> {
  const { data, error } = await (supabase.from("tcg_banners") as any)
    .select("image_url")
    .eq("is_ai", true)
    .maybeSingle();
  if (error) return null;
  return (data?.image_url as string | undefined) ?? null;
}

export async function adminSetAiBanner(id: string) {
  const { error } = await supabase.rpc("admin_tcg_set_ai_banner" as any, { _banner_id: id } as any);
  if (error) throw error;
}

export async function adminSaveBanner(banner: { id?: string; name: string; image_url: string }) {
  const payload = { name: banner.name.trim() || "Banner", image_url: banner.image_url.trim() };
  if (!payload.image_url) throw new Error("Informe a URL da imagem.");
  if (banner.id) {
    const { error } = await (supabase.from("tcg_banners") as any).update(payload).eq("id", banner.id);
    if (error) throw error;
  } else {
    const { error } = await (supabase.from("tcg_banners") as any).insert(payload);
    if (error) throw error;
  }
}

export async function adminDeleteBanner(id: string) {
  const { error } = await (supabase.from("tcg_banners") as any).delete().eq("id", id);
  if (error) throw error;
}

export async function setMyBanner(bannerUrl: string | null) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Usuário não autenticado.");
  const { error } = await (supabase.from("tcg_players") as any)
    .update({ banner_url: bannerUrl })
    .eq("user_id", userId);
  if (error) throw error;
}

/* ---------- perfil público (cosméticos usados no duelo JxJ) ---------- */

export type TcgPublicCosmetics = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  banner_url: string | null;
};

/** Lê avatar/banner públicos de um jogador (usado para exibir o oponente no duelo). */
export async function getPlayerCosmetics(userId: string): Promise<TcgPublicCosmetics | null> {
  const { data, error } = await supabase
    .from("tcg_players")
    .select("user_id, username, avatar_url, banner_url")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as TcgPublicCosmetics) ?? null;
}

/* ---------- Effect Engine v2: catálogo e associações ---------- */

export type TcgEffect = {
  id: string;
  effect_key: string;
  name: string;
  description: string;
  category: string;
  default_trigger: string;
  allowed_triggers: string[];
  allowed_targets: string[];
  params_schema: Record<string, { type: string; label?: string; options?: string[]; default?: unknown; min?: number; max?: number }>;
  active: boolean;
  sort_order: number;
};

export type TcgCardEffectRow = {
  id?: string;
  card_id: string;
  slot: number;
  effect_id: string;
  trigger_code: string | null;
  target_mode: string | null;
  condition_type: string;
  condition_value: string | null;
  params: Record<string, unknown>;
};

export async function listEffectsCatalog(): Promise<TcgEffect[]> {
  const { data, error } = await (supabase.from("effects" as never) as any)
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TcgEffect[];
}

export async function listCardEffects(cardId: string): Promise<TcgCardEffectRow[]> {
  const { data, error } = await (supabase.from("card_effects" as never) as any)
    .select("*")
    .eq("card_id", cardId)
    .order("slot", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TcgCardEffectRow[];
}

/** Substitui as associações de efeito de uma carta (slots 1-3). */
export async function adminSaveCardEffects(cardId: string, rows: Omit<TcgCardEffectRow, "card_id">[]) {
  const clean = rows.filter((r) => r.effect_id).slice(0, 3);
  const { error: delErr } = await (supabase.from("card_effects" as never) as any)
    .delete()
    .eq("card_id", cardId);
  if (delErr) throw delErr;
  if (!clean.length) return;
  const payload = clean.map((r, i) => ({
    card_id: cardId,
    slot: i + 1,
    effect_id: r.effect_id,
    trigger_code: r.trigger_code || null,
    target_mode: r.target_mode || null,
    condition_type: r.condition_type || "NONE",
    condition_value: r.condition_value || null,
    params: r.params ?? {},
  }));
  const { error } = await (supabase.from("card_effects" as never) as any).insert(payload);
  if (error) throw error;
}

type CardEffectJoined = TcgCardEffectRow & { effects: TcgEffect | null };

function rowToAbility(row: CardEffectJoined): Ability | null {
  const eff = row.effects;
  if (!eff) return null;
  return {
    effectKey: eff.effect_key,
    name: eff.name,
    trigger: (row.trigger_code || eff.default_trigger) as Ability["trigger"],
    target: (row.target_mode || eff.allowed_targets?.[0] || "SELF") as Ability["target"],
    condition: { type: row.condition_type || "NONE", value: row.condition_value ?? null },
    params: row.params ?? {},
    slot: row.slot,
  };
}

/** Busca as habilidades de várias cartas e as anexa como `card.abilities`. */
export async function attachCardAbilities<T extends TcgCard>(cards: T[]): Promise<T[]> {
  const ids = Array.from(new Set(cards.map((c) => c.id)));
  if (!ids.length) return cards;
  const { data, error } = await (supabase.from("card_effects" as never) as any)
    .select("*, effects(*)")
    .in("card_id", ids)
    .eq("active", true)
    .order("slot", { ascending: true });
  if (error) throw error;
  const byCard = new Map<string, Ability[]>();
  ((data ?? []) as CardEffectJoined[]).forEach((row) => {
    const ability = rowToAbility(row);
    if (!ability) return;
    const list = byCard.get(row.card_id) ?? [];
    list.push(ability);
    byCard.set(row.card_id, list);
  });
  return cards.map((c) => ({ ...c, abilities: byCard.get(c.id) ?? [] }));
}
