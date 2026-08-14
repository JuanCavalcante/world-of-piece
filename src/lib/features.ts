import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

export const FEATURES = ["personagens", "estoque", "tripulacao", "pets", "navio"] as const;
export type FeatureKey = (typeof FEATURES)[number];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  personagens: "Personagens",
  estoque: "Estoque Pessoal",
  tripulacao: "Tripulação",
  pets: "Pets",
  navio: "Navio",
};

export async function listDisabledFeatures(userId: string): Promise<FeatureKey[]> {
  const { data, error } = await supabase
    .from("user_feature_flags")
    .select("feature")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.feature as FeatureKey);
}

export async function setFeatureEnabled(userId: string, feature: FeatureKey, enabled: boolean) {
  if (enabled) {
    const { error } = await supabase
      .from("user_feature_flags")
      .delete()
      .eq("user_id", userId)
      .eq("feature", feature);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("user_feature_flags")
      .upsert({ user_id: userId, feature }, { onConflict: "user_id,feature" });
    if (error) throw error;
  }
}

export function useMyDisabledFeatures() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-disabled-features", user?.id],
    queryFn: () => listDisabledFeatures(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}
