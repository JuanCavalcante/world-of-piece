import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/lib/supabase";

/**
 * Anexa o bearer token do usuário logado a todas as chamadas de server function.
 * Usa o client do projeto (`VITE_SUPABASE_ANON_KEY`) em vez do gerado.
 */
export const attachAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});
