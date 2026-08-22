import { createFileRoute } from "@tanstack/react-router";
import { LojaAdmin } from "./admin.woptcg.loja";

export const Route = createFileRoute("/admindev/woptcg/loja")({
  component: LojaAdmin,
});
