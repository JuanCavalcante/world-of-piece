import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AdminLink } from "@/lib/admin/base";
import { ArrowLeft } from "lucide-react";
import { CharacterSheet } from "@/components/characters/CharacterSheet";

export const Route = createFileRoute("/admin/npcs/$id")({
  component: AdminNpcSheetPage,
});

export function AdminNpcSheetPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  return (
    <div className="space-y-6">
      <AdminLink
        to="/npcs"
        className="inline-flex items-center gap-2 text-[11px] tracking-widest text-gold hover:text-parchment"
      >
        <ArrowLeft className="size-3.5" /> VOLTAR PARA NPCS
      </AdminLink>
      <CharacterSheet id={id} />
    </div>
  );
}
