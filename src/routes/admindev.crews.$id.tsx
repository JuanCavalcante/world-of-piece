import { createFileRoute } from "@tanstack/react-router";
import { AdminCrewEditor } from "./admin.crews.$id";

export const Route = createFileRoute("/admindev/crews/$id")({
  component: AdminCrewEditor,
});
