import { createFileRoute } from "@tanstack/react-router";
import { AdminNpcsPage } from "./admin.npcs.index";

export const Route = createFileRoute("/admindev/npcs/")({
  component: AdminNpcsPage,
});
