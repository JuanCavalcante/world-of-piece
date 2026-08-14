import { createFileRoute } from "@tanstack/react-router";
import { AdminPlayerDetail } from "./admin.players.$id";

export const Route = createFileRoute("/admindev/players/$id")({
  component: AdminPlayerDetail,
});
