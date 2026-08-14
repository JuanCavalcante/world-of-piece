import { createFileRoute } from "@tanstack/react-router";
import { TcgPageHeader } from "@/components/tcg/tcg-shell";

export const Route = createFileRoute("/tcggame/ranking")({
  component: RankingPage,
});

function RankingPage() {
  return (
    <div>
      <TcgPageHeader
        eyebrow="Rank"
        title="Ranking de Jogadores"
        description="Acompanhe os melhores duelistas do World of Piece TCG."
      />
      <div className="rounded-2xl border border-gold/15 bg-sea-surface/40 p-12 text-center">
        <p className="text-[11px] tracking-[0.3em] text-gold/70 uppercase mb-3">
          Em Desenvolvimento
        </p>
        <p className="text-parchment/60 max-w-xl mx-auto">
          O ranking de jogadores estará disponível em breve.
        </p>
      </div>
    </div>
  );
}
