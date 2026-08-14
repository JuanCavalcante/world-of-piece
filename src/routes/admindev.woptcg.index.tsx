import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admindev/woptcg/")({
  beforeLoad: () => {
    throw redirect({ to: "/admindev/woptcg/jogadores" });
  },
});
