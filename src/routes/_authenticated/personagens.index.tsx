import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { createInSlot, deleteCharacter, listCharacters, setActiveCharacter } from "@/lib/characters/api";
import { SlotCard } from "@/components/characters/SlotCard";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/personagens/")({
  component: PersonagensPage,
});

function PersonagensPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ["characters", userId],
    queryFn: () => listCharacters(userId!),
    enabled: !!userId,
  });

  const createMut = useMutation({
    mutationFn: (slot: number) => createInSlot(userId!, slot),
    onSuccess: (character) => {
      qc.invalidateQueries({ queryKey: ["characters", userId] });
      navigate({ to: "/personagens/$id", params: { id: character.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeMut = useMutation({
    mutationFn: (id: string) => setActiveCharacter(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["characters", userId] });
      toast.success("Personagem ativo atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCharacter(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["characters", userId] });
      toast.success("Personagem excluído");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <p className="text-[11px] tracking-[0.3em] text-gold/70 uppercase mb-3">
        Personagens
      </p>
      <h1 className="font-display text-3xl lg:text-4xl tracking-wide mb-4">
        Seus personagens
      </h1>
      <p className="text-parchment/60 max-w-2xl mb-10">
        Você pode manter até três personagens. Apenas um pode estar ativo por vez.
      </p>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {query.isLoading
          ? [1, 2, 3].map((s) => (
              <Skeleton key={s} className="h-[220px] rounded-sm bg-sea-surface/40" />
            ))
          : [1, 2, 3].map((slot) => {
              const c = query.data?.find((x) => x.slot === slot) ?? null;
              return (
                <SlotCard
                  key={slot}
                  slot={slot}
                  character={c}
                  onCreate={() => createMut.mutate(slot)}
                  onSetActive={(id) => activeMut.mutate(id)}
                  onDelete={(id) => deleteMut.mutate(id)}
                  creating={createMut.isPending}
                  deleting={deleteMut.isPending}
                />
              );
            })}
      </div>
    </div>
  );
}
