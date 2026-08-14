import { createFileRoute } from "@tanstack/react-router";
import { AdminCrewsPage } from "./admin.crews.index";

export const Route = createFileRoute("/admindev/crews/")({
  component: AdminCrewsPage,
});
