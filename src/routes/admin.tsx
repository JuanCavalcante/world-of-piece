import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Users, Package, Inbox, Ghost, Anchor, Layers, ShieldAlert } from "lucide-react";
import { AdminBaseProvider, AdminLink, type AdminBase } from "@/lib/admin/base";

export async function requireAdmin() {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) throw redirect({ to: "/entrar" });
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: sess.session.user.id,
    _role: "admin",
  });
  if (error || !data) throw redirect({ to: "/dashboard" });
}

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: requireAdmin,
  component: () => <AdminLayout base="/admin" />,
});

const NAV = [
  { to: "", label: "JOGADORES", icon: Users, match: ["", "/players"] },
  { to: "/crews", label: "TRIPULAÇÕES", icon: Anchor, match: ["/crews"] },
  { to: "/npcs", label: "NPCS", icon: Ghost, match: ["/npcs"] },
  { to: "/items", label: "ITENS", icon: Package, match: ["/items"] },
  { to: "/requests", label: "SOLICITAÇÕES", icon: Inbox, match: ["/requests"] },
  { to: "/woptcg", label: "WOP TCG", icon: Layers, match: ["/woptcg"] },
] as const;

export function AdminLayout({ base }: { base: AdminBase }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDev = base === "/admindev";

  return (
    <AdminBaseProvider value={base}>
      <div className="min-h-screen bg-sea-deep text-parchment">
        {isDev && (
          <div className="bg-wop-red/15 border-b border-wop-red/40 text-wop-red text-[10px] tracking-[0.3em] uppercase px-4 lg:px-8 py-1.5 flex items-center gap-2">
            <ShieldAlert className="size-3.5" /> Sessão de desenvolvedor · /admindev
          </div>
        )}
        <header
          className={`h-16 border-b bg-sea-deep/95 backdrop-blur flex items-center justify-between px-4 lg:px-8 ${
            isDev ? "border-wop-red/40" : "border-gold/20"
          }`}
        >
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-xs tracking-widest text-gold hover:text-parchment"
            >
              <ArrowLeft className="size-4" /> VOLTAR
            </Link>
            <span className="font-display font-bold text-sm lg:text-base tracking-tight">
              WORLD OF PIECE · {isDev ? "ADMIN DEV" : "ADMIN"}
            </span>
          </div>
          <nav className="flex items-center gap-6 text-[11px] tracking-widest">
            {NAV.map((i) => {
              const rest = pathname.slice(base.length);
              const active = i.match.some((m) => (m === "" ? rest === "" || rest === "/" : rest.startsWith(m)));
              const Icon = i.icon;
              return (
                <AdminLink
                  key={i.label}
                  to={i.to}
                  className={`flex items-center gap-2 ${
                    active ? (isDev ? "text-wop-red" : "text-gold") : "text-parchment/60 hover:text-parchment"
                  }`}
                >
                  <Icon className="size-3.5" /> {i.label}
                </AdminLink>
              );
            })}
          </nav>
        </header>
        <main className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
          <Outlet />
        </main>
      </div>
    </AdminBaseProvider>
  );
}
