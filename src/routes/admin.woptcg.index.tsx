import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/woptcg/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/woptcg/jogadores" });
  },
});
