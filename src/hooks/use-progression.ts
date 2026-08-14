import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { rewardToast } from "@/components/tcg/reward-toast";
import { bootstrapDaily, syncAchievements, trackDaily, trackEvent } from "@/lib/tcg/achievements";

/**
 * Hook central de progressão: dispara eventos do jogo e mostra os toasts
 * das conquistas / missões concluídas.
 */
export function useProgression() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["tcg-player", userId] });
    qc.invalidateQueries({ queryKey: ["tcg-my-cards", userId] });
    qc.invalidateQueries({ queryKey: ["tcg-user-achievements", userId] });
    qc.invalidateQueries({ queryKey: ["tcg-daily-missions", userId] });
    qc.invalidateQueries({ queryKey: ["tcg-daily-streak", userId] });
  }, [qc, userId]);

  /** Recalcula todas as conquistas permanentes e notifica as novas. */
  const sync = useCallback(async () => {
    if (!userId) return;
    try {
      const unlocked = await syncAchievements();
      unlocked.forEach((a, i) =>
        setTimeout(
          () => rewardToast({ kind: "achievement", title: a.title, xp: a.xp, packs: a.packs }),
          i * 500,
        ),
      );
      if (unlocked.length) invalidate();
      else {
        qc.invalidateQueries({ queryKey: ["tcg-user-achievements", userId] });
      }
    } catch {
      /* progressão nunca deve quebrar o jogo */
    }
  }, [userId, invalidate, qc]);

  /** Registra progresso de missão diária (DAILY_*). */
  const daily = useCallback(
    async (trigger: string, amount = 1) => {
      if (!userId) return;
      try {
        const results = await trackDaily(trigger, amount);
        results.forEach((r, i) =>
          setTimeout(
            () =>
              rewardToast({
                kind: "mission",
                title: r.title,
                xp: 0,
                packs: 0,
              }),
            i * 500,
          ),
        );
        if (results.length) invalidate();
        else qc.invalidateQueries({ queryKey: ["tcg-daily-missions", userId] });
      } catch {
        /* ignora */
      }
    },
    [userId, invalidate, qc],
  );

  /** Contador manual (DEFENSE_DESTROYED, DOUBLE_ATTACK_USED, ...). */
  const counter = useCallback(
    async (trigger: string, amount = 1) => {
      if (!userId) return;
      try {
        await trackEvent(trigger, amount);
      } catch {
        /* ignora */
      }
    },
    [userId],
  );

  /** Login diário: cria as missões do dia e atualiza a sequência. */
  const login = useCallback(async () => {
    if (!userId) return;
    try {
      await bootstrapDaily();
      await daily("DAILY_LOGIN", 1);
      await sync();
    } catch {
      /* ignora */
    }
  }, [userId, daily, sync]);

  return { sync, daily, counter, login };
}
