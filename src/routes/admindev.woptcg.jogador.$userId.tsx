import { createFileRoute } from "@tanstack/react-router";
import { PlayerProfileAdmin } from "./admin.woptcg.jogador.$userId";

export const Route = createFileRoute("/admindev/woptcg/jogador/$userId")({
  component: PlayerProfileAdmin,
});
