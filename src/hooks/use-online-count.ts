import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

/**
 * Conta usuários conectados em tempo real usando Supabase Realtime Presence.
 * Cada aba entra num canal global e o total é recalculado a cada sync/join/leave.
 */
export function useOnlineCount(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const key =
      user?.id ??
      `anon-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

    const channel = supabase.channel("wop-online", {
      config: { presence: { key } },
    });

    const update = () => {
      const state = channel.presenceState();
      setCount(Object.keys(state).length);
    };

    channel
      .on("presence", { event: "sync" }, update)
      .on("presence", { event: "join" }, update)
      .on("presence", { event: "leave" }, update)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ at: Date.now() });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return count;
}
