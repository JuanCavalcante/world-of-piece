import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/tcggame/ranking")({
  beforeLoad: () => {
    throw redirect({ to: "/tcggame/rank" });
  },
});
