import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminLink } from "@/lib/admin/base";
import { useQuery } from "@tanstack/react-query";
import { listPlayers } from "@/lib/admin/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Search, Shield, User } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminPlayersList,
});

export function AdminPlayersList() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["admin-players"], queryFn: listPlayers });

  const filtered = (data ?? []).filter((p) => {
    const q2 = q.toLowerCase();
    return p.email.toLowerCase().includes(q2) || (p.username ?? "").toLowerCase().includes(q2);
  });

  return (
    <div>
      <p className="text-[11px] tracking-[0.3em] text-gold/70 uppercase mb-3">Administração</p>
      <h1 className="font-display text-3xl lg:text-4xl tracking-wide mb-6">Jogadores</h1>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-parchment/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por e-mail ou username..."
          className="w-full bg-sea-surface/60 border border-gold/15 pl-10 pr-3 py-2.5 text-sm rounded-sm focus:outline-none focus:border-gold"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 bg-sea-surface/40" />
          ))}
        </div>
      ) : (
        <div className="border border-gold/15 rounded-sm overflow-hidden">
          <div className="grid grid-cols-[minmax(120px,0.8fr)_minmax(160px,1.2fr)_auto_auto_auto] gap-4 px-4 py-3 bg-sea-surface/60 text-[10px] tracking-widest uppercase text-parchment/60">
            <span>Username</span>
            <span>E-mail</span>
            <span>Personagens</span>
            <span>Cadastro</span>
            <span>Papel</span>
          </div>
          {filtered.length === 0 && (
            <div className="p-6 text-sm text-parchment/50">Nenhum jogador encontrado.</div>
          )}
          {filtered.map((p) => (
            <AdminLink
              key={p.id}
              to="/players/$id"
              params={{ id: p.id }}
              className="grid grid-cols-[minmax(120px,0.8fr)_minmax(160px,1.2fr)_auto_auto_auto] gap-4 px-4 py-3 items-center border-t border-gold/10 hover:bg-gold/5 text-sm"
            >
              <span className="truncate flex items-center gap-2 min-w-0">
                <User className="size-3.5 text-parchment/40 shrink-0" />
                <span className="truncate text-parchment">
                  {p.username || "—"}
                </span>
              </span>
              <span className="truncate text-parchment/60 text-xs min-w-0">{p.email}</span>
              <span className="text-parchment/70">{p.character_count}</span>
              <span className="text-parchment/50 text-xs">
                {new Date(p.created_at).toLocaleDateString()}
              </span>
              <span>
                {p.is_admin ? (
                  <span className="inline-flex items-center gap-1 text-[10px] tracking-widest text-gold border border-gold/40 px-2 py-0.5 rounded-sm">
                    <Shield className="size-3" /> ADMIN
                  </span>
                ) : (
                  <span className="text-[10px] tracking-widest text-parchment/40">JOGADOR</span>
                )}
              </span>
            </AdminLink>
          ))}
        </div>
      )}
    </div>
  );
}
