import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AdminLink } from "@/lib/admin/base";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Anchor, Pencil, Plus, Trash2 } from "lucide-react";
import {
  addCrewMember,
  getCrew,
  listCrewMembersDetailed,
  removeCrewMember,
  setCrewMemberRole,
  updateCrew,
  type CrewRole,
} from "@/lib/crews/api";
import { listPlayers } from "@/lib/admin/api";
import { ORGANIZATIONS } from "@/lib/characters/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/crews/$id")({
  component: AdminCrewEditor,
});


export function AdminCrewEditor() {
  const { id } = useParams({ strict: false }) as { id: string };
  const qc = useQueryClient();

  const crewQ = useQuery({ queryKey: ["admin-crew", id], queryFn: () => getCrew(id) });
  const membersQ = useQuery({
    queryKey: ["admin-crew-members", id],
    queryFn: () => listCrewMembersDetailed(id),
  });

  const patchMut = useMutation({
    mutationFn: (patch: Parameters<typeof updateCrew>[1]) => updateCrew(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-crew", id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const [flagOpen, setFlagOpen] = useState(false);
  const [flagDraft, setFlagDraft] = useState("");

  if (crewQ.isLoading) {
    return <Skeleton className="h-64 bg-sea-surface/40" />;
  }
  const crew = crewQ.data;
  if (!crew) {
    return (
      <div>
        <AdminLink to="/crews" className="text-xs tracking-widest text-gold flex items-center gap-2 mb-4">
          <ArrowLeft className="size-3.5" /> VOLTAR
        </AdminLink>
        <p className="text-parchment/60 text-sm">Tripulação não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <AdminLink to="/crews" className="text-xs tracking-widest text-gold flex items-center gap-2">
          <ArrowLeft className="size-3.5" /> VOLTAR
        </AdminLink>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Bandeira */}
        <div>
          <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60 mb-2 block">
            Bandeira
          </Label>
          <Dialog
            open={flagOpen}
            onOpenChange={(o) => {
              setFlagOpen(o);
              if (o) setFlagDraft(crew.flag_url ?? "");
            }}
          >
            <DialogTrigger asChild>
              <button className="w-full aspect-video border border-gold/25 rounded-sm bg-sea-deep/60 overflow-hidden relative group hover:border-gold/60 transition-colors">
                {crew.flag_url ? (
                  <img src={crew.flag_url} alt="Bandeira" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-parchment/40">
                    <Anchor className="size-8 mb-2" />
                    <span className="text-[10px] tracking-widest">SEM BANDEIRA</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Pencil className="size-5 text-gold" />
                </div>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bandeira da tripulação</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  value={flagDraft}
                  onChange={(e) => setFlagDraft(e.target.value)}
                  placeholder="https://..."
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setFlagOpen(false)}>Cancelar</Button>
                  <Button
                    onClick={() => {
                      patchMut.mutate({ flag_url: flagDraft.trim() || null });
                      setFlagOpen(false);
                    }}
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Nome + Organização */}
        <div className="space-y-4">
          <div>
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60 mb-1.5 block">
              Nome
            </Label>
            <Input
              defaultValue={crew.name ?? ""}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (crew.name ?? "")) patchMut.mutate({ name: v || null });
              }}
              placeholder="Sem nome"
            />
          </div>
          <div>
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60 mb-1.5 block">
              Organização
            </Label>
            <Select
              value={crew.organization ?? ""}
              onValueChange={(v) => patchMut.mutate({ organization: v || null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {ORGANIZATIONS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Membros */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm tracking-[0.3em] uppercase text-gold">Membros</h2>
          <AddMembersDialog
            crewId={id}
            existing={(membersQ.data ?? []).map((m) => m.user_id)}
          />
        </div>

        {membersQ.isLoading ? (
          <Skeleton className="h-24 bg-sea-surface/40" />
        ) : (membersQ.data ?? []).length === 0 ? (
          <div className="border border-gold/15 border-dashed rounded-sm p-8 text-center text-sm text-parchment/60">
            Nenhum membro. Clique em "Adicionar membro".
          </div>
        ) : (
          <div className="border border-gold/15 rounded-sm overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-3 px-4 py-2 bg-sea-surface/60 text-[10px] tracking-widest uppercase text-parchment/60">
              <span>Usuário</span>
              <span>Personagem ativo</span>
              <span>Nível</span>
              <span>Cargo</span>
              <span></span>
            </div>
            {(membersQ.data ?? []).map((m) => (
              <MemberRow key={m.user_id} crewId={id} member={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MemberRow({
  crewId,
  member,
}: {
  crewId: string;
  member: { user_id: string; username: string; role: CrewRole; character_name: string | null; level: number };
}) {
  const qc = useQueryClient();
  const roleMut = useMutation({
    mutationFn: (role: CrewRole) => setCrewMemberRole(crewId, member.user_id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-crew-members", crewId] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const removeMut = useMutation({
    mutationFn: () => removeCrewMember(crewId, member.user_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-crew-members", crewId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-3 items-center px-4 py-2.5 border-t border-gold/10 text-sm">
      <span className="truncate">{member.username || "—"}</span>
      <span className="truncate text-parchment/70">{member.character_name || "—"}</span>
      <span className="text-parchment/60 text-xs">Nv {member.level}</span>
      <Select value={member.role} onValueChange={(v) => roleMut.mutate(v as CrewRole)}>
        <SelectTrigger className="h-8 w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="capitao">Capitão</SelectItem>
          <SelectItem value="imediato">Imediato</SelectItem>
          <SelectItem value="tripulante">Tripulante</SelectItem>
        </SelectContent>
      </Select>
      <button
        onClick={() => {
          if (confirm(`Remover ${member.username || "membro"} da tripulação?`)) removeMut.mutate();
        }}
        className="p-1.5 border border-red-500/40 text-red-400 rounded-sm hover:bg-red-500/10"
        title="Remover"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

function AddMembersDialog({ crewId, existing }: { crewId: string; existing: string[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");

  const playersQ = useQuery({
    queryKey: ["admin-players"],
    queryFn: listPlayers,
    enabled: open,
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const ids = Object.keys(selected).filter((k) => selected[k]);
      for (const uid of ids) {
        await addCrewMember(crewId, uid);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-crew-members", crewId] });
      setOpen(false);
      setSelected({});
      toast.success("Membros adicionados");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const existingSet = new Set(existing);
  const filtered = (playersQ.data ?? []).filter((p) => {
    if (existingSet.has(p.id)) return false;
    const s = q.toLowerCase();
    return !s || p.username.toLowerCase().includes(s) || p.email.toLowerCase().includes(s);
  });
  const count = Object.values(selected).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="size-4" /> Adicionar membro
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar membros</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="max-h-80 overflow-auto border border-gold/15 rounded-sm">
            {playersQ.isLoading ? (
              <div className="p-4 text-sm text-parchment/50">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-sm text-parchment/50">Nenhum jogador disponível.</div>
            ) : (
              filtered.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2 border-t border-gold/10 first:border-t-0 hover:bg-gold/5 cursor-pointer"
                >
                  <Checkbox
                    checked={!!selected[p.id]}
                    onCheckedChange={(v) =>
                      setSelected((prev) => ({ ...prev, [p.id]: Boolean(v) }))
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{p.username || "—"}</p>
                    <p className="text-[11px] text-parchment/50 truncate">{p.email}</p>
                  </div>
                </label>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => addMut.mutate()}
              disabled={count === 0 || addMut.isPending}
            >
              Adicionar ({count})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
