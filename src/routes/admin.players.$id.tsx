import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AdminLink } from "@/lib/admin/base";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Shield, Trash2, ExternalLink, Gift } from "lucide-react";
import { useState } from "react";
import { useDevPanel } from "@/lib/admin/base";
import { getPlayer, listPlayerDisabledFeatures, logAdminAction, setAdminRole } from "@/lib/admin/api";
import { listCharacters, deleteCharacter } from "@/lib/characters/api";
import { FEATURES, FEATURE_LABELS, setFeatureEnabled, type FeatureKey } from "@/lib/features";
import { listCatalog } from "@/lib/inventory/api";
import { grantItemToPlayer } from "@/lib/inventory/admin";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/players/$id")({
  component: AdminPlayerDetail,
});

export function AdminPlayerDetail() {
  const { id } = useParams({ strict: false }) as { id: string };
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const isDev = useDevPanel();

  const player = useQuery({ queryKey: ["admin-player", id], queryFn: () => getPlayer(id) });
  const chars = useQuery({ queryKey: ["admin-player-chars", id], queryFn: () => listCharacters(id) });
  const flags = useQuery({
    queryKey: ["admin-player-flags", id],
    queryFn: () => listPlayerDisabledFeatures(id),
  });

  const roleMut = useMutation({
    mutationFn: (isAdmin: boolean) => setAdminRole(id, isAdmin),
    onSuccess: async (_d, isAdmin) => {
      await logAdminAction(me!.id, id, isAdmin ? "grant_admin" : "revoke_admin");
      qc.invalidateQueries({ queryKey: ["admin-player", id] });
      qc.invalidateQueries({ queryKey: ["admin-players"] });
      toast.success(isAdmin ? "Admin concedido" : "Admin removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const flagMut = useMutation({
    mutationFn: ({ feature, enabled }: { feature: FeatureKey; enabled: boolean }) =>
      setFeatureEnabled(id, feature, enabled),
    onSuccess: async (_d, vars) => {
      await logAdminAction(me!.id, id, "set_feature", vars);
      qc.invalidateQueries({ queryKey: ["admin-player-flags", id] });
      toast.success("Permissões atualizadas");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCharMut = useMutation({
    mutationFn: (cid: string) => deleteCharacter(cid),
    onSuccess: async (_d, cid) => {
      await logAdminAction(me!.id, id, "delete_character", { character_id: cid });
      qc.invalidateQueries({ queryKey: ["admin-player-chars", id] });
      toast.success("Personagem excluído");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const catalog = useQuery({ queryKey: ["admin-catalog"], queryFn: listCatalog });
  const [giveItemId, setGiveItemId] = useState<string>("");
  const [giveQty, setGiveQty] = useState<number>(1);

  const giveMut = useMutation({
    mutationFn: () => grantItemToPlayer(id, giveItemId, giveQty),
    onSuccess: async () => {
      await logAdminAction(me!.id, id, "grant_item", { item_id: giveItemId, quantity: giveQty });
      setGiveItemId("");
      setGiveQty(1);
      toast.success("Item adicionado ao estoque do jogador");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (player.isLoading) {
    return <Skeleton className="h-40 bg-sea-surface/40" />;
  }
  if (!player.data) {
    return (
      <div>
        <AdminLink to="" className="text-xs tracking-widest text-gold flex items-center gap-2 mb-6">
          <ArrowLeft className="size-4" /> VOLTAR
        </AdminLink>
        <p className="text-parchment/60">Jogador não encontrado.</p>
      </div>
    );
  }

  const p = player.data;
  const disabledSet = new Set(flags.data ?? []);

  return (
    <div className="space-y-10">
      <div>
        <AdminLink to="" className="text-xs tracking-widest text-gold flex items-center gap-2 mb-4 hover:text-parchment">
          <ArrowLeft className="size-4" /> JOGADORES
        </AdminLink>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] tracking-[0.3em] text-gold/70 uppercase mb-2">Jogador</p>
            <h1 className="font-display text-2xl lg:text-3xl tracking-wide">{p.email}</h1>
            <p className="text-xs text-parchment/50 mt-1">
              Cadastrado em {new Date(p.created_at).toLocaleString()}
            </p>
          </div>
          {isDev && (
          <button
            onClick={() => roleMut.mutate(!p.is_admin)}
            disabled={roleMut.isPending || p.id === me?.id}
            className="flex items-center gap-2 border border-gold/40 px-3 py-2 rounded-sm text-[11px] tracking-widest text-gold hover:bg-gold/10 disabled:opacity-40"
            title={p.id === me?.id ? "Você não pode alterar seu próprio papel" : ""}
          >
            <Shield className="size-3.5" />
            {p.is_admin ? "REVOGAR ADMIN" : "TORNAR ADMIN"}
          </button>
          )}
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-sm tracking-[0.3em] uppercase text-gold flex items-center gap-2">
          <Gift className="size-4" /> Adicionar item ao estoque
        </h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto] items-end border border-gold/15 bg-sea-surface/40 p-4 rounded-sm">
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Item</Label>
            <Select value={giveItemId} onValueChange={setGiveItemId}>
              <SelectTrigger><SelectValue placeholder="Selecione um item do catálogo" /></SelectTrigger>
              <SelectContent>
                {(catalog.data ?? []).length === 0 && (
                  <div className="p-2 text-xs text-parchment/50">Catálogo vazio.</div>
                )}
                {(catalog.data ?? []).map((it) => (
                  <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Quantidade</Label>
            <Input
              type="number"
              min={1}
              value={giveQty}
              onChange={(e) => setGiveQty(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <Button
            disabled={!giveItemId || giveMut.isPending}
            onClick={() => giveMut.mutate()}
          >
            Adicionar
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-sm tracking-[0.3em] uppercase text-gold">Módulos habilitados</h2>
        <p className="text-xs text-parchment/50">
          Desmarque para ocultar do painel lateral do jogador e bloquear a rota.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {FEATURES.map((f) => {
            const enabled = !disabledSet.has(f);
            return (
              <label
                key={f}
                className="flex items-center justify-between border border-gold/15 bg-sea-surface/40 px-4 py-3 rounded-sm cursor-pointer"
              >
                <span className="text-sm">{FEATURE_LABELS[f]}</span>
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={flagMut.isPending}
                  onChange={(e) => flagMut.mutate({ feature: f, enabled: e.target.checked })}
                  className="accent-gold size-4"
                />
              </label>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-sm tracking-[0.3em] uppercase text-gold">Personagens</h2>
        {chars.isLoading ? (
          <Skeleton className="h-24 bg-sea-surface/40" />
        ) : (chars.data ?? []).length === 0 ? (
          <p className="text-sm text-parchment/50">Nenhum personagem criado.</p>
        ) : (
          <div className="space-y-2">
            {chars.data!.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-4 border border-gold/15 bg-sea-surface/40 px-4 py-3 rounded-sm"
              >
                <div className="min-w-0">
                  <p className="text-sm truncate">
                    <span className="text-parchment/40 mr-2">#{c.slot}</span>
                    {c.name || "Sem nome"}{" "}
                    {c.is_active && (
                      <span className="text-[10px] tracking-widest text-gold ml-2">· ATIVO</span>
                    )}
                  </p>
                  <p className="text-xs text-parchment/50">
                    Nível {c.level} · {c.fighting_style || "—"} · {c.organization || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to="/personagens/$id"
                    params={{ id: c.id }}
                    className="flex items-center gap-1.5 border border-gold/40 px-3 py-1.5 rounded-sm text-[11px] tracking-widest text-gold hover:bg-gold/10"
                  >
                    <ExternalLink className="size-3" /> ABRIR
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir "${c.name || "Sem nome"}"?`)) deleteCharMut.mutate(c.id);
                    }}
                    disabled={deleteCharMut.isPending}
                    className="flex items-center gap-1.5 border border-red-500/40 text-red-400 px-3 py-1.5 rounded-sm text-[11px] tracking-widest hover:bg-red-500/10 disabled:opacity-40"
                  >
                    <Trash2 className="size-3" /> EXCLUIR
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
