import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured && typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configuradas. Defina-as no .env local e nas Environment Variables da Vercel.",
  );
}

export const supabase: SupabaseClient = createClient(url ?? "http://localhost", anonKey ?? "public-anon-placeholder", {
  auth: { persistSession: true, autoRefreshToken: true },
});
