import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMyNotifications, useMarkAllRead } from "@/lib/notifications/api";

export function NotificationBell() {
  const { data } = useMyNotifications();
  const markAllRead = useMarkAllRead();
  const unread = (data ?? []).filter((n) => !n.read).length;

  return (
    <Popover onOpenChange={(o) => { if (o && unread > 0) markAllRead(); }}>
      <PopoverTrigger asChild>
        <button className="relative p-2 text-parchment/70 hover:text-gold transition-colors" aria-label="Notificações">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-gold text-sea-deep text-[9px] font-semibold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 max-h-96 overflow-auto">
        <div className="px-3 py-2 border-b border-gold/15 text-[10px] tracking-widest uppercase text-parchment/60">
          Notificações
        </div>
        {(data ?? []).length === 0 ? (
          <div className="p-6 text-center text-xs text-parchment/50">Nenhuma notificação.</div>
        ) : (
          <ul className="divide-y divide-gold/10">
            {data!.map((n) => (
              <li key={n.id} className="px-3 py-2.5">
                <p className="text-sm text-parchment font-medium flex items-center gap-2">
                  {!n.read && <span className="size-1.5 rounded-full bg-gold" />}
                  {n.title}
                </p>
                <p className="text-xs text-parchment/70 whitespace-pre-wrap mt-0.5 leading-snug">{n.message}</p>
                <p className="text-[10px] text-parchment/40 mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
