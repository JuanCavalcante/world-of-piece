import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

type ActionInput = {
  matchId: string;
  action:
    | { type: "PLAY"; uid: string; slot: number }
    | { type: "ATTACK"; uid: string; target: { kind: "player" } | { kind: "card"; slot: number } }
    | { type: "END_TURN" }
    | { type: "SURRENDER" }
    | { type: "RESOLVE_CHOICE"; uid: string; targetUid: string | null };
};

export const startPvpMatchFn = createServerFn({ method: "POST" })
  .inputValidator((data: { matchId: string }) => {
    if (!data?.matchId || typeof data.matchId !== "string") throw new Error("matchId inválido.");
    return { matchId: data.matchId };
  })
  .handler(async ({ data }) => {
    const { requireUserId, startPvpMatch } = await import("@/lib/tcg/pvp-engine.server");
    const userId = await requireUserId(getRequestHeader("authorization"));
    return startPvpMatch(data.matchId, userId);
  });

export const submitPvpActionFn = createServerFn({ method: "POST" })
  .inputValidator((data: ActionInput) => {
    if (!data?.matchId || typeof data.matchId !== "string") throw new Error("matchId inválido.");
    if (!data?.action?.type) throw new Error("Ação inválida.");
    return data;
  })
  .handler(async ({ data }) => {
    const { requireUserId, submitPvpAction } = await import("@/lib/tcg/pvp-engine.server");
    const userId = await requireUserId(getRequestHeader("authorization"));
    return submitPvpAction(data.matchId, userId, data.action);
  });
