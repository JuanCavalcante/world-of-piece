import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { DashboardShell } from "@/components/dashboard-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({
        to: "/entrar",
        search: { redirect: location.href },
      });
    }
  },
  component: DashboardShell,
});
