import { supabase } from "@/lib/supabase";
import type { ActivationRequest, InventoryItem, ItemCategory, ItemTier } from "./types";

export type ItemPatch = {
  name?: string;
  description?: string;
  image_url?: string | null;
  category?: ItemCategory;
  tier?: ItemTier;
  stackable?: boolean;
};

export async function createItem(patch: ItemPatch): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from("inventory_items")
    .insert(patch)
    .select("*")
    .single();
  if (error) throw error;
  return data as InventoryItem;
}

export async function updateItem(id: string, patch: ItemPatch): Promise<void> {
  const { error } = await supabase.from("inventory_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from("inventory_items").delete().eq("id", id);
  if (error) throw error;
}

export async function grantItemToPlayer(
  playerId: string,
  itemId: string,
  quantity: number,
): Promise<void> {
  const { error } = await supabase.from("player_inventory").insert({
    player_id: playerId,
    item_id: itemId,
    quantity,
    status: "AVAILABLE",
  });
  if (error) throw error;
}

export async function listActivationRequests(
  status: "PENDING" | "APPROVED" | "REJECTED" = "PENDING",
): Promise<ActivationRequest[]> {
  const { data, error } = await supabase.rpc("admin_list_activation_requests", { _status: status });
  if (error) throw error;
  return (data ?? []) as ActivationRequest[];
}

export async function approveRequest(id: string): Promise<void> {
  const { error } = await supabase.rpc("approve_activation", { _request_id: id });
  if (error) throw error;
}

export async function rejectRequest(id: string, reason?: string): Promise<void> {
  const { error } = await supabase.rpc("reject_activation", {
    _request_id: id,
    _reason: reason ?? null,
  });
  if (error) throw error;
}
