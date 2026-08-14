import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import type { ReactNode } from "react";

export function TextFieldDialog({
  title,
  value,
  onChange,
  trigger,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  trigger: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide">{title}</DialogTitle>
        </DialogHeader>
        <RichTextEditor
          value={value}
          onChange={onChange}
          placeholder="Escreva aqui..."
          minHeight="18rem"
        />
      </DialogContent>
    </Dialog>
  );
}
