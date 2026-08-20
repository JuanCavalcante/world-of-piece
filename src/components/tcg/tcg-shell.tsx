import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { LayoutDashboard, Layers, BookOpen, Swords, Trophy, CalendarCheck, Menu, X, LogOut, ArrowLeft, Bell, Check, Trash2, ArrowLeftRight, Medal, Hammer, Gem, FlaskConical } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import wopLogo from "@/assets/wop-logo.png";
import { ThemeToggle } from "@/components/theme-toggle";
import { ensureTcgPlayer, listMyNotifications, markNotificationAsRead, markAllNotificationsAsRead, clearAllNotifications, xpToNextLevel } from "@/lib/tcg/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AudioMenu } from "@/components/tcg/audio-menu";
import { audioManager } from "@/lib/audio-manager";
import { useProgression } from "@/hooks/use-progression";
import { WalletDisplay } from "@/components/tcg/wallet-display";
import { useOnlineCount } from "@/hooks/use-online-count";

type TcgNavItem = {
  to: "/tcggame" | "/tcggame/cards" | "/tcggame/decks" | "/tcggame/duels" | "/tcggame/achievements" | "/tcggame/daily" | "/tcggame/trade" | "/tcggame/craft" | "/tcggame/rank";
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const NAV: TcgNavItem[] = [
  { to: "/tcggame", label: "Painel do Jogador", icon: LayoutDashboard, exact: true },
  { to: "/tcggame/cards", label: "Cartas", icon: Layers },
  { to: "/tcggame/decks", label: "Baralhos", icon: BookOpen },
  { to: "/tcggame/achievements", label: "Conquistas", icon: Trophy },
  { to: "/tcggame/daily", label: "Diárias", icon: CalendarCheck },
  { to: "/tcggame/craft", label: "Criação", icon: Hammer },
  { to: "/tcggame/trade", label: "Trocas", icon: ArrowLeftRight },
  { to: "/tcggame/rank", label: "Rank", icon: Medal },
  { to: "/tcggame/duels", label: "Duelos", icon: Swords },
];

export function TcgShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const wide = pathname.startsWith("/tcggame/duels");

  // Pré-carrega os áudios e destrava a reprodução na primeira interação do usuário.
  useEffect(() => {
    audioManager.preload();
    const unlock = () => audioManager.unlock();
    const opts = { once: true } as const;
    window.addEventListener("pointerdown", unlock, opts);
    window.addEventListener("keydown", unlock, opts);
    window.addEventListener("touchstart", unlock, opts);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);


  // Login diário: cria as missões do dia, atualiza a sequência e sincroniza conquistas.
  const { login } = useProgression();
  useEffect(() => {
    if (!user?.id) return;
    void login();
  }, [user?.id, login]);

  const { data: player } = useQuery({
    queryKey: ["tcg-player", user?.id],
    queryFn: ensureTcgPlayer,
    enabled: !!user?.id,
  });

  const email = user?.email ?? "";
  const displayName = player?.username || email.split("@")[0] || "Jogador";
  const initials = displayName.slice(0, 2).toUpperCase();
  const profileSlug = encodeURIComponent(displayName.toLowerCase().replace(/\s+/g, "-"));
  const level = player?.level ?? 1;
  const xp = player?.xp ?? 0;
  const xpNeeded = xpToNextLevel(level);
  const xpPct = Math.min(100, Math.round((xp / xpNeeded) * 100));

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen bg-sea-deep text-parchment flex">
      {/* Sidebar */}
      <aside
        className={`${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 flex flex-col
        border-r border-gold/15 bg-sea-surface/70 backdrop-blur-xl transition-transform duration-200
        lg:rounded-r-3xl overflow-hidden`}
      >
        <div className="p-5 flex items-center gap-3 border-b border-gold/10">
          <img src={wopLogo} alt="" className="size-10 object-contain" />
          <div className="min-w-0">
            <p className="font-display text-sm font-bold tracking-tight leading-none">WORLD OF PIECE</p>
            <p className="text-[10px] tracking-[0.25em] text-gold/70 uppercase mt-1">TCG</p>
          </div>
          <button
            className="lg:hidden ml-auto text-gold p-1"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm tracking-wide transition-all duration-200 ${
                  active
                    ? "text-parchment bg-gradient-to-r from-wop-red/30 via-wop-purple/20 to-transparent shadow-elegant"
                    : "text-parchment/70 hover:text-parchment hover:bg-gold/5"
                }`}
              >
                <Icon className={`size-4 ${active ? "text-gold" : ""}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <Link
            to="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="mt-4 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-parchment/60 hover:text-parchment hover:bg-gold/5 transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Voltar ao site</span>
          </Link>
        </nav>

        {/* Rodapé: avatar, nome e nível */}
        <div className="p-3 border-t border-gold/10">
          <div className="flex items-center gap-3 rounded-2xl bg-sea-deep/60 border border-gold/15 p-3 transition-colors hover:border-gold/40">
            <Link
              to="/tcggame/profile_{$name}"
              params={{ name: profileSlug }}
              onClick={() => setMobileOpen(false)}
              className="flex min-w-0 flex-1 items-center gap-3"
              title="Abrir perfil do jogador"
            >
              <div className="size-10 shrink-0 rounded-full overflow-hidden bg-gradient-primary grid place-items-center text-xs font-bold tracking-wider">
                {player?.avatar_url ? (
                  <img src={player.avatar_url} alt="" className="size-full object-cover" />
                ) : (
                  initials
                )}
              </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm truncate">{displayName}</p>
              <p className="text-[10px] tracking-[0.2em] uppercase text-gold/70">
                Nível {level} · {xp}/{xpNeeded} XP
              </p>
              <div className="mt-1.5 h-1 rounded-full bg-gold/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-primary transition-all duration-700"
                  style={{ width: `${Math.max(4, xpPct)}%` }}
                />
              </div>
            </div>
            </Link>
            <button
              onClick={handleSignOut}
              className="text-parchment/50 hover:text-gold transition-colors p-1"
              aria-label="Sair"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/60 z-30" onClick={() => setMobileOpen(false)} />
      )}

      {/* Conteúdo */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 flex items-center justify-between px-4 lg:px-8 border-b border-gold/10 bg-sea-deep/80 backdrop-blur sticky top-0 z-20">
          <button
            className="lg:hidden text-gold p-2 -ml-2"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden lg:block text-[11px] tracking-[0.3em] uppercase text-gold/70">
              World of Piece — TCG
            </span>
            <OnlineUsersBadge />
          </div>

          <div className="flex items-center gap-2">
            <WalletDisplay />
            <span className="hidden lg:block w-px h-6 bg-gold/15" />
            <NotificationsMenu />
            <AudioMenu />
            <ThemeToggle />
          </div>
        </header>

        <main className={wide ? "flex-1 min-w-0 px-3 py-4 lg:px-4 lg:py-5" : "flex-1 min-w-0 p-5 lg:p-10"}>
          <div className={wide ? "w-full" : "max-w-6xl mx-auto"}>
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
}

function OnlineUsersBadge() {
  const online = useOnlineCount();
  return (
    <span
      className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-emerald-300"
      title="Usuários conectados agora"
    >
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
      </span>
      Usuários online {online}
    </span>
  );
}

function NotificationsMenu() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: notifications } = useQuery({
    queryKey: ["tcg-notifications", user?.id],
    queryFn: () => listMyNotifications(user!.id),
    enabled: !!user?.id,
    refetchInterval: 30000, // Atualiza a cada 30s
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tcg-notifications", user?.id] });

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: invalidate,
  });

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsAsRead(user!.id),
    onSuccess: invalidate,
  });

  const clearAll = useMutation({
    mutationFn: () => clearAllNotifications(user!.id),
    onSuccess: invalidate,
  });

  const unreadCount = notifications?.filter(n => !n.read).length ?? 0;
  const total = notifications?.length ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 text-gold/70 hover:text-gold transition-colors rounded-lg hover:bg-gold/5">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 size-4 bg-wop-red text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-sea-deep animate-in zoom-in">
              {unreadCount > 9 ? "+9" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-sea-surface/95 backdrop-blur-xl border-gold/20 text-parchment shadow-2xl overflow-hidden" align="end">
        <div className="p-4 border-b border-gold/10 bg-sea-deep/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-display tracking-widest uppercase text-gold">Notificações</h3>
            <span className="text-[10px] text-parchment/40">{total} total</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => markAll.mutate()}
              disabled={unreadCount === 0 || markAll.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gold/20 bg-gold/5 px-2 py-1.5 text-[10px] uppercase tracking-widest text-gold transition-colors hover:bg-gold/15 disabled:opacity-40 disabled:hover:bg-gold/5"
            >
              <Check className="size-3" /> Marcar como lidas
            </button>
            <button
              onClick={() => clearAll.mutate()}
              disabled={total === 0 || clearAll.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-wop-red/30 bg-wop-red/10 px-2 py-1.5 text-[10px] uppercase tracking-widest text-wop-red transition-colors hover:bg-wop-red/20 disabled:opacity-40 disabled:hover:bg-wop-red/10"
            >
              <Trash2 className="size-3" /> Limpar
            </button>
          </div>
        </div>
        <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
          {notifications && notifications.length > 0 ? (
            notifications.map((n) => (
              <div 
                key={n.id} 
                className={cn(
                  "p-4 border-b border-gold/5 transition-colors group",
                  !n.read ? "bg-gold/5" : "hover:bg-gold/5"
                )}
              >
                <div className="flex justify-between gap-2 mb-1">
                  <p className={cn("text-xs font-bold", !n.read ? "text-gold" : "text-parchment/90")}>{n.title}</p>
                  {!n.read && (
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        markRead.mutate(n.id);
                      }}
                      className="transition-opacity text-gold hover:text-white"
                      title="Marcar como lida"
                    >
                      <Check className="size-3" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-parchment/60 leading-relaxed whitespace-pre-line">{n.message}</p>
                <p className="text-[9px] text-parchment/30 mt-2 uppercase tracking-tighter">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            ))
          ) : (
            <div className="p-10 text-center">
              <Bell className="size-8 text-gold/20 mx-auto mb-3" />
              <p className="text-xs text-parchment/30 uppercase tracking-widest">Nenhuma notificação</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TcgPageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8">
      <p className="text-[11px] tracking-[0.3em] text-gold/70 uppercase mb-3">{eyebrow}</p>
      <h1 className="font-display text-3xl lg:text-4xl tracking-wide mb-3">{title}</h1>
      <p className="text-parchment/60 max-w-2xl">{description}</p>
    </div>
  );
}

export function TcgPlaceholder({ label }: { label: string }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-gold/15 bg-sea-surface/40 p-6 min-h-40 flex items-center justify-center text-[11px] tracking-[0.2em] uppercase text-parchment/40"
        >
          {label}
        </div>
      ))}
    </div>
  );
}
