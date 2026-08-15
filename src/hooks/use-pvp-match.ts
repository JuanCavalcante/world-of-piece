import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchMatchView, pingMatch, type PvpMatchView } from "@/lib/tcg/pvp";

/**
 * Mantém a visão redigida da partida PvP sincronizada.
 * O Realtime serve apenas como notificação: o estado real sempre vem de uma leitura autorizada.
 */
export function usePvpMatch(matchId: string | null) {
  const [view, setView] = useState<PvpMatchView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!matchId) return;
    try {
      const next = await fetchMatchView(matchId);
      setView(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar a partida.");
    }
  }, [matchId]);

  useEffect(() => {
    if (!matchId) {
      setView(null);
      setError(null);
      return;
    }
    void refresh();
    void pingMatch(matchId).catch(() => undefined);

    const channel = supabase
      .channel(`pvp-match-${matchId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tcg_pvp_matches", filter: `id=eq.${matchId}` },
        () => void refresh(),
      )
      .subscribe();

    const poll = setInterval(() => void refresh(), 3000);
    const heartbeat = setInterval(() => void pingMatch(matchId).catch(() => undefined), 10000);

    return () => {
      clearInterval(poll);
      clearInterval(heartbeat);
      void supabase.removeChannel(channel);
    };
  }, [matchId, refresh]);

  return { view, error, refresh };
}
