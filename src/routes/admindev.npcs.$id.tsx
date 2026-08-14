import { createFileRoute } from "@tanstack/react-router";
import { AdminNpcSheetPage } from "./admin.npcs.$id";

export const Route = createFileRoute("/admindev/npcs/$id")({
  component: AdminNpcSheetPage,
});
