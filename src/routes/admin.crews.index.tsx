import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminLink } from "@/lib/admin/base";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, ExternalLink, Trash2, Anchor } from "lucide-react";
import { createCrew, deleteCrew, listCrews } from "@/lib/crews/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/crews/")({
  component: AdminCrewsPage,
});

export function AdminCrewsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["admin-crews"], queryFn: listCrews });

  const createMut = useMutation({
    mutationFn: () => createCrew(),
    onSuccess: (crew) => {
      qc.invalidateQueries({ queryKey: ["admin-crews"] });
      navigate({ to: "/admin/crews/$id", params: { id: crew.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCrew(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-crews"] });
      toast.success("Tripulação excluída");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-[11px] tracking-[0.3em] text-gold/70 uppercase mb-2">Administração</p>
          <h1 className="font-display text-2xl lg:text-3xl tracking-wide">Tripulações</h1>
        </div>
        <Button onClick={() => createMut.mutate()} disabled={createMut.isPending} className="gap-2">
          <Plus className="size-4" /> Nova tripulação
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 bg-sea-surface/40" />)}
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="border border-gold/15 border-dashed rounded-sm p-12 text-center text-sm text-parchment/60">
          Nenhuma tripulação criada ainda.
        </div>
      ) : (
        <div className="border border-gold/15 rounded-sm overflow-hidden">
          {data!.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center px-4 py-3 border-t border-gold/10 first:border-t-0 text-sm"
            >
              <div className="w-16 aspect-video border border-gold/20 bg-sea-deep/60 rounded-sm overflow-hidden flex items-center justify-center">
                {c.flag_url ? (
                  <img src={c.flag_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Anchor className="size-4 text-parchment/40" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate">{c.name || "Sem nome"}</p>
                <p className="text-[11px] text-parchment/50">
                  {c.organization || "—"}
                </p>
              </div>
              <AdminLink
                to="/crews/$id"
                params={{ id: c.id }}
                className="flex items-center gap-1.5 border border-gold/40 px-3 py-1.5 rounded-sm text-[11px] tracking-widest text-gold hover:bg-gold/10"
              >
                <ExternalLink className="size-3" /> ABRIR
              </AdminLink>
              <button
                onClick={() => {
                  if (confirm(`Excluir tripulação "${c.name || "Sem nome"}"?`)) deleteMut.mutate(c.id);
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
