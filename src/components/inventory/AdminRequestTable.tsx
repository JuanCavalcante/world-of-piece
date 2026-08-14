import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Eye, Package } from "lucide-react";
import { approveRequest, rejectRequest } from "@/lib/inventory/admin";
import { TIER_LABELS, TIER_STYLES, type ActivationRequest } from "@/lib/inventory/types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

function RequestRow({ r }: { r: ActivationRequest }) {
  const qc = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const s = TIER_STYLES[r.item_tier];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-requests"] });

  const approve = useMutation({
    mutationFn: () => approveRequest(r.id),
    onSuccess: () => { toast.success("Solicitação aprovada"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const reject = useMutation({
    mutationFn: () => rejectRequest(r.id, reason.trim() || undefined),
    onSuccess: () => { toast.success("Solicitação rejeitada"); setRejectOpen(false); setReason(""); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-3 items-center px-3 py-2.5 border-t border-gold/10 text-sm">
        <div className={`size-10 border ${s.border} bg-sea-deep/60 rounded-sm overflow-hidden flex items-center justify-center`}>
          {r.item_image_url ? (
            <img src={r.item_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Package className="size-4 text-parchment/40" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate">{r.item_name} <span className="text-parchment/40">×{r.quantity}</span></p>
          <p className={`text-[10px] tracking-widest uppercase ${s.text}`}>{TIER_LABELS[r.item_tier]}</p>
        </div>
        <div className="min-w-0">
          <p className="truncate text-parchment/80">{r.character_name}</p>
          <p className="text-[11px] text-parchment/50 truncate">{r.player_email}</p>
        </div>
        <span className="text-[11px] text-parchment/50 whitespace-nowrap">
          {new Date(r.requested_at).toLocaleString()}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewOpen(true)}
            className="p-1.5 border border-gold/40 rounded-sm text-gold hover:bg-gold/10"
            title="Visualizar"
          >
            <Eye className="size-3.5" />
          </button>
          {r.status === "PENDING" && (
            <>
              <button
                onClick={() => approve.mutate()}
                disabled={approve.isPending}
                className="p-1.5 border border-emerald-500/40 text-emerald-400 rounded-sm hover:bg-emerald-500/10 disabled:opacity-40"
                title="Aprovar"
              >
                <Check className="size-3.5" />
              </button>
              <button
                onClick={() => setRejectOpen(true)}
                className="p-1.5 border border-red-500/40 text-red-400 rounded-sm hover:bg-red-500/10"
                title="Rejeitar"
              >
                <X className="size-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide">{r.item_name}</DialogTitle>
          </DialogHeader>
          {r.item_image_url && (
            <div className="aspect-video bg-sea-deep/60 rounded-sm overflow-hidden">
              <img src={r.item_image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="text-xs space-y-1">
            <p><span className="text-parchment/50">Jogador:</span> {r.player_email}</p>
            <p><span className="text-parchment/50">Personagem:</span> {r.character_name}</p>
            <p><span className="text-parchment/50">Quantidade:</span> {r.quantity}</p>
            <p><span className="text-parchment/50">Tier:</span> {TIER_LABELS[r.item_tier]}</p>
            <p><span className="text-parchment/50">Data:</span> {new Date(r.requested_at).toLocaleString()}</p>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Fechar</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide">Rejeitar solicitação</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">
              Motivo (opcional)
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Explique ao jogador o motivo da rejeição..."
            />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button variant="destructive" disabled={reject.isPending} onClick={() => reject.mutate()}>
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AdminRequestTable({ rows }: { rows: ActivationRequest[] }) {
  if (rows.length === 0) {
    return (
      <div className="border border-gold/15 rounded-sm p-8 text-center text-sm text-parchment/50">
        Nenhuma solicitação encontrada.
      </div>
    );
  }
  return (
    <div className="border border-gold/15 rounded-sm overflow-hidden">
      <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-3 px-3 py-2.5 bg-sea-surface/60 text-[10px] tracking-widest uppercase text-parchment/60">
        <span>Item</span>
        <span></span>
        <span>Personagem / Jogador</span>
        <span>Data</span>
        <span>Ações</span>
      </div>
      {rows.map((r) => <RequestRow key={r.id} r={r} />)}
    </div>
  );
}
