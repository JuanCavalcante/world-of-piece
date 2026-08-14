import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminLink } from "@/lib/admin/base";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, ExternalLink, Trash2, Ghost } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { createNpc, deleteCharacter, listNpcs } from "@/lib/characters/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/npcs/")({
  component: AdminNpcsPage,
});

export function AdminNpcsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["admin-npcs"], queryFn: listNpcs });

  const createMut = useMutation({
    mutationFn: () => createNpc(user!.id),
    onSuccess: (npc) => {
      qc.invalidateQueries({ queryKey: ["admin-npcs"] });
      navigate({ to: "/admin/npcs/$id", params: { id: npc.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCharacter(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-npcs"] });
      toast.success("NPC excluído");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-[11px] tracking-[0.3em] text-gold/70 uppercase mb-2">Administração</p>
          <h1 className="font-display text-2xl lg:text-3xl tracking-wide">NPCs</h1>
        </div>
        <Button onClick={() => createMut.mutate()} disabled={createMut.isPending} className="gap-2">
          <Plus className="size-4" /> Novo NPC
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 bg-sea-surface/40" />)}</div>
      ) : (data ?? []).length === 0 ? (
        <div className="border border-gold/15 border-dashed rounded-sm p-12 text-center text-sm text-parchment/60">
          Nenhum NPC criado ainda.
        </div>
      ) : (
        <div className="border border-gold/15 rounded-sm overflow-hidden">
          {data!.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center px-4 py-3 border-t border-gold/10 first:border-t-0 text-sm"
            >
              <div className="size-10 border border-gold/20 bg-sea-deep/60 rounded-sm overflow-hidden flex items-center justify-center">
                {c.portrait_url ? (
                  <img src={c.portrait_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Ghost className="size-4 text-parchment/40" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate">{c.name || "Sem nome"}</p>
                <p className="text-[11px] text-parchment/50">
                  Nível {c.level} · {c.fighting_style || "—"} · {c.organization || "—"}
                </p>
              </div>
              <AdminLink
                to="/npcs/$id"
                params={{ id: c.id }}
                className="flex items-center gap-1.5 border border-gold/40 px-3 py-1.5 rounded-sm text-[11px] tracking-widest text-gold hover:bg-gold/10"
              >
                <ExternalLink className="size-3" /> ABRIR
              </AdminLink>
              <button
                onClick={() => {
                  if (confirm(`Excluir NPC "${c.name || "Sem nome"}"?`)) deleteMut.mutate(c.id);
                }}
                disabled={deleteMut.isPending}
                className="p-1.5 border border-red-500/40 text-red-400 rounded-sm hover:bg-red-500/10 disabled:opacity-40"
                title="Excluir"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
