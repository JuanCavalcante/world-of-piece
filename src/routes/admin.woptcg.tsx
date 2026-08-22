import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Users, Layers, Image as ImageIcon, ShoppingBag } from "lucide-react";
import { AdminLink, useAdminBase, useDevPanel } from "@/lib/admin/base";

export const Route = createFileRoute("/admin/woptcg")({
  component: WopTcgAdminLayout,
});

const ITEMS = [
  { to: "/woptcg/jogadores", label: "Jogadores", icon: Users },
  { to: "/woptcg/cartas", label: "Cartas", icon: Layers },
] as const;


export function WopTcgAdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const base = useAdminBase();
  const isDev = useDevPanel();
  const items = isDev
    ? [
        ...ITEMS,
        { to: "/woptcg/bannerduelo", label: "Banners", icon: ImageIcon } as const,
        { to: "/woptcg/loja", label: "Loja", icon: ShoppingBag } as const,
      ]
    : ITEMS;
  return (
    <div>
      <p className="text-[11px] tracking-[0.3em] text-gold/70 uppercase mb-3">Administração</p>
      <h1 className="font-display text-3xl lg:text-4xl tracking-wide mb-6">WOP TCG</h1>

      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <nav className="space-y-1">
          {items.map((i) => {
            const active = pathname.startsWith(`${base}${i.to}`);
            const Icon = i.icon;
            return (
              <AdminLink
                key={i.to}
                to={i.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  active
                    ? "text-parchment bg-gold/10 border border-gold/30"
                    : "text-parchment/60 hover:text-parchment hover:bg-gold/5 border border-transparent"
                }`}
              >
                <Icon className={`size-4 ${active ? "text-gold" : ""}`} />
                {i.label}
              </AdminLink>
            );
          })}
        </nav>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
