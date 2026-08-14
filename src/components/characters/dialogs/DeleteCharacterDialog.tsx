import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function DeleteCharacterDialog({
  characterName,
  onConfirm,
  trigger,
  pending,
}: {
  characterName: string;
  onConfirm: () => void;
  trigger: ReactNode;
  pending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const expected = characterName.trim();
  const matches = input.trim() === expected && expected.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setInput("");
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide">
            Excluir personagem
          </DialogTitle>
          <DialogDescription>
            Esta ação é irreversível. Para confirmar, digite o nome do personagem:{" "}
            <span className="text-gold font-medium">{expected || "(sem nome)"}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">
            Nome do personagem
          </Label>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={expected}
            autoFocus
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={!matches || pending}
            onClick={() => {
              onConfirm();
              setOpen(false);
              setInput("");
            }}
          >
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
