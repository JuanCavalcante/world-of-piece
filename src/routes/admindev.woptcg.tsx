import { createFileRoute } from "@tanstack/react-router";
import { WopTcgAdminLayout } from "./admin.woptcg";

export const Route = createFileRoute("/admindev/woptcg")({
  component: WopTcgAdminLayout,
});
