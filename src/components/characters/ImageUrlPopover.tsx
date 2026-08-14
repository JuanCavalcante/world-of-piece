import { useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImagePlus } from "lucide-react";

export function ImageUrlPopover({
  value,
  onSave,
}: {
  value?: string;
  onSave: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setDraft(value ?? ""); }}>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="bg-sea-surface/80 backdrop-blur">
          <ImagePlus className="size-3.5 mr-1" />
          {value ? "Trocar" : "Adicionar"} imagem
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-2" onClick={(e) => e.stopPropagation()}>
        <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">URL da imagem</Label>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="https://..."
          autoFocus
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button size="sm" onClick={() => { onSave(draft.trim()); setOpen(false); }}>Salvar</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
