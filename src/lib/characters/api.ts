import { supabase } from "@/lib/supabase";
import type { Character, CharacterPatch } from "./types";

export async function listCharacters(userId: string): Promise<Character[]> {
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("user_id", userId)
    .eq("is_npc", false)
    .order("slot", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Character[];
}

export async function listNpcs(): Promise<Character[]> {
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("is_npc", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Character[];
}

export async function createNpc(adminId: string): Promise<Character> {
  const { data, error } = await supabase
    .from("characters")
    .insert({ user_id: adminId, slot: 0, is_npc: true })
    .select("*")
    .single();
  if (error) throw error;
  return data as Character;
}

export async function getCharacter(id: string): Promise<Character | null> {
  const { data, error } = await supabase.from("characters").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Character) ?? null;
}

export async function createInSlot(userId: string, slot: number): Promise<Character> {
  const { data, error } = await supabase
    .from("characters")
    .insert({ user_id: userId, slot })
    .select("*")
    .single();
  if (error) throw error;
  return data as Character;
}

export async function updateCharacter(id: string, patch: CharacterPatch): Promise<void> {
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase.from("characters").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteCharacter(id: string): Promise<void> {
  const { error } = await supabase.from("characters").delete().eq("id", id);
  if (error) throw error;
}

export async function setActiveCharacter(id: string): Promise<void> {
  const { error } = await supabase.rpc("set_active_character", { _id: id });
  if (error) throw error;
}
