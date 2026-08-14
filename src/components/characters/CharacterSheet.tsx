import { useCharacter } from "@/lib/characters/use-character";
import { CharacterHeader } from "@/components/characters/CharacterHeader";
import { CharacterImages } from "@/components/characters/CharacterImages";
import { CharacterBasicInfo } from "@/components/characters/CharacterBasicInfo";
import { CharacterAttributes } from "@/components/characters/CharacterAttributes";
import { DerivedStats } from "@/components/characters/DerivedStats";
import { HakiCards } from "@/components/characters/HakiCards";
import { LoadoutCards } from "@/components/characters/LoadoutCards";
import { Skeleton } from "@/components/ui/skeleton";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-gold/20" />
        <h2 className="font-display text-sm tracking-[0.3em] uppercase text-gold">{title}</h2>
        <span className="h-px flex-1 bg-gold/20" />
      </div>
      {children}
    </section>
  );
}

export function CharacterSheet({ id }: { id: string }) {
  const { character, isLoading, error, patch, saveState } = useCharacter(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-60" />
      </div>
    );
  }
  if (error || !character) {
    return (
      <div>
        <h1 className="font-display text-2xl mb-2">Personagem não encontrado</h1>
        <p className="text-parchment/60 text-sm">Verifique o link ou volte para a lista.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <CharacterHeader character={character} saveState={saveState} />

      <Section title="Informações Básicas">
        <CharacterImages character={character} patch={patch} />
        <CharacterBasicInfo character={character} patch={patch} />
      </Section>

      <Section title="Atributos">
        <CharacterAttributes character={character} patch={patch} />
      </Section>

      <Section title="Derivados">
        <DerivedStats character={character} />
      </Section>

      <Section title="Hakis">
        <HakiCards character={character} patch={patch} />
      </Section>

      <Section title="EDL & Akuma no Mi">
        <LoadoutCards character={character} patch={patch} />
      </Section>
    </div>
  );
}
