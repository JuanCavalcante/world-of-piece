import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCharacter, updateCharacter } from "./api";
import type { Character, CharacterPatch } from "./types";

const DEBOUNCE_MS = 1200;

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function useCharacter(id: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["character", id],
    queryFn: () => getCharacter(id),
  });

  const [local, setLocal] = useState<Character | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const pending = useRef<CharacterPatch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.data) setLocal(query.data);
  }, [query.data]);

  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    setSaveState("saving");
    try {
      await updateCharacter(id, patch);
      setSaveState("saved");
      qc.invalidateQueries({ queryKey: ["characters"] });
    } catch (e) {
      console.error(e);
      setSaveState("error");
      toast.error("Falha ao salvar alterações");
    }
  }, [id, qc]);

  const patch = useCallback(
    (delta: CharacterPatch) => {
      setLocal((prev) => (prev ? { ...prev, ...delta } : prev));
      pending.current = { ...pending.current, ...delta };
      setSaveState("dirty");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, DEBOUNCE_MS);
    },
    [flush],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return {
    character: local,
    isLoading: query.isLoading,
    error: query.error,
    saveState,
    patch,
  };
}
