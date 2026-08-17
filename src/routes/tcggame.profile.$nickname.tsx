import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { UserRound, Trophy, Medal, Layers, Star, Flame, Swords, BookOpen, ArrowLeft } from "lucide-react";
import { TcgPageHeader } from "@/components/tcg/tcg-shell";
import { xpToNextLevel } from "@/lib/tcg/api";
import { getPublicProfile, listPvpHistory, winRatePct } from "@/lib/tcg/rank";

export const Route = createFileRoute("/tcggame/profile/$nickname")({
  head: () => ({
    meta: [
      { title: "Perfil público — WOP TCG" },
      { name: "description", content: "Veja as estatísticas competitivas de um duelista do World of Piece TCG." },
      { property: "og:title", content: "Perfil público — WOP TCG" },
      { property: "og:description", content: "Veja as estatísticas competitivas de um duelista do World of Piece TCG." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicProfilePage,
});

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Trophy; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-gold/20 bg-sea-surface/40 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-gold" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-parchment/60">{label}</p>
      </div>
      <p className="font-display text-2xl text-parchment tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-[10px] uppercase tracking-widest text-parchment/40">{hint}</p>}
    </div>
  );
}

function PublicProfilePage() {
  const { nickname } = Route.useParams();
  const name = decodeURIComponent(nickname);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["tcg-public-profile", name],
    queryFn: () => getPublicProfile(name),
  });

  if (isLoading) {
    return <p className="py-16 text-center text-xs uppercase tracking-widest text-parchment/40">Carregando perfil...</p>;
  }

  if (!profile) {
    return (
      <div className="rounded-3xl border border-dashed border-gold/25 p-14 text-center">
        <UserRound className="mx-auto mb-4 size-8 text-gold/40" />
        <p className="font-display text-2xl">Jogador não encontrado</p>
        <p className="mt-2 text-sm text-parchment/50">Não existe nenhum duelista chamado “{name}”.</p>
        <Link
          to="/tcggame/rank"
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-gold/40 px-5 py-2.5 text-[11px] uppercase tracking-widest text-gold hover:bg-gold/10"
        >
          <ArrowLeft className="size-3.5" /> Voltar ao ranking
        </Link>
      </div>
    );
  }

  const rate = winRatePct(profile.wins, profile.losses);

  return <ProfileView profile={profile} rate={rate} />;
}

function PvpHistory({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["tcg-pvp-history", userId],
    queryFn: () => listPvpHistory(userId, 20),
  });

  return (
    <section className="mt-8 rounded-3xl border border-gold/20 bg-sea-surface/40 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Swords className="size-4 text-gold" />
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-parchment/60">Histórico de duelos JxJ</h2>
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-xs uppercase tracking-widest text-parchment/40">Carregando duelos...</p>
      ) : !data?.length ? (
        <p className="py-6 text-center text-xs uppercase tracking-widest text-parchment/40">
          Nenhum duelo Jogador vs Jogador registrado.
        </p>
      ) : (
        <ul className="divide-y divide-gold/10">
          {data.map((m) => (
            <li key={m.match_id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-widest ${
                    m.won
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-rose-500/15 text-rose-300"
                  }`}
                >
                  {m.won ? "Vitória" : "Derrota"}
                </span>
                <div className="min-w-0">
                  <Link
                    to="/tcggame/profile/$nickname"
                    params={{ nickname: encodeURIComponent(m.opponent_name) }}
                    className="block truncate text-sm text-parchment hover:text-gold"
                  >
                    vs {m.opponent_name}
                  </Link>
                  <p className="text-[10px] uppercase tracking-widest text-parchment/40">
                    {m.turns} turnos
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-[10px] uppercase tracking-widest text-parchment/40">
                {new Date(m.created_at).toLocaleDateString("pt-BR")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ProfileView({ profile, rate }: { profile: NonNullable<Awaited<ReturnType<typeof getPublicProfile>>>; rate: number }) {

  return (
    <div>
      <TcgPageHeader eyebrow="Perfil público" title={profile.username} description="Estatísticas competitivas deste duelista." />

      <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
        <div className="rounded-3xl border border-gold/20 bg-sea-surface/40 p-6 text-center">
          <div className="mx-auto grid size-28 place-items-center overflow-hidden rounded-full border-2 border-gold/50 bg-sea-deep/60">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} className="size-full object-cover" />
            ) : (
              <UserRound className="size-10 text-gold/50" />
            )}
          </div>
          <p className="mt-4 truncate text-sm text-parchment">{profile.username}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-gold/70">
            Nível {profile.level} · {profile.xp}/{xpToNextLevel(profile.level)} XP
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-parchment/50">
            <Medal className="size-3 text-gold/70" /> {profile.vr} VR · {profile.rank_vr}º
          </p>

          <div className="mt-5 space-y-2">
            <button
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-gold/15 px-4 py-2.5 text-[10px] uppercase tracking-widest text-parchment/30"
            >
              <Layers className="mr-1.5 inline size-3" /> Ver coleção (em breve)
            </button>
            <button
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-gold/15 px-4 py-2.5 text-[10px] uppercase tracking-widest text-parchment/30"
            >
              <BookOpen className="mr-1.5 inline size-3" /> Ver baralhos (em breve)
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat icon={Medal} label="Valor de Recompensa" value={`${profile.vr} VR`} hint={`${profile.rank_vr}º no ranking`} />
          <Stat icon={Trophy} label="Vitórias" value={String(profile.wins)} hint={`${profile.rank_wins}º no ranking`} />
          <Stat icon={Swords} label="Derrotas" value={String(profile.losses)} hint={`${profile.wins + profile.losses} duelos`} />
          <Stat icon={Flame} label="Taxa de vitória" value={`${rate}%`} hint={`Sequência atual: ${profile.win_streak}`} />
          <Stat icon={Flame} label="Melhor sequência" value={String(profile.best_win_streak)} hint="Vitórias seguidas" />
          <Stat icon={Star} label="Nível" value={String(profile.level)} hint={`${profile.rank_level}º no ranking`} />
          <Stat
            icon={Layers}
            label="Coleção"
            value={String(profile.total_cards)}
            hint={`${profile.unique_cards} únicas · ${profile.rank_cards}º no ranking`}
          />
        </div>
      </div>

      <Link
        to="/tcggame/rank"
        className="mt-8 inline-flex items-center gap-2 rounded-xl border border-gold/30 px-5 py-2.5 text-[11px] uppercase tracking-widest text-gold hover:bg-gold/10"
      >
        <ArrowLeft className="size-3.5" /> Voltar ao ranking
      </Link>
    </div>
  );
}
