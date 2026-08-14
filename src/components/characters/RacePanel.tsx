import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { getRaceImage } from "@/lib/races/catalog";

export function RacePanel({
  open,
  onOpenChange,
  race,
  description,
  onDescriptionChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  race: string;
  description: string;
  onDescriptionChange: (v: string) => void;
}) {
  const imageUrl = getRaceImage(race);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="relative rounded-sm overflow-hidden border border-gold/20 bg-sea-surface/40 h-48">
          {imageUrl ? (
            <img src={imageUrl} alt={race} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-parchment/40 text-xs">
              Sem imagem
            </div>
          )}
        </div>

        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-gold">
            {race || "Raça"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">
            Descrição
          </Label>
          <RichTextEditor
            value={description}
            onChange={onDescriptionChange}
            placeholder="Descreva a raça..."
            minHeight="8rem"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
