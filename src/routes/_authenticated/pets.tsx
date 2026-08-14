import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PawPrint, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { TIER_LABELS } from "@/lib/inventory/types";
import { createPet, deletePet, listPets, updatePet } from "@/lib/pets/api";
import type { Pet, PetPatch } from "@/lib/pets/types";
import { PetPanel } from "@/components/pets/PetPanel";

export const Route = createFileRoute("/_authenticated/pets")({
  component: PetsPage,
});

const DEBOUNCE_MS = 900;

function PetsPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["pets", userId],
    queryFn: () => listPets(userId!),
    enabled: !!userId,
  });

  const pending = useRef<Record<string, PetPatch>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const patch = useCallback(
    (id: string, delta: PetPatch) => {
      pending.current[id] = { ...(pending.current[id] ?? {}), ...delta };
      qc.setQueryData<Pet[]>(["pets", userId], (prev) =>
        (prev ?? []).map((p) => (p.id === id ? ({ ...p, ...delta } as Pet) : p)),
      );
      if (timers.current[id]) clearTimeout(timers.current[id]);
      timers.current[id] = setTimeout(async () => {
        const body = pending.current[id];
        delete pending.current[id];
        if (!body) return;
        try {
          await updatePet(id, body);
        } catch (e) {
          console.error(e);
          toast.error("Falha ao salvar alterações do pet");
        }
      }, DEBOUNCE_MS);
    },
    [qc, userId],
  );

  const createMut = useMutation({
    mutationFn: () => createPet(userId!),
    onSuccess: (pet) => {
      qc.invalidateQueries({ queryKey: ["pets", userId] });
      setOpenId(pet.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePet(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pets", userId] });
      toast.success("Pet excluído");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pets = query.data ?? [];

  return (
    <div>
      <p className="text-[11px] tracking-[0.3em] text-gold/70 uppercase mb-3">Pets</p>
      <h1 className="font-display text-3xl lg:text-4xl tracking-wide mb-4">
        Seus pets ativos
      </h1>
      <p className="text-parchment/60 max-w-2xl mb-10">
        Administre aqui todas as fichas dos seus pets ativos.
      </p>

      {query.isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((s) => (
            <Skeleton key={s} className="h-[19rem] rounded-sm bg-sea-surface/40" />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => (
            <button
              key={pet.id}
              type="button"
              onClick={() => setOpenId(pet.id)}
              className="relative text-left border border-gold/20 rounded-sm overflow-hidden bg-sea-surface/40 min-h-[19rem] flex hover:border-gold/50 transition"
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: pet.image_url ? `url(${pet.image_url})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div className="absolute inset-0 bg-sea-surface/80 backdrop-blur-[1px]" />
              <div className="relative p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <PawPrint className="size-3.5 text-gold" />
                  <span className="font-serif text-sm text-gold tracking-wide">Pet</span>
                </div>
                <div className="font-serif text-lg text-parchment/90 truncate">
                  {pet.name || (
                    <span className="text-parchment/40 italic text-sm">Sem registro</span>
                  )}
                </div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-parchment/60">
                  {[pet.title, pet.tier ? TIER_LABELS[pet.tier as keyof typeof TIER_LABELS] ?? pet.tier : null]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
            </button>
          ))}

          <button
            type="button"
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
            className="border border-dashed border-gold/25 rounded-sm min-h-[19rem] flex flex-col items-center justify-center gap-3 text-parchment/60 hover:border-gold/50 hover:text-parchment transition"
          >
            <Plus className="size-6 text-gold" />
            <span className="text-[10px] tracking-[0.3em] uppercase">Novo pet</span>
          </button>
        </div>
      )}

      {pets.map((pet) => (
        <PetPanel
          key={pet.id}
          open={openId === pet.id}
          onOpenChange={(o) => setOpenId(o ? pet.id : null)}
          pet={pet}
          onPatch={patch}
          onDelete={(id) => deleteMut.mutate(id)}
        />
      ))}
    </div>
  );
}
