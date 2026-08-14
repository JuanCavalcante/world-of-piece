import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Check, Sparkles, Package, Gift } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { TcgPageHeader } from "@/components/tcg/tcg-shell";
import { AchievementIcon } from "@/components/tcg/achievement-icon";
import { rewardToast } from "@/components/tcg/reward-toast";
import { ProgressBar } from "@/components/tcg/progress-bar";
import { useProgression } from "@/hooks/use-progression";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABEL,
  claimAchievements,
  listAchievements,
  listMyAchievements,
  type Achievement,
  type AchievementCategory,
  type UserAchievement,
} from "@/lib/tcg/achievements";

export const Route = createFileRoute("/tcggame/achievements")({
  head: () => ({
    meta: [
      { title: "Conquistas — WOP TCG" },
      { name: "description", content: "Acompanhe suas conquistas de coleção, duelo e progressão no WOP TCG." },
      { property: "og:title", content: "Conquistas — WOP TCG" },
      { property: "og:description", content: "Acompanhe suas conquistas de coleção, duelo e progressão no WOP TCG." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AchievementsPage,
});

const TABS: AchievementCategory[] = ["COLLECTION", "DUEL", "PROGRESSION", "MARKET"];

function AchievementsPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const { sync } = useProgression();
  const qc = useQueryClient();
  const [tab, setTab] = useState<AchievementCategory>("COLLECTION");

  useEffect(() => {
    void sync();
  }, [sync]);

  const { data: achievements } = useQuery({
    queryKey: ["tcg-achievements"],
    queryFn: listAchievements,
    staleTime: 5 * 60_000,
  });
  const { data: mine } = useQuery({
    queryKey: ["tcg-user-achievements", userId],
    queryFn: () => listMyAchievements(userId!),
    enabled: !!userId,
  });

  const byId = useMemo(() => {
    const map = new Map<string, UserAchievement>();
    (mine ?? []).forEach((r) => map.set(r.achievement_id, r));
    return map;
  }, [mine]);

  const all = achievements ?? [];
  const completed = all.filter((a) => byId.get(a.id)?.completed).length;
  const pct = all.length ? Math.round((completed / all.length) * 100) : 0;
  const list = all.filter((a) => a.category === tab);

  const claimable = all.filter((a) => {
    const s = byId.get(a.id);
    return s?.completed && !s.reward_claimed;
  });

  const claim = useMutation({
    mutationFn: (id?: string) => claimAchievements(id),
    onSuccess: (results) => {
      if (!results.length) {
        toast.info("Nenhuma recompensa disponível para resgate.");
        return;
      }
      results.forEach((r, i) =>
        setTimeout(
          () => rewardToast({ kind: "achievement", title: r.title, xp: r.xp, packs: r.packs }),
          i * 400,
        ),
      );
      qc.invalidateQueries({ queryKey: ["tcg-user-achievements", userId] });
      qc.invalidateQueries({ queryKey: ["tcg-player", userId] });
      qc.invalidateQueries({ queryKey: ["tcg-my-cards", userId] });
    },
    onError: () => toast.error("Não foi possível resgatar as recompensas."),
  });

  return (
    <div>
      <TcgPageHeader
        eyebrow="Progressão"
        title="Conquistas"
        description="Marcos permanentes da sua jornada — coleção, duelos e evolução de capitão."
      />

      <div className="relative mb-8 overflow-hidden rounded-2xl border border-gold/25 bg-sea-surface/40 p-6">
        <div className="pointer-events-none absolute -top-20 -right-16 size-48 rounded-full bg-gradient-primary opacity-10 blur-3xl" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.25em] uppercase text-gold/70">Total concluídas</p>
            <p className="font-display text-3xl text-parchment">
              {completed}
              <span className="text-parchment/40"> / {all.length}</span>
            </p>
          </div>
          <p className="font-display text-2xl text-gold">{pct}%</p>
        </div>
        <ProgressBar value={completed} max={all.length} done={pct === 100} className="mt-4 h-2.5" />
        <div className="relative mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={() => claim.mutate(undefined)}
            disabled={!claimable.length || claim.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-[11px] font-bold tracking-widest uppercase text-black transition-all disabled:opacity-40"
          >
            <Gift className="size-3.5" /> Resgatar tudo
          </button>
          <span className="text-[11px] tracking-wider uppercase text-parchment/45">
            {claimable.length} {claimable.length === 1 ? "recompensa disponível" : "recompensas disponíveis"}
          </span>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t === tab;
          const totalT = all.filter((a) => a.category === t).length;
          const doneT = all.filter((a) => a.category === t && byId.get(a.id)?.completed).length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-xl border px-4 py-2 text-xs tracking-widest uppercase transition-all",
                active
                  ? "border-gold/50 bg-gradient-to-r from-wop-red/25 via-wop-purple/20 to-transparent text-parchment shadow-elegant"
                  : "border-gold/15 text-parchment/60 hover:text-parchment hover:border-gold/35",
              )}
            >
              {CATEGORY_LABEL[t]}
              <span className="ml-2 text-gold/80">
                {doneT}/{totalT}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((a) => (
          <AchievementCard
            key={a.id}
            achievement={a}
            state={byId.get(a.id)}
            onClaim={() => claim.mutate(a.id)}
            claiming={claim.isPending}
          />
        ))}
        {list.length === 0 && (
          <p className="text-parchment/50 text-sm">Nenhuma conquista nesta categoria ainda.</p>
        )}
      </div>
    </div>
  );
}

function AchievementCard({
  achievement: a,
  state,
  onClaim,
  claiming,
}: {
  achievement: Achievement;
  state?: UserAchievement;
  onClaim: () => void;
  claiming: boolean;
}) {
  const progress = state?.progress ?? 0;
  const done = !!state?.completed;
  const started = progress > 0;
  const canClaim = done && !state?.reward_claimed;
  const hasReward = a.xp_reward > 0 || a.pack_reward > 0;

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5",
        done
          ? "border-gold/60 bg-sea-surface/60 shadow-[0_0_38px_-12px_rgba(255,201,84,0.8)]"
          : started
            ? "border-gold/25 bg-sea-surface/40 hover:border-gold/45"
            : "border-gold/10 bg-sea-surface/25 opacity-80 hover:opacity-100",
      )}
    >
      {done && (
        <div className="pointer-events-none absolute -top-16 -right-14 size-40 rounded-full bg-gold/25 blur-3xl" />
      )}
      <div className="relative flex items-start gap-3">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-xl border",
            done ? "border-gold/60 bg-gold/10" : "border-gold/20 bg-sea-deep/60",
          )}
        >
          <AchievementIcon name={a.icon} className={done ? "size-5 text-gold" : "size-5 text-parchment/60"} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-sm text-parchment">{a.title}</h3>
            {done ? (
              <Check className="size-3.5 shrink-0 text-gold" />
            ) : !started ? (
              <Lock className="size-3.5 shrink-0 text-parchment/35" />
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-parchment/55">{a.description}</p>
        </div>
      </div>

      <div className="relative mt-4">
        <ProgressBar value={progress} max={a.target_value} done={done} />
        <div className="mt-2 flex items-center justify-between text-[11px] tracking-wider uppercase">
          <span className="text-parchment/45">
            {Math.min(progress, a.target_value)} / {a.target_value}
          </span>
          <span className={done ? "text-gold" : "text-parchment/45"}>
            {done ? "Concluída" : started ? "Em progresso" : "Bloqueada"}
          </span>
        </div>
      </div>

      {hasReward && (
        <div className="relative mt-3 flex flex-wrap gap-2">
          {a.xp_reward > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-gold/20 bg-sea-deep/50 px-2 py-1 text-[10px] tracking-wider uppercase text-gold/90">
              <Sparkles className="size-3" /> +{a.xp_reward} XP
            </span>
          )}
          {a.pack_reward > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-gold/20 bg-sea-deep/50 px-2 py-1 text-[10px] tracking-wider uppercase text-gold/90">
              <Package className="size-3" /> {a.pack_reward} {a.pack_reward === 1 ? "Pack" : "Packs"}
            </span>
          )}
        </div>
      )}

      {done && hasReward && (
        <button
          onClick={onClaim}
          disabled={!canClaim || claiming}
          className={cn(
            "relative mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-[11px] font-bold tracking-widest uppercase transition-all",
            canClaim
              ? "bg-gradient-primary text-black hover:shadow-lg disabled:opacity-50"
              : "border border-gold/20 text-parchment/40",
          )}
        >
          {canClaim ? (
            <>
              <Gift className="size-3.5" /> Resgatar
            </>
          ) : (
            <>
              <Check className="size-3.5" /> Resgatado
            </>
          )}
        </button>
      )}
    </article>
  );
}
