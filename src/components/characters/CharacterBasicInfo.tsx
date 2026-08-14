import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ORGANIZATIONS, GENDERS, SEXUALITIES, type Character, type CharacterPatch, type Organization, type Gender, type Sexuality } from "@/lib/characters/types";
import { TextFieldDialog } from "./dialogs/TextFieldDialog";
import { ProfessionPanel, type ProfessionSlotPatch } from "./ProfessionPanel";
import { RacePanel } from "./RacePanel";
import { PROFESSION_LIST, getProfessionMeta } from "@/lib/professions/catalog";
import { RACE_CATEGORIES, getRaceImage } from "@/lib/races/catalog";
import { BookOpen, FileText, Sparkles, Briefcase, Eye, Check, ChevronsUpDown } from "lucide-react";


const PARCHMENT_BG =
  "https://blob.firecast.com.br/blobs/UNUEHRQD_4492847/_Pngtree_antique_parchment_paper_texture_b.jpg";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">
        {label}
      </Label>
      {children}
    </div>
  );
}

type DialogKey = "history" | "notes";
const DIALOG_CARDS: { key: DialogKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "history", label: "História", icon: BookOpen },
  { key: "notes", label: "Anotações", icon: FileText },
];

function RaceCard({
  value,
  onChange,
  description,
  onDescriptionChange,
}: {
  value: string;
  onChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const imageUrl = getRaceImage(value);
  const hasImage = !!imageUrl;

  return (
    <div
      className="relative w-full border border-gold/20 rounded-sm p-4 bg-sea-surface/40 overflow-hidden"
      style={
        hasImage
          ? {
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {hasImage && (
        <div className="absolute inset-0 bg-sea-surface/75 backdrop-blur-[1px] pointer-events-none" />
      )}
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="size-3.5 text-gold" />
          <span className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">Raça</span>
        </div>
        <div className="flex gap-2">
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                className="flex-1 justify-between bg-sea-surface/70 font-normal"
              >
                <span className={value ? "" : "text-parchment/50"}>
                  {value || "Selecione..."}
                </span>
                <ChevronsUpDown className="size-3.5 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar raça..." />
                <CommandList className="max-h-72">
                  <CommandEmpty>Nenhuma raça encontrada.</CommandEmpty>
                  {RACE_CATEGORIES.filter((c) => c.races.length > 0).map((c) => (
                    <CommandGroup key={c.category} heading={c.category}>
                      {c.races.map((r) => (
                        <CommandItem
                          key={r}
                          value={r}
                          onSelect={() => {
                            onChange(r === value ? "" : r);
                            setPickerOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 size-3.5 ${r === value ? "opacity-100" : "opacity-0"}`}
                          />
                          {r}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {value && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPanelOpen(true)}
              className="shrink-0 gap-1 bg-sea-surface/70"
            >
              <Eye className="size-3.5" />
              Ver
            </Button>
          )}
        </div>
      </div>

      <RacePanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        race={value}
        description={description}
        onDescriptionChange={onDescriptionChange}
      />

    </div>
  );
}


function ProfessionCard({
  slot,
  label,
  character,
  patch,
  onOpen,
}: {
  slot: 1 | 2;
  label: string;
  character: Character;
  patch: (p: CharacterPatch) => void;
  onOpen: () => void;
}) {
  const idField = slot === 1 ? "profession_1" : "profession_2";
  const value = (character[idField] as string | null) ?? "";
  const meta = getProfessionMeta(value);
  const hasImage = !!meta?.image;

  return (
    <div
      className="relative w-full border border-gold/20 rounded-sm p-4 bg-sea-surface/40 overflow-hidden"
      style={
        hasImage
          ? {
              backgroundImage: `url(${meta!.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {hasImage && (
        <div className="absolute inset-0 bg-sea-surface/75 backdrop-blur-[1px] pointer-events-none" />
      )}
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Briefcase className="size-3.5 text-gold" />
          <span className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">
            {label}
          </span>
        </div>
        <div className="flex gap-2">
          <Select
            value={value}
            onValueChange={(v) => {
              const patchObj: CharacterPatch =
                slot === 1
                  ? {
                      profession_1: v || null,
                      profession_1_specialization: null,
                      profession_1_domain: null,
                    }
                  : {
                      profession_2: v || null,
                      profession_2_specialization: null,
                      profession_2_domain: null,
                    };
              patch(patchObj);
            }}
          >
            <SelectTrigger className="flex-1 bg-sea-surface/70">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {PROFESSION_LIST.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {value && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpen}
              className="shrink-0 gap-1 bg-sea-surface/70"
            >
              <Eye className="size-3.5" />
              Ver
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CharacterBasicInfo({
  character,
  patch,
}: {
  character: Character;
  patch: (p: CharacterPatch) => void;
}) {
  const c = character;
  const [openSlot, setOpenSlot] = useState<1 | 2 | null>(null);

  function slotValues(slot: 1 | 2) {
    if (slot === 1) {
      return {
        professionId: c.profession_1,
        tier: c.profession_1_tier,
        xpCurrent: c.profession_1_xp_current ?? 0,
        xpMax: c.profession_1_xp_max ?? 0,
        specialization: c.profession_1_specialization,
        domain: c.profession_1_domain,
      };
    }
    return {
      professionId: c.profession_2,
      tier: c.profession_2_tier,
      xpCurrent: c.profession_2_xp_current ?? 0,
      xpMax: c.profession_2_xp_max ?? 0,
      specialization: c.profession_2_specialization,
      domain: c.profession_2_domain,
    };
  }

  function slotPatch(slot: 1 | 2, p: ProfessionSlotPatch) {
    const prefix = slot === 1 ? "profession_1" : "profession_2";
    const out: CharacterPatch = {};
    if ("tier" in p) (out as any)[`${prefix}_tier`] = p.tier;
    if ("xpCurrent" in p) (out as any)[`${prefix}_xp_current`] = p.xpCurrent;
    if ("xpMax" in p) (out as any)[`${prefix}_xp_max`] = p.xpMax;
    if ("specialization" in p) (out as any)[`${prefix}_specialization`] = p.specialization;
    if ("domain" in p) (out as any)[`${prefix}_domain`] = p.domain;
    patch(out);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome">
            <Input value={c.name ?? ""} onChange={(e) => patch({ name: e.target.value || null })} />
          </Field>
          <Field label="Título">
            <Input value={c.title ?? ""} onChange={(e) => patch({ title: e.target.value || null })} />
          </Field>
          <Field label="Nível">
            <Input
              type="number"
              value={c.level}
              onChange={(e) => patch({ level: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Experiência (atual / máx)">
            <div className="flex gap-2">
              <Input
                type="number"
                value={c.xp_current}
                onChange={(e) => patch({ xp_current: Number(e.target.value) || 0 })}
              />
              <Input
                type="number"
                value={c.xp_max}
                onChange={(e) => patch({ xp_max: Number(e.target.value) || 0 })}
              />
            </div>
          </Field>
          <Field label="Gênero">
            <Select
              value={c.gender ?? ""}
              onValueChange={(v) => patch({ gender: (v || null) as Gender | null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Idade">
            <Input
              type="number"
              value={c.age ?? ""}
              onChange={(e) => patch({ age: e.target.value ? Number(e.target.value) : null })}
            />
          </Field>
          <Field label="Moedas">
            <Input
              type="number"
              value={c.coins}
              onChange={(e) => patch({ coins: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Tripulação">
            <Input value={c.crew ?? ""} onChange={(e) => patch({ crew: e.target.value || null })} />
          </Field>
          <Field label="Estilo de Luta">
            <Input
              value={c.fighting_style ?? ""}
              onChange={(e) => patch({ fighting_style: e.target.value || null })}
            />
          </Field>
          <Field label="Sexualidade">
            <Select
              value={c.sexuality ?? ""}
              onValueChange={(v) => patch({ sexuality: (v || null) as Sexuality | null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {SEXUALITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Organização">
            <Select
              value={c.organization ?? ""}
              onValueChange={(v) => patch({ organization: (v || null) as Organization | null })}
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
          </Field>
        </div>
      </div>

      <div className="grid gap-3 content-start">
        <ProfessionCard
          slot={1}
          label="Profissão 1"
          character={c}
          patch={patch}
          onOpen={() => setOpenSlot(1)}
        />
        <ProfessionCard
          slot={2}
          label="Profissão 2"
          character={c}
          patch={patch}
          onOpen={() => setOpenSlot(2)}
        />
        <RaceCard
          value={c.race ?? ""}
          onChange={(v) => patch({ race: v || null })}
          description={c.race_description ?? ""}
          onDescriptionChange={(v) => patch({ race_description: v || null })}
        />
        {DIALOG_CARDS.map(({ key, label, icon: Icon }) => {
          const val = (c[key] as string | null) ?? "";
          return (
            <TextFieldDialog
              key={key}
              title={label}
              value={val}
              onChange={(v) => patch({ [key]: v || null } as CharacterPatch)}
              trigger={
                <button
                  className="relative w-full text-left border border-gold/20 rounded-sm p-4 bg-sea-surface/40 hover:border-gold/40 transition-colors overflow-hidden"
                  style={{
                    backgroundImage: `url(${PARCHMENT_BG})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="absolute inset-0 bg-sea-surface/75 backdrop-blur-[1px] pointer-events-none" />
                  <div className="relative flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="size-3.5 text-gold" />
                      <span className="text-[10px] tracking-[0.25em] uppercase text-parchment/60">
                        {label}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-gold/80 border border-gold/30 rounded-sm px-2 py-1 bg-sea-surface/70">
                      <Eye className="size-3" />
                      Ver
                    </span>
                  </div>
                </button>
              }
            />
          );
        })}

      </div>

      <ProfessionPanel
        open={openSlot === 1}
        onOpenChange={(o) => setOpenSlot(o ? 1 : null)}
        slotLabel="Profissão 1"
        values={slotValues(1)}
        onPatch={(p) => slotPatch(1, p)}
      />
      <ProfessionPanel
        open={openSlot === 2}
        onOpenChange={(o) => setOpenSlot(o ? 2 : null)}
        slotLabel="Profissão 2"
        values={slotValues(2)}
        onPatch={(p) => slotPatch(2, p)}
      />
    </div>
  );
}
