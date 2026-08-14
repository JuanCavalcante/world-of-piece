import { createFileRoute } from "@tanstack/react-router";
import { AdminPlayersList } from "./admin.index";

export const Route = createFileRoute("/admindev/")({
  component: AdminPlayersList,
});
