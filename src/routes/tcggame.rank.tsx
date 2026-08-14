import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Medal, Search, Trophy, Layers, Star, UserRound, Flame } from "lucide-react";
import { TcgPageHeader } from "@/components/tcg/tcg-shell";
import { cn } from "@/lib/utils";
import {
  getMyRanking,
  listRanking,
  searchPlayers,
  winRatePct,
  RANK_LABEL,
  type RankKind,
  type RankRow,
} from "@/lib/tcg/rank";

export const Route = createFileRoute("/tcggame/rank")({
  head: () => ({
    meta: [
      { title: "Ranking de Jogadores — WOP TCG" },
      { name: "description", content: "Veja os melhores duelistas do WOP TCG em vitórias, cartas, VR e nível." },
      { property: "og:title", content: "Ranking de Jogadores — WOP TCG" },
      { property: "og:description", content: "Veja os melhores duelistas do WOP TCG em vitórias, cartas, VR e nível." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RankPage,
});

const TABS: { key: RankKind; icon: typeof Trophy }[] = [
  { key: "WINS", icon: Trophy },
  { key: "CARDS", icon: Layers },
  { key: "VR", icon: Medal },
  { key: "LEVEL", icon: Star },
];

const PODIUM = ["text-gold border-gold/60", "text-slate-200 border-slate-300/50", "text-amber-600 border-amber-600/50"];

function slug(name: string) {
  return encodeURIComponent(name);
}

function Avatar({ url, name, className }: { url: string | null; name: string; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-gold/25 bg-sea-deep/70 text-[10px] font-bold",
        className,
      )}
    >
      {url ? <img src={url} alt="" className="size-full object-cover" /> : name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function PlayerSearch() {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(t);
  }, [term]);

  const { data: suggestions } = useQuery({
    queryKey: ["tcg-player-search", debounced],
    queryFn: () => searchPlayers(debounced, 5),
    enabled: debounced.trim().length > 0,
  });

  const open = debounced.trim().length > 0 && (suggestions?.length ?? 0) > 0;

  const go = (nickname: string) => {
    setTerm("");
    setDebounced("");
    navigate({ to: "/tcggame/profile/$nickname", params: { nickname: slug(nickname) } });
  };

  return (
    <div className="relative mb-6 max-w-md">
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gold/50" />
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && suggestions?.length) go(suggestions[0].username);
        }}
        placeholder="Buscar jogador..."
        className="w-full rounded-xl border border-gold/20 bg-sea-deep/60 py-2.5 pl-11 pr-4 text-sm text-parchment outline-none focus:border-gold/60"
      />
      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-gold/25 bg-sea-surface/95 backdrop-blur-xl shadow-2xl">
          {suggestions!.map((s) => (
            <button
              key={s.user_id}
              onClick={() => go(s.username)}
              className="flex w-full items-center gap-3 border-b border-gold/5 px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-gold/10"
            >
              <Avatar url={s.avatar_url} name={s.username} />
              <span className="min-w-0 flex-1 truncate text-sm text-parchment">{s.username}</span>
              <span className="text-[10px] uppercase tracking-widest text-gold/70">Nv. {s.level}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function metricsFor(kind: RankKind, r: { wins: number; losses: number; total_cards: number; unique_cards: number; vr: number; win_streak: number; best_win_streak: number; level: number; xp: number }) {
  switch (kind) {
    case "WINS":
      return [
        { label: "Vitórias", value: String(r.wins) },
        { label: "Taxa", value: `${winRatePct(r.wins, r.losses)}%` },
      ];
    case "CARDS":
      return [
        { label: "Cartas", value: String(r.total_cards) },
        { label: "Únicas", value: String(r.unique_cards) },
      ];
    case "VR":
      return [
        { label: "VR", value: String(r.vr) },
        { label: "Sequência", value: `${r.win_streak} / ${r.best_win_streak}` },
      ];
    default:
      return [
        { label: "Nível", value: String(r.level) },
        { label: "XP", value: String(r.xp) },
      ];
  }
}

function RankRowCard({ kind, row, me }: { kind: RankKind; row: RankRow; me?: boolean }) {
  const podium = kind === "VR" && row.rank <= 3 ? PODIUM[row.rank - 1] : null;
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-2xl border bg-sea-surface/40 px-4 py-3 transition-colors",
        me ? "border-gold/60 bg-gold/5" : podium ? podium.split(" ")[1] : "border-gold/15",
      )}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl border border-gold/20 bg-sea-deep/60 font-display text-sm",
          podium ? podium.split(" ")[0] : "text-parchment/70",
        )}
      >
        {row.rank}
      </span>
      {row.username && !me ? (
        <Link
          to="/tcggame/profile/$nickname"
          params={{ nickname: slug(row.username) }}
          className="flex min-w-0 flex-1 items-center gap-3 hover:text-gold transition-colors"
        >
          <Avatar url={row.avatar_url} name={row.username} />
          <span className="min-w-0 truncate text-sm">{row.username}</span>
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar url={row.avatar_url} name={row.username || "Jogador"} />
          <span className="min-w-0 truncate text-sm">{row.username || "Você"}</span>
        </div>
      )}
      <div className="flex shrink-0 items-center gap-5">
        {metricsFor(kind, row).map((m) => (
          <div key={m.label} className="text-right">
            <p className="font-display text-base text-parchment tabular-nums">{m.value}</p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-parchment/40">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankTab({ kind }: { kind: RankKind }) {
  const { data: top, isLoading } = useQuery({
    queryKey: ["tcg-ranking", kind],
    queryFn: () => listRanking(kind, 10),
  });
  const { data: mine } = useQuery({
    queryKey: ["tcg-my-ranking", kind],
    queryFn: () => getMyRanking(kind),
  });

  if (isLoading) {
    return <p className="py-10 text-center text-xs uppercase tracking-widest text-parchment/40">Carregando ranking...</p>;
  }

  if (!top?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gold/25 p-10 text-center text-sm text-parchment/50">
        Nenhum jogador no ranking ainda.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {top.map((r) => (
        <RankRowCard key={`${kind}-${r.user_id}`} kind={kind} row={r} />
      ))}

      {mine && (
        <div className="pt-5">
          <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-gold/70">Sua posição</p>
          <RankRowCard kind={kind} row={mine} me />
          <p className="mt-2 text-[10px] uppercase tracking-widest text-parchment/40">
            {mine.rank}º de {mine.total} jogadores
          </p>
        </div>
      )}
    </div>
  );
}

function RankPage() {
  const [tab, setTab] = useState<RankKind>("WINS");
  const tabs = useMemo(() => TABS, []);

  return (
    <div>
      <TcgPageHeader
        eyebrow="Rank"
        title="Ranking de Jogadores"
        description="Os melhores duelistas do World of Piece TCG em vitórias, coleção, Valor de Recompensa e nível."
      />

      <PlayerSearch />

      <div className="mb-6 inline-flex flex-wrap gap-1 rounded-2xl border border-gold/20 bg-sea-surface/40 p-1">
        {tabs.map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[11px] uppercase tracking-widest transition-all",
              tab === key ? "bg-gradient-primary text-black font-bold" : "text-parchment/60 hover:text-parchment",
            )}
          >
            <Icon className="size-3.5" /> {RANK_LABEL[key]}
          </button>
        ))}
      </div>

      <RankTab key={tab} kind={tab} />

      <p className="mt-8 inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-parchment/30">
        <Flame className="size-3 text-gold/50" /> VR é pontuação competitiva — não pode ser usado como moeda.
      </p>
    </div>
  );
}
