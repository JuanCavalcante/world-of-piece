import { supabase } from "@/lib/supabase";

export type PlayerRow = {
  id: string;
  email: string;
  username: string;
  created_at: string;
  is_admin: boolean;
  character_count: number;
};

export async function listPlayers(): Promise<PlayerRow[]> {
  const { data, error } = await supabase.rpc("admin_list_players");
  if (error) throw error;
  return (data ?? []) as PlayerRow[];
}

export async function getPlayer(id: string): Promise<Omit<PlayerRow, "character_count"> | null> {
  const { data, error } = await supabase.rpc("admin_get_player", { _id: id });
  if (error) throw error;
  const row = (data ?? [])[0];
  return row ?? null;
}

export async function setAdminRole(userId: string, isAdmin: boolean) {
  if (isAdmin) {
    const { error } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "admin");
    if (error) throw error;
  }
}

export async function listPlayerDisabledFeatures(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_feature_flags")
    .select("feature")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.feature as string);
}

export async function logAdminAction(
  actorId: string,
  targetUserId: string | null,
  action: string,
  details?: Record<string, unknown>,
) {
  await supabase.from("admin_audit_log").insert({
    actor_id: actorId,
    target_user_id: targetUserId,
    action,
    details: details ?? null,
  });
}
