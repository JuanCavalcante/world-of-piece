import { useDevPanel } from "@/lib/admin/base";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminLink } from "@/lib/admin/base";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Settings2, Gift, ArrowUp, ArrowDown, Package, RotateCcw, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  adminAdjustLevel,
  adminGivePack,
  adminListTcgPlayers,
  adminResetDaily,
  adminResetTcgAccount,
  type TcgPlayerRow,
} from "@/lib/tcg/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/woptcg/jogadores")({
  component: TcgPlayersAdmin,
});

export function TcgPlayersAdmin() {
  const qc = useQueryClient();
  const isDev = useDevPanel();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<TcgPlayerRow | null>(null);
  const [resetTarget, setResetTarget] = useState<TcgPlayerRow | null>(null);
  const [resetText, setResetText] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["admin-tcg-players"], queryFn: adminListTcgPlayers });

  const run = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tcg-players"] });
      toast.success("Ação aplicada.");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao aplicar ação."),
  });

  const filtered = (data ?? []).filter((p) => {
    const s = q.toLowerCase();
    return p.email.toLowerCase().includes(s) || (p.username ?? "").toLowerCase().includes(s);
  });

  const actionBtn =
    "flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-gold/20 bg-sea-surface/50 text-sm hover:border-gold/50 hover:bg-gold/5 transition-colors disabled:opacity-50";

  return (
    <div>
      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-parchment/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por e-mail ou username..."
          className="w-full bg-sea-surface/60 border border-gold/15 pl-10 pr-3 py-2.5 text-sm rounded-xl focus:outline-none focus:border-gold"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 bg-sea-surface/40" />
          ))}
        </div>
      ) : (
        <div className="border border-gold/15 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_1.4fr_auto_auto_auto_auto] gap-4 px-4 py-3 bg-sea-surface/60 text-[10px] tracking-widest uppercase text-parchment/60">
            <span>Username</span>
            <span>E-mail</span>
            <span>Nível</span>
            <span>Cartas</span>
            <span />
            <span />
          </div>
          {filtered.length === 0 && (
            <div className="p-6 text-sm text-parchment/50">
              Nenhum jogador entrou no WOP TCG ainda.
            </div>
          )}
          {filtered.map((p) => (
            <div
              key={p.user_id}
              className="grid grid-cols-[1fr_1.4fr_auto_auto_auto_auto] gap-4 px-4 py-3 items-center border-t border-gold/10 text-sm"
            >
              <span className="truncate">{p.username || "—"}</span>
              <span className="truncate text-parchment/70">{p.email}</span>
              <span className="text-gold">{p.level}</span>
              <span className="text-parchment/70">{p.cards_count}</span>
              {isDev ? (
              <button
                onClick={() => setSel(p)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gold/25 text-[11px] tracking-widest uppercase hover:bg-gold/10"
              >
                <Settings2 className="size-3.5" /> Configuração
              </button>
              ) : (
                <span />
              )}
              <AdminLink
                to="/woptcg/jogador/$userId"
                params={{ userId: p.user_id }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gold/25 text-[11px] tracking-widest uppercase hover:bg-gold/10"
              >
                <Eye className="size-3.5" /> Ver perfil
              </AdminLink>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="bg-sea-deep border-gold/25 text-parchment">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide">
              Configuração — {sel?.username || sel?.email}
            </DialogTitle>
          </DialogHeader>
          {sel && (
            <div className="space-y-3">
              <p className="text-xs text-parchment/60">
                Nível {sel.level} · {sel.cards_count} cartas ·{" "}
                {sel.last_daily_reward_at ? "Recompensa já coletada" : "Recompensa disponível"}
              </p>
              <button
                className={actionBtn}
                disabled={run.isPending}
                onClick={() => run.mutate(() => adminResetDaily(sel.user_id))}
              >
                <Gift className="size-4 text-gold" /> Resetar recompensa diária
              </button>
              <button
                className={actionBtn}
                disabled={run.isPending}
                onClick={() => run.mutate(() => adminGivePack(sel.user_id, 5))}
              >
                <Package className="size-4 text-gold" /> Dar pacote de cartas (5)
              </button>
              <button
                className={actionBtn}
                disabled={run.isPending}
                onClick={() => run.mutate(() => adminAdjustLevel(sel.user_id, 1))}
              >
                <ArrowUp className="size-4 text-gold" /> Subir nível de conta
              </button>
              <button
                className={actionBtn}
                disabled={run.isPending}
                onClick={() => run.mutate(() => adminAdjustLevel(sel.user_id, -1))}
              >
                <ArrowDown className="size-4 text-wop-red" /> Reduzir nível de conta
              </button>
              <button
                className={actionBtn}
                disabled={run.isPending}
                onClick={() => {
                  setResetTarget(sel);
                  setResetText("");
                  setSel(null);
                }}
              >
                <RotateCcw className="size-4 text-wop-red" /> Resetar conta do TCG
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!resetTarget}
        onOpenChange={(o) => {
          if (!o) {
            setResetTarget(null);
            setResetText("");
          }
        }}
      >
        <DialogContent className="bg-sea-deep border-wop-red/40 text-parchment">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide">Resetar conta do TCG</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-parchment/70">
            Isso apaga nível, XP, cartas, baralhos, conquistas e progresso de{" "}
            <span className="text-parchment">{resetTarget?.username || resetTarget?.email}</span>. Digite{" "}
            <span className="text-wop-red font-semibold">Resetar</span> para confirmar.
          </p>
          <input
            autoFocus
            value={resetText}
            onChange={(e) => setResetText(e.target.value)}
            placeholder="Resetar"
            className="w-full bg-sea-surface/60 border border-wop-red/30 px-3 py-2.5 text-sm rounded-xl focus:outline-none focus:border-wop-red"
          />
          <button
            disabled={resetText !== "Resetar" || run.isPending}
            onClick={() => {
              const id = resetTarget!.user_id;
              run.mutate(() => adminResetTcgAccount(id));
              setResetTarget(null);
              setResetText("");
            }}
            className="w-full px-3 py-2.5 rounded-xl border border-wop-red/50 text-wop-red text-[11px] tracking-widest uppercase hover:bg-wop-red/10 disabled:opacity-40"
          >
            Resetar conta
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
