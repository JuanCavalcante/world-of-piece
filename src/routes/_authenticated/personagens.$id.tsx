import { createFileRoute } from "@tanstack/react-router";
import { CharacterSheet } from "@/components/characters/CharacterSheet";

export const Route = createFileRoute("/_authenticated/personagens/$id")({
  component: PersonagemPage,
});

function PersonagemPage() {
  const { id } = Route.useParams();
  return <CharacterSheet id={id} />;
}
