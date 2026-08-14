import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-role";
import { useMyDisabledFeatures, type FeatureKey } from "@/lib/features";
import wopLogo from "@/assets/wop-logo.png";
import { User, Backpack, Users, PawPrint, Ship, Menu, X, LogOut, Shield, Swords } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = { to: string; label: string; icon: typeof User; exact?: boolean; feature?: FeatureKey };
const NAV: NavItem[] = [
  { to: "/dashboard", label: "Painel", icon: Menu, exact: true },
  { to: "/personagens", label: "Personagens", icon: User, feature: "personagens" },
  { to: "/estoque", label: "Estoque Pessoal", icon: Backpack, feature: "estoque" },
  { to: "/tripulacao", label: "Tripulação", icon: Users, feature: "tripulacao" },
  { to: "/pets", label: "Pets", icon: PawPrint, feature: "pets" },
  { to: "/navio", label: "Navio", icon: Ship, feature: "navio" },
];

export function DashboardShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: disabled } = useMyDisabledFeatures();
  const { data: isAdmin } = useIsAdmin();

  const disabledSet = new Set<FeatureKey>(disabled ?? []);

  // Bloqueia rota se o módulo estiver desativado para o jogador
  useEffect(() => {
    if (!disabled) return;
    const blocked = NAV.find(
      (n) => n.feature && disabledSet.has(n.feature) && pathname.startsWith(n.to),
    );
    if (blocked) navigate({ to: "/dashboard", replace: true });
  }, [pathname, disabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleNav = NAV.filter((n) => !n.feature || !disabledSet.has(n.feature));

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen bg-sea-deep text-parchment flex flex-col">
      <header className="h-16 shrink-0 border-b border-gold/20 bg-sea-deep/95 backdrop-blur flex items-center justify-between px-4 lg:px-8 relative z-30">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden text-gold p-2 -ml-2"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src={wopLogo} alt="" className="size-9 object-contain" />
            <span className="font-display font-bold text-sm lg:text-base tracking-tight">
              WORLD OF PIECE
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/tcggame"
            className="hidden md:flex items-center gap-2 border border-gold/40 px-3 py-1.5 rounded-sm text-[11px] tracking-widest text-gold hover:bg-gold/10 transition-colors"
          >
            <Swords className="size-3.5" />
            WOP TCG
          </Link>
          <Link
            to="/tcggame"
            className="md:hidden text-gold p-2 -mr-1 hover:bg-gold/10 rounded-sm"
            aria-label="WOP TCG"
          >
            <Swords className="size-5" />
          </Link>
          <ThemeToggle />
          <NotificationBell />
          <span className="hidden md:inline text-xs text-parchment/60 tracking-wider">
            {user?.email}
          </span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 border border-gold/40 px-3 py-1.5 rounded-sm text-[11px] tracking-widest text-gold hover:bg-gold/10 transition-colors"
          >
            <LogOut className="size-3.5" />
            SAIR
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <aside
          className={`${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:static top-16 bottom-0 left-0 z-20 w-64 shrink-0 border-r border-gold/15 bg-sea-surface/60 backdrop-blur transition-transform duration-200`}
        >
          <nav className="p-4 space-y-1">
            {visibleNav.map((item) => {
              const active = item.exact
                ? pathname === item.to
                : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to as "/dashboard"}
                  onClick={() => setMobileOpen(false)}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm tracking-wide transition-all duration-200 relative overflow-hidden ${
                    active
                      ? "text-parchment bg-gradient-to-r from-wop-red/20 via-wop-purple/15 to-transparent border-l-2 border-wop-red shadow-elegant"
                      : "text-parchment/70 hover:text-parchment hover:bg-gold/5 border-l-2 border-transparent hover:translate-x-0.5"
                  }`}
                >
                  <Icon className={`size-4 ${active ? "text-gold" : ""}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className={`mt-4 flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm tracking-wide transition-colors border-l-2 ${
                  pathname.startsWith("/admin")
                    ? "bg-gold/10 text-gold border-gold"
                    : "text-parchment/70 hover:text-parchment hover:bg-gold/5 border-transparent"
                }`}
              >
                <Shield className="size-4" />
                <span>Admin</span>
              </Link>
            )}
          </nav>
        </aside>

        {mobileOpen && (
          <div
            className="lg:hidden fixed inset-0 top-16 bg-black/50 z-10"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <p className="text-[11px] tracking-[0.3em] text-gold/70 uppercase mb-3">
        {title}
      </p>
      <h1 className="font-display text-3xl lg:text-4xl tracking-wide mb-4">
        Em desenvolvimento
      </h1>
      <p className="text-parchment/60 max-w-xl">
        Esta funcionalidade estará disponível em breve.
      </p>
    </div>
  );
}
