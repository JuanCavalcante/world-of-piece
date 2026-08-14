import { useCallback, useEffect, useSyncExternalStore } from "react";
import { audioManager, DEFAULT_PREFS, type AudioPrefs } from "@/lib/audio-manager";

export function useAudioPrefs(): AudioPrefs {
  return useSyncExternalStore(
    useCallback((cb: () => void) => audioManager.subscribe(cb), []),
    () => audioManager.getPrefs(),
    () => DEFAULT_PREFS,
  );
}

/** Música de fundo desabilitada — hook mantido para não quebrar importações. */
export function useBattleMusic(_active: boolean) {
  // Não faz nada: apenas efeitos sonoros são tocados.
}
