import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { TcgPageHeader } from "@/components/tcg/tcg-shell";
import { ensureTcgPlayer, listCards, listMyCards, claimDailyReward, openPack, xpToNextLevel, type DailyRewardCard } from "@/lib/tcg/api";
import { cn } from "@/lib/utils";
import { Layers, BookOpen, Trophy, Gift, Star, Sparkles, Package, Lock, Clock, Percent, Hammer, ArrowLeftRight, FlaskConical } from "lucide-react";
import { PackRevealDialog, OpenPackButton } from "@/components/tcg/pack-reveal";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { audioManager } from "@/lib/audio-manager";
import { useProgression } from "@/hooks/use-progression";
import { ProgressBar } from "@/components/tcg/progress-bar";
import {
  getDailyStreak,
  listAchievements,
  listDailyMissions,
  listMyAchievements,
  listMyDailyMissions,
} from "@/lib/tcg/achievements";
import { getMyWallet } from "@/lib/tcg/wallet";
import { listMarketListings } from "@/lib/tcg/market";
import { getMyRanking, getMyStats } from "@/lib/tcg/rank";

export const Route = createFileRoute("/tcggame/")({
  head: () => ({
    meta: [
      { title: "Painel do Jogador — WOP TCG" },
      { name: "description", content: "Acompanhe sua coleção, nível, conquistas e duelos no TCG do World of Piece." },
      { property: "og:title", content: "Painel do Jogador — WOP TCG" },
      { property: "og:description", content: "Acompanhe sua coleção, nível, conquistas e duelos no TCG do World of Piece." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TcgHome,
});

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "text-gold",
}: {
  icon: typeof Layers;
  label: string;
  value: string;
  hint: string;
  accent?: string;
}) {
  return (
    <div className="group relative rounded-2xl border border-gold/20 bg-sea-surface/40 p-6 overflow-hidden transition-all duration-300 hover:border-gold/50 hover:-translate-y-0.5 hover:shadow-[0_0_36px_-12px_rgba(255,201,84,0.55)]">
      <div className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-gradient-primary opacity-10 blur-2xl group-hover:opacity-25 transition-opacity" />
      <div className="flex items-center gap-3 mb-4">
        <span className="grid place-items-center size-10 rounded-xl bg-sea-deep/60 border border-gold/20">
          <Icon className={`size-5 ${accent}`} />
        </span>
        <h2 className="font-display text-xs tracking-[0.2em] uppercase text-parchment/80">{label}</h2>
      </div>
      <p className="text-3xl font-display text-parchment mb-1">{value}</p>
      <p className="text-[11px] tracking-wider uppercase text-parchment/40">{hint}</p>
    </div>
  );
}

function TcgHome() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const progression = useProgression();
  const [rewardCards, setRewardCards] = useState<DailyRewardCard[] | null>(null);
  const [packCards, setPackCards] = useState<DailyRewardCard[] | null>(null);

  const { data: player } = useQuery({
    queryKey: ["tcg-player", user?.id],
    queryFn: ensureTcgPlayer,
    enabled: !!user?.id,
  });
  const { data: cards } = useQuery({ 
    queryKey: ["tcg-cards", "ACTIVE"], 
    queryFn: () => listCards("ACTIVE") 
  });
  const { data: mine } = useQuery({
    queryKey: ["tcg-my-cards", user?.id],
    queryFn: () => listMyCards(user!.id),
    enabled: !!user?.id,
  });

  const { data: achievements } = useQuery({
    queryKey: ["tcg-achievements"],
    queryFn: listAchievements,
    staleTime: 5 * 60_000,
  });
  const { data: myAchievements } = useQuery({
    queryKey: ["tcg-user-achievements", user?.id],
    queryFn: () => listMyAchievements(user!.id),
    enabled: !!user?.id,
  });
  const { data: missionDefs } = useQuery({
    queryKey: ["tcg-daily-mission-defs"],
    queryFn: listDailyMissions,
    staleTime: 5 * 60_000,
  });
  const { data: myMissions } = useQuery({
    queryKey: ["tcg-daily-missions", user?.id],
    queryFn: () => listMyDailyMissions(user!.id),
    enabled: !!user?.id,
  });
  const { data: streak } = useQuery({
    queryKey: ["tcg-daily-streak", user?.id],
    queryFn: () => getDailyStreak(user!.id),
    enabled: !!user?.id,
  });
  const { data: wallet } = useQuery({
    queryKey: ["tcg-wallet", user?.id],
    queryFn: getMyWallet,
    enabled: !!user?.id,
  });
  const { data: market } = useQuery({
    queryKey: ["tcg-market-listings"],
    queryFn: listMarketListings,
    staleTime: 30_000,
  });
  const { data: stats } = useQuery({
    queryKey: ["tcg-my-stats", user?.id],
    queryFn: getMyStats,
    enabled: !!user?.id,
  });
  const { data: vrRank } = useQuery({
    queryKey: ["tcg-my-ranking", "VR", user?.id],
    queryFn: () => getMyRanking("VR"),
    enabled: !!user?.id,
  });

  const essence = wallet?.essence ?? 0;
  const marketCount = (market ?? []).filter((l) => l.seller_id !== user?.id).length;

  const totalAchievements = (achievements ?? []).length;
  const doneAchievements = (myAchievements ?? []).filter((a) => a.completed).length;
  const achievementsPct = totalAchievements
    ? Math.round((doneAchievements / totalAchievements) * 100)
    : 0;
  const totalMissions = (missionDefs ?? []).length;
  const doneMissions = (myMissions ?? []).filter((m) => m.completed).length;

  const claim = useMutation({
    mutationFn: claimDailyReward,
    onSuccess: (data) => {
        setRewardCards(data);
        audioManager.playSfx("pack-open");
        const hasLegendary = data.some((c) =>
          (c.rarity ?? "").toUpperCase().includes("LEND"),
        );
        if (hasLegendary) setTimeout(() => audioManager.playSfx("legendary"), 700);
        qc.invalidateQueries({ queryKey: ["tcg-player", user?.id] });
        qc.invalidateQueries({ queryKey: ["tcg-my-cards", user?.id] });
        const gained = data.reduce((sum, c) => sum + (c.xp ?? 0), 0);
        toast.success(`Recompensa diária resgatada! +${gained} XP`);
        void progression.daily("DAILY_CARDS_OBTAINED", 1).then(() => progression.sync());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openPackMut = useMutation({
    mutationFn: openPack,
    onSuccess: (data) => {
      setPackCards(data);
      audioManager.playSfx("pack-open");
      if (data.some((c) => (c.rarity ?? "").toUpperCase().includes("LEND"))) {
        setTimeout(() => audioManager.playSfx("legendary"), 700);
      }
      qc.invalidateQueries({ queryKey: ["tcg-player", user?.id] });
      qc.invalidateQueries({ queryKey: ["tcg-my-cards", user?.id] });
      void progression.daily("DAILY_CARDS_OBTAINED", 1).then(() => progression.sync());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const name = player?.username || (user?.email ?? "").split("@")[0] || "Jogador";
  const level = player?.level ?? 1;
  const xp = player?.xp ?? 0;
  const xpNeeded = xpToNextLevel(level);
  const pct = Math.min(100, Math.round((xp / xpNeeded) * 100));
  const owned = (mine ?? []).length;
  const total = (cards ?? []).length;
  const wins = player?.wins ?? 0;
  const losses = player?.losses ?? 0;
  const winRate =
    wins + losses === 0 ? "—" : (losses === 0 ? wins : wins / losses).toFixed(2).replace(".", ",");


  
  const lastClaim = player?.last_daily_reward_at ? new Date(player.last_daily_reward_at).getTime() : 0;
  const nextClaim = lastClaim + 12 * 60 * 60 * 1000;
  
  const [timeLeft, setTimeLeft] = useState<number>(Math.max(0, nextClaim - Date.now()));

  useEffect(() => {
    setTimeLeft(Math.max(0, nextClaim - Date.now()));
    const timer = setInterval(() => {
      setTimeLeft(Math.max(0, nextClaim - Date.now()));
    }, 1000);
    return () => clearInterval(timer);
  }, [nextClaim]);

  const canClaim = timeLeft <= 0;

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}h ${mins}m ${secs}s`;
  };

  return (
    <div>
      <TcgPageHeader
        eyebrow="World of Piece TCG"
        title={`Bem-vindo, ${name}`}
        description="Este é o seu quartel-general no card game do World of Piece. Acompanhe sua coleção, progressão e conquistas."
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="group relative rounded-2xl border border-gold/20 bg-sea-surface/40 p-6 overflow-hidden transition-all duration-300 hover:border-gold/50 hover:-translate-y-0.5 hover:shadow-[0_0_36px_-12px_rgba(255,201,84,0.55)]">
            <div className="flex items-center gap-3 mb-4">
                <span className="grid place-items-center size-10 rounded-xl bg-sea-deep/60 border border-gold/20">
                    <Gift className="size-5 text-gold" />
                </span>
                <h2 className="font-display text-xs tracking-[0.2em] uppercase text-parchment/80">Recompensa diária</h2>
            </div>
            <button 
                onClick={() => claim.mutate()}
                disabled={!canClaim || claim.isPending}
                className={cn(
                  "w-full py-2.5 rounded-xl text-[11px] tracking-widest uppercase font-bold transition-all flex items-center justify-center gap-2",
                  canClaim && !claim.isPending 
                    ? "bg-gradient-primary text-black shadow-glow" 
                    : "bg-sea-deep/60 border border-gold/15 text-gold/40 cursor-not-allowed"
                )}
            >
                {claim.isPending ? (
                  <Sparkles className="size-3.5 animate-spin" />
                ) : !canClaim ? (
                  <Lock className="size-3.5" />
                ) : (
                  <Gift className="size-3.5" />
                )}
                {claim.isPending ? "Resgatando..." : canClaim ? "Resgatar Recompensa" : "Indisponível"}
            </button>
            <div className="mt-3 flex flex-col items-center gap-1">
                {canClaim ? (
                  <p className="text-[10px] tracking-wider uppercase text-gold animate-pulse">
                    Disponível agora!
                  </p>
                ) : (
                  <div className="flex items-center gap-1.5 text-parchment/40">
                    <Clock className="size-3" />
                    <p className="text-[10px] tracking-wider uppercase">
                      Próximo: {formatTime(timeLeft)}
                    </p>
                  </div>
                )}
            </div>
        </div>
        <div className="group relative rounded-2xl border border-gold/20 bg-sea-surface/40 p-6 overflow-hidden transition-all duration-300 hover:border-gold/50 hover:-translate-y-0.5 hover:shadow-[0_0_36px_-12px_rgba(255,201,84,0.55)]">
            <div className="flex items-center gap-3 mb-4">
                <span className="grid place-items-center size-10 rounded-xl bg-sea-deep/60 border border-gold/20">
                    <Package className="size-5 text-gold" />
                </span>
                <h2 className="font-display text-xs tracking-[0.2em] uppercase text-parchment/80">Pacotes guardados</h2>
            </div>
            <OpenPackButton
              packs={player?.packs ?? 0}
              loading={openPackMut.isPending}
              onOpen={() => openPackMut.mutate()}
              className="w-full"
            />
            <p className="mt-3 text-center text-[10px] tracking-wider uppercase text-parchment/40">
              {(player?.packs ?? 0) > 0 ? "Abra um pacote por vez" : "Nenhum pacote disponível"}
            </p>
        </div>
        <StatCard icon={Star} label="Nível do jogador" value={`Nível ${level}`} hint={`${xp} / ${xpNeeded} XP`} />
        <StatCard icon={Layers} label="Cartas obtidas" value={String(owned)} hint="Na sua coleção" />
        <StatCard icon={BookOpen} label="Cartas existentes" value={String(total)} hint="No catálogo do jogo" />
        <StatCard icon={Trophy} label="Vitórias" value={String(wins)} hint={`${losses} derrotas`} />
        <StatCard
          icon={Percent}
          label="Taxa de vitórias"
          value={winRate}
          hint={`${wins + losses} duelos disputados`}
          accent="text-wop-red"
        />
        <Link
          to="/tcggame/rank"
          className="rounded-2xl border border-gold/30 bg-sea-surface/40 p-6 transition-colors hover:border-gold/60"
        >
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="size-4 text-gold" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-parchment/60">Valor de Recompensa</p>
          </div>
          <p className="font-display text-3xl text-gold tabular-nums">{stats?.vr ?? 0} VR</p>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-parchment/40">
            {vrRank ? `${vrRank.rank}º de ${vrRank.total} no ranking` : "Sem posição ainda"}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-parchment/50">
            Sequência {stats?.win_streak ?? 0} · Melhor {stats?.best_win_streak ?? 0}
          </p>
        </Link>



      </div>

      {/* Barra de experiência */}
      <div className="mt-8 rounded-2xl border border-gold/20 bg-sea-surface/40 p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] tracking-[0.3em] uppercase text-gold/70">Experiência</p>
          <p className="text-xs text-parchment/60">
            {xp} / {xpNeeded} XP · Nível {level}
          </p>
        </div>
        <div className="h-3 rounded-full bg-sea-deep/70 border border-gold/15 overflow-hidden">
          <div
            className="h-full bg-gradient-primary transition-all duration-700 shadow-[0_0_18px_-2px_rgba(255,201,84,0.6)]"
            style={{ width: `${Math.max(4, pct)}%` }}
          />
        </div>
      </div>

      {/* Progressão: conquistas e diárias */}
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Link
          to="/tcggame/achievements"
          className="group relative overflow-hidden rounded-2xl border border-gold/20 bg-sea-surface/40 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-[0_0_36px_-12px_rgba(255,201,84,0.55)]"
        >
          <div className="pointer-events-none absolute -top-16 -right-14 size-40 rounded-full bg-gradient-primary opacity-10 blur-3xl" />
          <div className="relative mb-4 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-gold/20 bg-sea-deep/60">
              <Trophy className="size-5 text-gold" />
            </span>
            <h2 className="font-display text-xs tracking-[0.2em] uppercase text-parchment/80">Conquistas</h2>
          </div>
          <p className="relative font-display text-3xl text-parchment">
            {doneAchievements}
            <span className="text-parchment/40"> / {totalAchievements}</span>
            <span className="ml-3 text-base text-gold">{achievementsPct}%</span>
          </p>
          <ProgressBar value={doneAchievements} max={totalAchievements} done={achievementsPct === 100} className="relative mt-4" />
          <p className="relative mt-3 text-[11px] tracking-wider uppercase text-parchment/40">Progresso geral</p>
        </Link>

        <Link
          to="/tcggame/daily"
          className="group relative overflow-hidden rounded-2xl border border-gold/20 bg-sea-surface/40 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-[0_0_36px_-12px_rgba(255,201,84,0.55)]"
        >
          <div className="pointer-events-none absolute -top-16 -right-14 size-40 rounded-full bg-gradient-primary opacity-10 blur-3xl" />
          <div className="relative mb-4 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-gold/20 bg-sea-deep/60">
              <Sparkles className="size-5 text-gold" />
            </span>
            <h2 className="font-display text-xs tracking-[0.2em] uppercase text-parchment/80">Missões diárias</h2>
          </div>
          <p className="relative font-display text-3xl text-parchment">
            {doneMissions}
            <span className="text-parchment/40"> / {totalMissions}</span>
          </p>
          <ProgressBar value={doneMissions} max={totalMissions} done={totalMissions > 0 && doneMissions === totalMissions} className="relative mt-4" />
          <p className="relative mt-3 text-[11px] tracking-wider uppercase text-parchment/40">
            Sequência diária: {streak?.current_streak ?? 0} {(streak?.current_streak ?? 0) === 1 ? "dia" : "dias"}
          </p>
        </Link>
      </div>

      {/* Criação e Mercado */}
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Link
          to="/tcggame/craft"
          className="group relative overflow-hidden rounded-2xl border border-sky-500/20 bg-sea-surface/40 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-500/50 hover:shadow-[0_0_36px_-12px_rgba(56,189,248,0.45)]"
        >
          <div className="pointer-events-none absolute -top-16 -right-14 size-40 rounded-full bg-sky-500/10 blur-3xl group-hover:opacity-25 transition-opacity" />
          <div className="relative mb-4 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-sky-400/20 bg-sea-deep/60">
              <Hammer className="size-5 text-sky-400" />
            </span>
            <h2 className="font-display text-xs tracking-[0.2em] uppercase text-parchment/80">Criação</h2>
          </div>
          <p className="relative font-display text-3xl text-parchment">
            Forja & Essência
          </p>
          <p className="relative mt-3 text-[11px] tracking-wider uppercase text-parchment/40">
            Transforme fragmentos em cartas e extraia essência
          </p>
        </Link>

        <Link
          to="/tcggame/trade"
          className="group relative overflow-hidden rounded-2xl border border-fuchsia-500/20 bg-sea-surface/40 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-fuchsia-500/50 hover:shadow-[0_0_36px_-12px_rgba(232,121,249,0.45)]"
        >
          <div className="pointer-events-none absolute -top-16 -right-14 size-40 rounded-full bg-fuchsia-500/10 blur-3xl group-hover:opacity-25 transition-opacity" />
          <div className="relative mb-4 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-fuchsia-400/20 bg-sea-deep/60">
              <ArrowLeftRight className="size-5 text-fuchsia-400" />
            </span>
            <h2 className="font-display text-xs tracking-[0.2em] uppercase text-parchment/80">Mercado</h2>
          </div>
          <p className="relative font-display text-3xl text-parchment flex items-center gap-2">
            <FlaskConical className="size-6 text-fuchsia-400" /> {essence}
            <span className="text-base text-parchment/40 ml-2">essência</span>
          </p>
          <p className="relative mt-3 text-[11px] tracking-wider uppercase text-parchment/40">
            {marketCount} anúncios ativos no mercado
          </p>
        </Link>
      </div>

      <PackRevealDialog
        cards={rewardCards}
        catalog={cards ?? []}
        title="Recompensa diária"
        onClose={() => setRewardCards(null)}
      />

      <PackRevealDialog
        cards={packCards}
        catalog={cards ?? []}
        title="Pacote aberto!"
        onClose={() => setPackCards(null)}
      />
    </div>
  );
}
