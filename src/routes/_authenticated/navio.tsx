import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard-shell";

export const Route = createFileRoute("/_authenticated/navio")({
  component: () => <ComingSoon title="Navio" />,
});
