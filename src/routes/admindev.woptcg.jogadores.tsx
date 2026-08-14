import { createFileRoute } from "@tanstack/react-router";
import { TcgPlayersAdmin } from "./admin.woptcg.jogadores";

export const Route = createFileRoute("/admindev/woptcg/jogadores")({
  component: TcgPlayersAdmin,
});
