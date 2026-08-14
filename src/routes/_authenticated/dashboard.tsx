import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { User, Backpack, Users, PawPrint, Ship } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { listCharacters } from "@/lib/characters/api";
import { listMyInventory } from "@/lib/inventory/api";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardHome,
});

function DashboardHome() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: characters } = useQuery({
    queryKey: ["characters", userId],
    queryFn: () => listCharacters(userId!),
    enabled: !!userId,
  });

  const { data: inventory } = useQuery({
    queryKey: ["inventory", userId],
    queryFn: () => listMyInventory(userId!),
    enabled: !!userId,
  });

  const active = characters?.find((c) => c.is_active) ?? null;
  const itemCount = (inventory ?? []).reduce((sum, r) => sum + (r.quantity ?? 0), 0);
  const stackCount = (inventory ?? []).length;

  type CardDef = {
    icon: typeof User;
    title: string;
    value: string;
    hint: string;
    to: string;
    params?: Record<string, string>;
  };

  const cards: CardDef[] = [
    {
      icon: User,
      title: "Personagem Ativo",
      value: active?.name || (active ? "Sem nome" : "Nenhum personagem ativo"),
      hint: active
        ? `Nível ${active.level} · ${active.fighting_style || "Sem estilo"} · ${active.profession_1 || "Sem profissão"}`
        : "Nome · Est. de Luta · Nível · Profissão",
      to: active ? "/personagens/$id" : "/personagens",
      params: active ? { id: active.id } : undefined,
    },
    {
      icon: Backpack,
      title: "Estoque",
      value: inventory ? `${itemCount} ${itemCount === 1 ? "item" : "itens"}` : "…",
      hint: inventory ? `${stackCount} entrada(s) no inventário` : "Itens em seu inventário",
      to: "/estoque",
    },
    {
      icon: PawPrint,
      title: "Pets",
      value: "0",
      hint: "Companheiros registrados",
      to: "/pets",
    },
    {
      icon: Ship,
      title: "Navio",
      value: "Nenhum navio registrado",
      hint: "Sua embarcação",
      to: "/navio",
    },
    {
      icon: Users,
      title: "Tripulação",
      value: active?.crew || "0 membros",
      hint: "Aliados sob a mesma bandeira",
      to: "/tripulacao",
    },
  ];

  return (
    <div>
      <p className="text-[11px] tracking-[0.3em] text-gold/70 uppercase mb-3">
        Painel do Jogador
      </p>
      <h1 className="font-display text-3xl lg:text-4xl tracking-wide mb-4">
        Bem-vindo ao World Of Piece
      </h1>
      <p className="text-parchment/60 max-w-2xl mb-12">
        Este é o seu centro de gerenciamento. Aqui você poderá administrar seus
        personagens, acompanhar seus itens, visualizar seu navio, seus pets, sua
        tripulação e todas as informações relacionadas à sua jornada.
      </p>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.title}
              to={c.to as "/dashboard"}
              params={c.params as never}
              className="relative border border-gold/20 bg-sea-surface/40 p-6 rounded-sm hover:border-gold/40 transition-colors block"
            >
              <div className="absolute -top-2 -right-2 size-8 border-t-2 border-r-2 border-gold/40" />
              <div className="flex items-center gap-3 mb-4">
                <Icon className="size-4 text-gold" />
                <h2 className="font-display text-sm tracking-widest uppercase text-parchment/80">
                  {c.title}
                </h2>
              </div>
              <p className="text-lg text-parchment mb-1">{c.value}</p>
              <p className="text-[11px] tracking-wider uppercase text-parchment/40">
                {c.hint}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
