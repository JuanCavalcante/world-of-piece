import { createFileRoute } from "@tanstack/react-router";
import { BannersAdmin } from "./admin.woptcg.bannerduelo";

export const Route = createFileRoute("/admindev/woptcg/bannerduelo")({
  component: BannersAdmin,
});
