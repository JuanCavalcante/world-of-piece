import * as React from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  Link as LinkIcon,
  Eraser,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FONTS = [
  "Palatino Linotype",
  "Georgia",
  "Times New Roman",
  "Arial",
  "Verdana",
  "Courier New",
];

// execCommand fontSize accepts 1-7
const SIZES: { label: string; value: string }[] = [
  { label: "10", value: "1" },
  { label: "12", value: "2" },
  { label: "14", value: "3" },
  { label: "16", value: "4" },
  { label: "20", value: "5" },
  { label: "24", value: "6" },
  { label: "32", value: "7" },
];

function looksLikeHtml(v: string) {
  return /<\/?[a-z][\s\S]*>/i.test(v);
}

function toHtml(value: string) {
  if (!value) return "";
  if (looksLikeHtml(value)) return value;
  return value
    .split(/\n/)
    .map((line) => `<div>${line ? line.replace(/</g, "&lt;") : "<br>"}</div>`)
    .join("");
}

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Escreva aqui...",
  className,
  minHeight = "10rem",
}: RichTextEditorProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = React.useState(true);

  // Sync external value only when it differs from the DOM (avoids caret jumps)
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = toHtml(value ?? "");
    if (el.innerHTML !== next) el.innerHTML = next;
    setEmpty(!el.textContent?.trim() && !el.querySelector("img"));
  }, [value]);

  const emit = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEmpty(!el.textContent?.trim() && !el.querySelector("img"));
    onChange(el.innerHTML);
  }, [onChange]);

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, arg);
    emit();
  };

  const btn = (
    key: string,
    icon: React.ReactNode,
    command: string,
    label: string,
    arg?: string,
  ) => (
    <Toggle
      key={key}
      size="sm"
      aria-label={label}
      title={label}
      className="h-8 w-8 p-0"
      onMouseDown={(e) => e.preventDefault()}
      onPressedChange={() => exec(command, arg)}
    >
      {icon}
    </Toggle>
  );

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background overflow-hidden",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 px-1.5 py-1">
        <Select onValueChange={(v) => exec("fontName", v)}>
          <SelectTrigger className="h-8 w-[9.5rem] text-xs">
            <SelectValue placeholder="Fonte" />
          </SelectTrigger>
          <SelectContent>
            {FONTS.map((f) => (
              <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={(v) => exec("fontSize", v)}>
          <SelectTrigger className="h-8 w-[4.5rem] text-xs">
            <SelectValue placeholder="Tam." />
          </SelectTrigger>
          <SelectContent>
            {SIZES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-input"
          title="Cor do texto"
        >
          <input
            type="color"
            className="h-4 w-4 cursor-pointer border-0 bg-transparent p-0"
            onChange={(e) => exec("foreColor", e.target.value)}
          />
        </label>

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        {btn("b", <Bold className="h-4 w-4" />, "bold", "Negrito")}
        {btn("i", <Italic className="h-4 w-4" />, "italic", "Itálico")}
        {btn("u", <Underline className="h-4 w-4" />, "underline", "Sublinhado")}
        {btn(
          "s",
          <Strikethrough className="h-4 w-4" />,
          "strikeThrough",
          "Tachado",
        )}

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        {btn("al", <AlignLeft className="h-4 w-4" />, "justifyLeft", "Alinhar à esquerda")}
        {btn("ac", <AlignCenter className="h-4 w-4" />, "justifyCenter", "Centralizar")}
        {btn("ar", <AlignRight className="h-4 w-4" />, "justifyRight", "Alinhar à direita")}
        {btn("aj", <AlignJustify className="h-4 w-4" />, "justifyFull", "Justificar")}

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        {btn("ul", <List className="h-4 w-4" />, "insertUnorderedList", "Lista")}
        {btn("ol", <ListOrdered className="h-4 w-4" />, "insertOrderedList", "Lista numerada")}

        <Toggle
          size="sm"
          aria-label="Inserir link"
          title="Inserir link"
          className="h-8 w-8 p-0"
          onMouseDown={(e) => e.preventDefault()}
          onPressedChange={() => {
            const url = window.prompt("URL do link:");
            if (url) exec("createLink", url);
          }}
        >
          <LinkIcon className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        {btn("undo", <Undo2 className="h-4 w-4" />, "undo", "Desfazer")}
        {btn("redo", <Redo2 className="h-4 w-4" />, "redo", "Refazer")}
        {btn("clear", <Eraser className="h-4 w-4" />, "removeFormat", "Limpar formatação")}
      </div>

      <div className="relative">
        {empty && (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">
            {placeholder}
          </span>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          onInput={emit}
          onBlur={emit}
          className="prose-sm max-w-none px-3 py-2 text-sm outline-none [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
          style={{ minHeight }}
        />
      </div>
    </div>
  );
}
