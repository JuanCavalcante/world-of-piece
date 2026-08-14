import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { TcgShell } from "@/components/tcg/tcg-shell";
import { ensureTcgPlayer } from "@/lib/tcg/api";

export const Route = createFileRoute("/tcggame")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/entrar", search: { redirect: location.href } });
    }
    // registra o jogador no módulo TCG (ignora falhas para não bloquear a navegação)
    await ensureTcgPlayer().catch(() => null);
  },
  component: TcgShell,
});
