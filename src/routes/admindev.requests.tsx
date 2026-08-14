import { createFileRoute } from "@tanstack/react-router";
import { AdminRequestsPage } from "./admin.requests";

export const Route = createFileRoute("/admindev/requests")({
  component: AdminRequestsPage,
});
