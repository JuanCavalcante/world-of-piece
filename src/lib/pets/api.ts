import { supabase } from "@/lib/supabase";
import type { Pet, PetPatch } from "./types";

export async function listPets(userId: string): Promise<Pet[]> {
  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Pet[];
}

export async function createPet(userId: string): Promise<Pet> {
  const { data, error } = await supabase
    .from("pets")
    .insert({ user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as Pet;
}

export async function updatePet(id: string, patch: PetPatch): Promise<void> {
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase.from("pets").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deletePet(id: string): Promise<void> {
  const { error } = await supabase.from("pets").delete().eq("id", id);
  if (error) throw error;
}
