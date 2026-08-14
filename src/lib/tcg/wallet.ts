import { supabase } from "@/lib/supabase";
import type { Rarity } from "@/lib/tcg/api";

export type TcgWallet = {
  user_id: string;
  essence: number;
  common_fragments: number;
  uncommon_fragments: number;
  rare_fragments: number;
  epic_fragments: number;
  legendary_fragments: number;
  updated_at: string;
};

/** Mapeia raridade → chave do fragmento na carteira. */
export const RARITY_FRAGMENT: Record<Rarity, keyof TcgWallet> = {
  COMUM: "common_fragments",
  INCOMUM: "uncommon_fragments",
  RARA: "rare_fragments",
  EPICA: "epic_fragments",
  LENDARIA: "legendary_fragments",
};

/** Valor de essência obtido ao extrair uma carta de cada raridade. */
export const ESSENCE_PER_RARITY: Record<Rarity, number> = {
  COMUM: 10,
  INCOMUM: 25,
  RARA: 60,
  EPICA: 150,
  LENDARIA: 400,
};

/** Custo em fragmentos para forjar uma carta. */
export const FORGE_COST = 10;

export async function getMyWallet(): Promise<TcgWallet> {
  const { data, error } = await (supabase as any).rpc("tcg_ensure_wallet_self");
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as TcgWallet;
}

export type ForgeResult = {
  card_id: string;
  name: string;
  rarity: string;
  image_url: string | null;
  is_new: boolean;
};

export async function forgeCard(rarity: Rarity): Promise<ForgeResult> {
  const { data, error } = await (supabase as any).rpc("tcg_forge_card", { _rarity: rarity });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    card_id: row.out_card_id,
    name: row.out_name,
    rarity: row.out_rarity,
    image_url: row.out_image_url,
    is_new: !!row.out_is_new,
  };
}

export type DismantleResult = { name: string; rarity: string; fragments: number };

export async function dismantleCard(cardId: string): Promise<DismantleResult> {
  const { data, error } = await (supabase as any).rpc("tcg_dismantle_card", { _card_id: cardId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { name: row.out_name, rarity: row.out_rarity, fragments: row.out_fragments };
}

export type ExtractResult = { name: string; rarity: string; essence: number };

export async function extractEssence(cardId: string): Promise<ExtractResult> {
  const { data, error } = await (supabase as any).rpc("tcg_extract_essence", { _card_id: cardId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { name: row.out_name, rarity: row.out_rarity, essence: row.out_essence };
}
