import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Anchor } from "lucide-react";
import { getMyCrew, listCrewMembersDetailed, type CrewRole } from "@/lib/crews/api";
import { ComingSoon } from "@/components/dashboard-shell";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/tripulacao")({
  component: TripulacaoPage,
});

const ROLE_LABELS: Record<CrewRole, string> = {
  capitao: "Capitão",
  imediato: "Imediato",
  tripulante: "Tripulante",
};

function TripulacaoPage() {
  const crewQ = useQuery({ queryKey: ["my-crew"], queryFn: getMyCrew });
  const crew = crewQ.data;
  const membersQ = useQuery({
    queryKey: ["my-crew-members", crew?.id],
    queryFn: () => listCrewMembersDetailed(crew!.id),
    enabled: !!crew?.id,
  });

  if (crewQ.isLoading) {
    return <Skeleton className="h-64 bg-sea-surface/40" />;
  }

  if (!crew) {
    return <ComingSoon title="Tripulação" />;
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr] items-start">
        <div className="w-full aspect-video border border-gold/25 rounded-sm bg-sea-deep/60 overflow-hidden">
          {crew.flag_url ? (
            <img src={crew.flag_url} alt="Bandeira" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-parchment/40">
              <Anchor className="size-8 mb-2" />
              <span className="text-[10px] tracking-widest">SEM BANDEIRA</span>
            </div>
          )}
        </div>
        <div>
          <p className="text-[11px] tracking-[0.3em] text-gold/70 uppercase mb-2">Tripulação</p>
          <h1 className="font-display text-3xl lg:text-4xl tracking-wide mb-2">
            {crew.name || "Sem nome"}
          </h1>
          <p className="text-parchment/60 text-sm">{crew.organization || "—"}</p>
        </div>
      </div>

      <div>
        <h2 className="font-display text-sm tracking-[0.3em] uppercase text-gold mb-3">Membros</h2>
        {membersQ.isLoading ? (
          <Skeleton className="h-24 bg-sea-surface/40" />
        ) : (
          <div className="border border-gold/15 rounded-sm overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-3 px-4 py-2 bg-sea-surface/60 text-[10px] tracking-widest uppercase text-parchment/60">
              <span>Usuário</span>
              <span>Personagem ativo</span>
              <span>Nível</span>
              <span>Cargo</span>
            </div>
            {(membersQ.data ?? []).map((m) => (
              <div
                key={m.user_id}
                className="grid grid-cols-[1fr_1fr_auto_auto] gap-3 items-center px-4 py-2.5 border-t border-gold/10 text-sm"
              >
                <span className="truncate">{m.username || "—"}</span>
                <span className="truncate text-parchment/70">{m.character_name || "—"}</span>
                <span className="text-parchment/60 text-xs">Nv {m.level}</span>
                <span className="text-[10px] tracking-widest text-gold border border-gold/40 px-2 py-0.5 rounded-sm">
                  {ROLE_LABELS[m.role].toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
