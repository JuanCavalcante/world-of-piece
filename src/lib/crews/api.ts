import { supabase } from "@/lib/supabase";

export type CrewRole = "capitao" | "imediato" | "tripulante";

export type Crew = {
  id: string;
  name: string | null;
  organization: string | null;
  flag_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CrewPatch = Partial<Pick<Crew, "name" | "organization" | "flag_url">>;

export type CrewMemberDetailed = {
  user_id: string;
  username: string;
  role: CrewRole;
  character_name: string | null;
  level: number;
};

export async function listCrews(): Promise<Crew[]> {
  const { data, error } = await supabase
    .from("crews")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Crew[];
}

export async function getCrew(id: string): Promise<Crew | null> {
  const { data, error } = await supabase.from("crews").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Crew) ?? null;
}

export async function createCrew(): Promise<Crew> {
  const { data, error } = await supabase.from("crews").insert({}).select("*").single();
  if (error) throw error;
  return data as Crew;
}

export async function updateCrew(id: string, patch: CrewPatch): Promise<void> {
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase
    .from("crews")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCrew(id: string): Promise<void> {
  const { error } = await supabase.from("crews").delete().eq("id", id);
  if (error) throw error;
}

export async function listCrewMembersDetailed(crewId: string): Promise<CrewMemberDetailed[]> {
  const { data, error } = await supabase.rpc("get_crew_members_detailed", { _crew_id: crewId });
  if (error) throw error;
  return (data ?? []) as CrewMemberDetailed[];
}

export async function addCrewMember(crewId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("crew_members")
    .insert({ crew_id: crewId, user_id: userId, role: "tripulante" });
  if (error) throw error;
}

export async function removeCrewMember(crewId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("crew_members")
    .delete()
    .eq("crew_id", crewId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function setCrewMemberRole(
  crewId: string,
  userId: string,
  role: CrewRole,
): Promise<void> {
  const { error } = await supabase
    .from("crew_members")
    .update({ role })
    .eq("crew_id", crewId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function getMyCrew(): Promise<Crew | null> {
  const { data, error } = await supabase.rpc("get_my_crew");
  if (error) throw error;
  const row = (data ?? [])[0];
  return (row as Crew) ?? null;
}
