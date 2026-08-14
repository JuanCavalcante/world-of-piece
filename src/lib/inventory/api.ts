import { supabase } from "@/lib/supabase";
import type { InventoryItem, PlayerInventoryRow } from "./types";

export async function listMyInventory(playerId: string): Promise<PlayerInventoryRow[]> {
  const { data, error } = await supabase
    .from("player_inventory")
    .select("*, item:inventory_items(*)")
    .eq("player_id", playerId)
    .in("status", ["AVAILABLE", "PENDING_ACTIVATION"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PlayerInventoryRow[];
}

export async function requestActivation(
  inventoryId: string,
  characterId: string,
  characterName: string,
  quantity: number,
): Promise<void> {
  const { error } = await supabase.rpc("request_activation", {
    _inventory_id: inventoryId,
    _character_id: characterId,
    _character_name: characterName,
    _quantity: quantity,
  });
  if (error) throw error;
}

export async function listCatalog(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as InventoryItem[];
}
