import { createFileRoute } from "@tanstack/react-router";
import { AdminItemsPage } from "./admin.items";

export const Route = createFileRoute("/admindev/items")({
  component: AdminItemsPage,
});
