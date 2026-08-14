import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AdminLink } from "@/lib/admin/base";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowLeft, Layers, BookOpen, Star, Trophy, Skull, Lock, Gem, FlaskConical, Award } from "lucide-react";
import {
  adminGetTcgPlayer,
  adminGetPlayerWallet,
  adminListPlayerAchievements,
  adminListPlayerCards,
  listCards,
  RARITIES,
  RARITY_LABEL,
  RARITY_STYLE,
  xpToNextLevel,
  type Rarity,
  type TcgCard,
} from "@/lib/tcg/api";
import { listAchievements, CATEGORY_LABEL, type AchievementCategory } from "@/lib/tcg/achievements";
import { CardCost } from "@/components/tcg/card-cost";
import { Skeleton } from "@/components/ui/skeleton";


export const Route = createFileRoute("/admin/woptcg/jogador/$userId")({
  component: PlayerProfileAdmin,
});

const rarityOf = (c: TcgCard): Rarity =>
  (RARITIES.includes(c.rarity as Rarity) ? c.rarity : "COMUM") as Rarity;

function Stat({
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
    <div className="rounded-2xl border border-gold/20 bg-sea-surface/40 p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="grid place-items-center size-9 rounded-xl bg-sea-deep/60 border border-gold/20">
          <Icon className={`size-4 ${accent}`} />
        </span>
        <h2 className="font-display text-[11px] tracking-[0.2em] uppercase text-parchment/80">{label}</h2>
      </div>
      <p className="text-2xl font-display text-parchment">{value}</p>
      <p className="text-[10px] tracking-wider uppercase text-parchment/40 mt-1">{hint}</p>
    </div>
  );
}

export function PlayerProfileAdmin() {
  const { userId } = useParams({ strict: false }) as { userId: string };

  const { data: player, isLoading } = useQuery({
    queryKey: ["admin-tcg-player", userId],
    queryFn: () => adminGetTcgPlayer(userId),
  });
  const { data: cards } = useQuery({ queryKey: ["tcg-cards", "ACTIVE"], queryFn: () => listCards("ACTIVE") });
  const { data: owned } = useQuery({
    queryKey: ["admin-tcg-player-cards", userId],
    queryFn: () => adminListPlayerCards(userId),
  });
  const { data: wallet } = useQuery({
    queryKey: ["admin-tcg-player-wallet", userId],
    queryFn: () => adminGetPlayerWallet(userId),
  });
  const { data: achievements } = useQuery({ queryKey: ["tcg-achievements"], queryFn: listAchievements });
  const { data: playerAch } = useQuery({
    queryKey: ["admin-tcg-player-achievements", userId],
    queryFn: () => adminListPlayerAchievements(userId),
  });

  const qty = useMemo(() => {
    const m = new Map<string, number>();
    (owned ?? []).forEach((r) => m.set(r.card_id, r.quantity));
    return m;
  }, [owned]);

  const achMap = useMemo(() => {
    const m = new Map<string, { progress: number; completed: boolean; reward_claimed: boolean }>();
    (playerAch ?? []).forEach((r) =>
      m.set(r.achievement_id, {
        progress: r.progress ?? 0,
        completed: !!r.completed,
        reward_claimed: !!r.reward_claimed,
      }),
    );
    return m;
  }, [playerAch]);

  const achList = achievements ?? [];
  const achDone = achList.filter((a) => achMap.get(a.id)?.completed).length;
  const achPct = achList.length ? Math.round((achDone / achList.length) * 100) : 0;

  const fragments = wallet
    ? [
        { label: "Comum", value: wallet.common_fragments },
        { label: "Incomum", value: wallet.uncommon_fragments },
        { label: "Rara", value: wallet.rare_fragments },
        { label: "Épica", value: wallet.epic_fragments },
        { label: "Lendária", value: wallet.legendary_fragments },
      ]
    : [];
  const totalFragments = fragments.reduce((a, f) => a + (f.value ?? 0), 0);

  const level = player?.level ?? 1;
  const xp = player?.xp ?? 0;
  const xpNeeded = xpToNextLevel(level);
  const pct = Math.min(100, Math.round((xp / xpNeeded) * 100));


  return (
    <div>
      <AdminLink
        to="/woptcg/jogadores"
        className="inline-flex items-center gap-2 text-[11px] tracking-widest uppercase text-parchment/60 hover:text-gold mb-5"
      >
        <ArrowLeft className="size-3.5" /> Voltar aos jogadores
      </AdminLink>

      {isLoading ? (
        <Skeleton className="h-24 bg-sea-surface/40" />
      ) : !player ? (
        <p className="text-sm text-parchment/60">Jogador não encontrado.</p>
      ) : (
        <>
          <p className="text-[11px] tracking-[0.3em] uppercase text-gold/70 mb-2">Perfil do jogador</p>
          <h2 className="font-display text-2xl mb-6">{player.username || player.email}</h2>

          {/* Painel do jogador */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat icon={Star} label="Nível" value={`Nível ${level}`} hint={`${xp} / ${xpNeeded} XP`} />
            <Stat icon={Layers} label="Cartas obtidas" value={String((owned ?? []).length)} hint="Na coleção" />
            <Stat icon={BookOpen} label="Cartas existentes" value={String((cards ?? []).length)} hint="No catálogo" />
            <Stat icon={Trophy} label="Vitórias" value={String(player.wins ?? 0)} hint="Duelos" />
            <Stat icon={Skull} label="Derrotas" value={String(player.losses ?? 0)} hint="Duelos" accent="text-wop-red" />
            <Stat
              icon={FlaskConical}
              label="Essência"
              value={String(wallet?.essence ?? 0)}
              hint="Moeda do mercado"
              accent="text-fuchsia-400"
            />
            <Stat
              icon={Gem}
              label="Fragmentos"
              value={String(totalFragments)}
              hint="Total de todas as raridades"
              accent="text-sky-400"
            />
            <Stat
              icon={Award}
              label="Conquistas"
              value={`${achDone} / ${achList.length}`}
              hint={`${achPct}% concluído`}
            />
          </div>

          {/* Fragmentos por raridade */}
          <div className="mt-6 rounded-2xl border border-gold/20 bg-sea-surface/40 p-6">
            <p className="text-[11px] tracking-[0.3em] uppercase text-gold/70 mb-4">Fragmentos por raridade</p>
            <div className="flex flex-wrap gap-2">
              {fragments.map((f) => (
                <span
                  key={f.label}
                  className="flex items-center gap-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 px-3 py-1.5 text-[11px] tracking-wider uppercase text-sky-200"
                >
                  <Gem className="size-3.5" /> {f.label}: {f.value ?? 0}
                </span>
              ))}
              {fragments.length === 0 && (
                <span className="text-xs text-parchment/50">Carteira sem dados.</span>
              )}
            </div>
          </div>


          <div className="mt-6 rounded-2xl border border-gold/20 bg-sea-surface/40 p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] tracking-[0.3em] uppercase text-gold/70">Experiência</p>
              <p className="text-xs text-parchment/60">
                {xp} / {xpNeeded} XP · Nível {level}
              </p>
            </div>
            <div className="h-3 rounded-full bg-sea-deep/70 border border-gold/15 overflow-hidden">
              <div
                className="h-full bg-gradient-primary transition-all duration-700"
                style={{ width: `${Math.max(4, pct)}%` }}
              />
            </div>
          </div>

          {/* Conquistas */}
          <div className="mt-6 rounded-2xl border border-gold/20 bg-sea-surface/40 p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] tracking-[0.3em] uppercase text-gold/70">Progressão de conquistas</p>
              <p className="text-xs text-parchment/60">
                {achDone} / {achList.length} concluídas · {achPct}%
              </p>
            </div>
            <div className="h-3 rounded-full bg-sea-deep/70 border border-gold/15 overflow-hidden mb-5">
              <div
                className="h-full bg-gradient-primary transition-all duration-700"
                style={{ width: `${Math.max(2, achPct)}%` }}
              />
            </div>

            {achList.length === 0 ? (
              <p className="text-xs text-parchment/50">Nenhuma conquista cadastrada.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {achList.map((a) => {
                  const st = achMap.get(a.id);
                  const prog = Math.min(a.target_value, st?.progress ?? 0);
                  const p = a.target_value ? Math.round((prog / a.target_value) * 100) : 0;
                  return (
                    <div
                      key={a.id}
                      className={`rounded-xl border p-3 ${
                        st?.completed ? "border-gold/40 bg-gold/5" : "border-gold/12 bg-sea-deep/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm truncate">{a.title}</p>
                        <span className="text-[10px] tracking-widest uppercase text-parchment/50 shrink-0">
                          {CATEGORY_LABEL[a.category as AchievementCategory] ?? a.category}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-sea-deep/80 border border-gold/10 overflow-hidden">
                        <div
                          className={`h-full ${st?.completed ? "bg-gold" : "bg-parchment/40"}`}
                          style={{ width: `${p}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-[10px] tracking-wider uppercase text-parchment/45">
                        {prog} / {a.target_value}
                        {st?.completed ? (st.reward_claimed ? " · resgatada" : " · concluída") : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>



          {/* Cartas */}
          <p className="text-[11px] tracking-[0.3em] uppercase text-gold/70 mt-8 mb-4">Cartas</p>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {(cards ?? []).map((c) => {
              const n = qty.get(c.id) ?? 0;
              const has = n > 0;
              const r = rarityOf(c);
              return (
                <div
                  key={c.id}
                  className={`relative rounded-2xl border overflow-hidden bg-sea-surface/40 ${RARITY_STYLE[r]} ${
                    has ? "" : "opacity-80"
                  }`}
                >
                  <div className="aspect-[5/7] w-full overflow-hidden bg-sea-deep/60 relative">
                    {c.image_url ? (
                      <img
                        src={c.image_url}
                        alt={c.name}
                        loading="lazy"
                        className={`size-full object-cover ${has ? "" : "grayscale brightness-50"}`}
                      />
                    ) : (
                      <div className="size-full grid place-items-center text-[11px] uppercase text-parchment/30">
                        Sem imagem
                      </div>
                    )}
                    <CardCost cost={c.cost ?? 0} />
                    {!has && (
                      <span className="absolute inset-0 grid place-items-center">
                        <Lock className="size-7 text-parchment/70 drop-shadow" />
                      </span>
                    )}
                    {has && n > 1 && (
                      <span className="absolute top-2 right-2 px-2 py-1 rounded-full text-[9px] bg-black/60 text-parchment border border-gold/30">
                        x{n}
                      </span>
                    )}
                  </div>
                  <div className="p-3 border-t border-gold/10">
                    <p className="text-sm truncate">{c.name}</p>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-gold/70 mt-1">
                      {RARITY_LABEL[r]} · {c.power} HP
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}