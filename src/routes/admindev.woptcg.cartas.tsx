import { createFileRoute } from "@tanstack/react-router";
import { TcgCardsAdmin } from "./admin.woptcg.cartas";

export const Route = createFileRoute("/admindev/woptcg/cartas")({
  component: TcgCardsAdmin,
});
