import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { listCharacters } from "@/lib/characters/api";
import { useAuth } from "@/hooks/use-auth";
import type { PlayerInventoryRow } from "@/lib/inventory/types";

export function ActivationDialog({
  row,
  open,
  onOpenChange,
  onConfirm,
  pending,
}: {
  row: PlayerInventoryRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (data: { characterId: string; characterName: string; quantity: number }) => void;
  pending?: boolean;
}) {
  const { user } = useAuth();
  const { data: chars } = useQuery({
    queryKey: ["characters", user?.id],
    queryFn: () => listCharacters(user!.id),
    enabled: !!user?.id && open,
  });

  const [charId, setCharId] = useState<string>("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (open) {
      setCharId("");
      setQty(1);
    }
  }, [open, row?.id]);

  const maxQty = row?.quantity ?? 1;
  const selected = chars?.find((c) => c.id === charId) ?? null;
  const canConfirm = !!selected && qty >= 1 && qty <= maxQty;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide">
            Solicitar ativação do item
          </DialogTitle>
          <DialogDescription>
            Informe em qual personagem este item deverá ser ativado e quantas unidades.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">
            Personagem
          </Label>
          <Select value={charId} onValueChange={setCharId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um personagem" />
            </SelectTrigger>
            <SelectContent>
              {(chars ?? []).length === 0 && (
                <div className="p-2 text-xs text-parchment/50">Nenhum personagem criado.</div>
              )}
              {(chars ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  #{c.slot} — {c.name || "Sem nome"} · Nv. {c.level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">
            Unidades (máx. {maxQty})
          </Label>
          <Input
            type="number"
            min={1}
            max={maxQty}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(maxQty, Number(e.target.value) || 1)))}
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button
            disabled={!canConfirm || pending}
            onClick={() =>
              selected &&
              onConfirm({
                characterId: selected.id,
                characterName: selected.name || `Slot ${selected.slot}`,
                quantity: qty,
              })
            }
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
