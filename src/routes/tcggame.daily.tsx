import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, Flame, Gift, Package, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { TcgPageHeader } from "@/components/tcg/tcg-shell";
import { AchievementIcon } from "@/components/tcg/achievement-icon";
import { rewardToast } from "@/components/tcg/reward-toast";
import { ProgressBar } from "@/components/tcg/progress-bar";
import { useProgression } from "@/hooks/use-progression";
import { cn } from "@/lib/utils";
import {
  STREAK_REWARDS,
  claimDailyMissions,
  getDailyStreak,
  listDailyMissions,
  listMyDailyMissions,
  msUntilDailyReset,
  todayKey,
  type DailyMission,
  type UserDailyMission,
} from "@/lib/tcg/achievements";

export const Route = createFileRoute("/tcggame/daily")({
  head: () => ({
    meta: [
      { title: "Missões Diárias — WOP TCG" },
      { name: "description", content: "Complete missões diárias, mantenha sua sequência e ganhe packs bônus no WOP TCG." },
      { property: "og:title", content: "Missões Diárias — WOP TCG" },
      { property: "og:description", content: "Complete missões diárias, mantenha sua sequência e ganhe packs bônus no WOP TCG." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DailyPage,
});

function useResetCountdown() {
  const [left, setLeft] = useState(() => msUntilDailyReset());
  useEffect(() => {
    const t = setInterval(() => setLeft(msUntilDailyReset()), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function DailyPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const { login } = useProgression();
  const countdown = useResetCountdown();
  const qc = useQueryClient();

  useEffect(() => {
    void login();
  }, [login]);

  const { data: missions } = useQuery({
    queryKey: ["tcg-daily-mission-defs"],
    queryFn: listDailyMissions,
    staleTime: 5 * 60_000,
  });
  const { data: mine } = useQuery({
    queryKey: ["tcg-daily-missions", userId],
    queryFn: () => listMyDailyMissions(userId!),
    enabled: !!userId,
    refetchInterval: 60_000,
  });
  const { data: streak } = useQuery({
    queryKey: ["tcg-daily-streak", userId],
    queryFn: () => getDailyStreak(userId!),
    enabled: !!userId,
  });

  const byId = useMemo(() => {
    const map = new Map<string, UserDailyMission>();
    (mine ?? []).forEach((r) => map.set(r.mission_id, r));
    return map;
  }, [mine]);

  const list = missions ?? [];
  const done = list.filter((m) => byId.get(m.id)?.completed).length;
  const allDone = list.length > 0 && done === list.length;
  const bonusUnlocked = streak?.bonus_claimed_date === todayKey();
  const currentDay = Math.min(Math.max(streak?.current_streak ?? 0, 1), 7);

  const claimable = list.filter((m) => {
    const s = byId.get(m.id);
    return s?.completed && !s.reward_claimed;
  });

  const claim = useMutation({
    mutationFn: (id?: string) => claimDailyMissions(id),
    onSuccess: (results) => {
      if (!results.length) {
        toast.info("Nenhuma recompensa disponível para resgate.");
        return;
      }
      results.forEach((r, i) =>
        setTimeout(
          () =>
            rewardToast({
              kind: r.bonus ? "bonus" : "mission",
              title: r.bonus ? "+1 Pack bônus diário" : r.title,
              xp: r.xp,
              packs: r.bonus ? 1 : 0,
            }),
          i * 500,
        ),
      );
      qc.invalidateQueries({ queryKey: ["tcg-daily-missions", userId] });
      qc.invalidateQueries({ queryKey: ["tcg-daily-streak", userId] });
      qc.invalidateQueries({ queryKey: ["tcg-player", userId] });
      qc.invalidateQueries({ queryKey: ["tcg-my-cards", userId] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Falha ao resgatar recompensas."),
  });

  return (
    <div>
      <TcgPageHeader
        eyebrow="Rotina do capitão"
        title="Missões Diárias"
        description="Missões que reiniciam todos os dias. Complete todas para receber o pack bônus."
      />

      {claimable.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/45 bg-sea-surface/50 px-5 py-4">
          <p className="text-[11px] tracking-[0.25em] uppercase text-gold/85">
            {claimable.length} recompensa{claimable.length > 1 ? "s" : ""} disponível
            {claimable.length > 1 ? "eis" : ""}
          </p>
          <button
            onClick={() => claim.mutate(undefined)}
            disabled={claim.isPending}
            className="inline-flex items-center gap-2 rounded-xl border border-gold/60 bg-gold/10 px-4 py-2 text-[11px] tracking-widest uppercase text-gold transition-colors hover:bg-gold/20 disabled:opacity-50"
          >
            <Gift className="size-3.5" /> Resgatar tudo
          </button>
        </div>
      )}

      {/* Sequência diária */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-gold/25 bg-sea-surface/40 p-6">
        <div className="pointer-events-none absolute -top-20 -left-10 size-48 rounded-full bg-gradient-primary opacity-10 blur-3xl" />
        <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[11px] tracking-[0.25em] uppercase text-gold/80">
            <Flame className="size-4" /> Sequência diária · Dia {currentDay}
          </p>
          <p className="flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-parchment/60">
            <Clock className="size-3.5 text-gold/70" /> Reinicia em {countdown}
          </p>
        </div>
        <div className="relative grid grid-cols-4 gap-2 sm:grid-cols-7">
          {STREAK_REWARDS.map((r) => {
            const isCurrent = r.day === currentDay;
            const passed = r.day < currentDay;
            return (
              <div
                key={r.day}
                className={cn(
                  "rounded-xl border p-3 text-center transition-all",
                  isCurrent
                    ? "border-gold/70 bg-gold/10 shadow-[0_0_30px_-10px_rgba(255,201,84,0.85)] scale-[1.03]"
                    : passed
                      ? "border-gold/30 bg-sea-deep/50"
                      : "border-gold/10 bg-sea-deep/30 opacity-70",
                )}
              >
                <p className="text-[10px] tracking-[0.2em] uppercase text-parchment/50">Dia {r.day}</p>
                <p className={cn("mt-1 font-display text-sm", isCurrent ? "text-gold" : "text-parchment/85")}>
                  {r.xp} XP
                </p>
                {r.pack > 0 && (
                  <p className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase text-gold/85">
                    <Package className="size-3" /> {r.pack} Pack
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contador */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/20 bg-sea-surface/35 px-5 py-4">
        <p className="text-[11px] tracking-[0.25em] uppercase text-gold/70">Missões concluídas hoje</p>
        <p className="font-display text-xl text-parchment">
          {done}
          <span className="text-parchment/40"> / {list.length}</span>
        </p>
        <ProgressBar value={done} max={list.length} done={allDone} className="w-full" />
      </div>

      {/* Missões */}
      <div className="grid gap-4 sm:grid-cols-2">
        {list.map((m) => (
          <MissionCard
            key={m.id}
            mission={m}
            state={byId.get(m.id)}
            onClaim={() => claim.mutate(m.id)}
            claiming={claim.isPending}
          />
        ))}
      </div>

      {/* Bônus */}
      {(allDone || bonusUnlocked) && (
        <div className="relative mt-6 overflow-hidden rounded-2xl border border-gold/60 bg-sea-surface/60 p-6 shadow-[0_0_44px_-12px_rgba(255,201,84,0.8)]">
          <div className="pointer-events-none absolute -top-16 -right-10 size-44 rounded-full bg-gold/25 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-xl border border-gold/60 bg-gold/10">
              <Gift className="size-6 text-gold" />
            </span>
            <div>
              <p className="font-display text-lg text-parchment">Bônus Diário Desbloqueado</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs tracking-wider uppercase text-gold">
                <Sparkles className="size-3.5" /> +1 Pack
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MissionCard({
  mission: m,
  state,
  onClaim,
  claiming,
}: {
  mission: DailyMission;
  state?: UserDailyMission;
  onClaim: () => void;
  claiming: boolean;
}) {
  const progress = state?.progress ?? 0;
  const done = !!state?.completed;
  const claimed = !!state?.reward_claimed;
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 transition-all duration-300",
        done
          ? "border-gold/55 bg-sea-surface/55 shadow-[0_0_34px_-14px_rgba(255,201,84,0.75)]"
          : "border-gold/15 bg-sea-surface/35 hover:border-gold/35",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl border",
            done ? "border-gold/55 bg-gold/10" : "border-gold/20 bg-sea-deep/60",
          )}
        >
          <AchievementIcon name={m.icon} className={done ? "size-4.5 text-gold" : "size-4.5 text-parchment/60"} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-sm text-parchment">{m.title}</h3>
            {done && <Check className="size-3.5 shrink-0 text-gold" />}
          </div>
          <p className="mt-1 text-xs text-parchment/55">{m.description}</p>
        </div>
        <span className="shrink-0 rounded-lg border border-gold/20 bg-sea-deep/50 px-2 py-1 text-[10px] tracking-wider uppercase text-gold/90">
          +{m.xp_reward} XP
        </span>
      </div>
      <ProgressBar value={progress} max={m.target_value} done={done} className="mt-4" />
      <p className="mt-2 text-[11px] tracking-wider uppercase text-parchment/45">
        {Math.min(progress, m.target_value)} / {m.target_value}
      </p>
      {done && (
        <button
          onClick={onClaim}
          disabled={claimed || claiming}
          className={cn(
            "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[11px] tracking-widest uppercase transition-colors",
            claimed
              ? "border-gold/20 text-parchment/40"
              : "border-gold/60 bg-gold/10 text-gold hover:bg-gold/20 disabled:opacity-50",
          )}
        >
          {claimed ? (
            <>
              <Check className="size-3.5" /> Resgatado
            </>
          ) : (
            <>
              <Gift className="size-3.5" /> Resgatar
            </>
          )}
        </button>
      )}
    </article>
  );
}
