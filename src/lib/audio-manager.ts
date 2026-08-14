/**
 * AudioManager — HTML5 Audio nativo, sem dependências externas.
 * Instância única reutilizável (nada de `new Audio()` a cada ação).
 */

export type SfxName = "attack" | "damage" | "turn" | "pack-open" | "legendary";

const SFX_FILES: Record<SfxName, string> = {
  attack: "/sounds/attack.mp3",
  damage: "/sounds/damage.mp3",
  turn: "/sounds/turn.mp3",
  "pack-open": "/sounds/pack-open.mp3",
  legendary: "/sounds/legendary.mp3",
};

const MUSIC_FILE = "/music/battle-theme.mp3";
const STORAGE_KEY = "wop-tcg-audio";
const POOL_SIZE = 3;

export type AudioPrefs = {
  sfxEnabled: boolean;
  sfxVolume: number; // 0..1
  musicEnabled: boolean;
  musicVolume: number; // 0..1
};

export const DEFAULT_PREFS: AudioPrefs = {
  sfxEnabled: true,
  sfxVolume: 0.7,
  musicEnabled: true,
  musicVolume: 0.35,
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
}

function loadPrefs(): AudioPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const p = JSON.parse(raw) as Partial<AudioPrefs>;
    return {
      sfxEnabled: p.sfxEnabled ?? DEFAULT_PREFS.sfxEnabled,
      sfxVolume: clamp01(p.sfxVolume ?? DEFAULT_PREFS.sfxVolume),
      musicEnabled: p.musicEnabled ?? DEFAULT_PREFS.musicEnabled,
      musicVolume: clamp01(p.musicVolume ?? DEFAULT_PREFS.musicVolume),
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

class AudioManager {
  private prefs: AudioPrefs = { ...DEFAULT_PREFS };
  private sfxPool = new Map<SfxName, HTMLAudioElement[]>();
  private sfxIndex = new Map<SfxName, number>();
  private music: HTMLAudioElement | null = null;
  private loaded = false;
  /** true depois da primeira interação do usuário */
  private unlocked = false;
  /** música pedida antes do unlock */
  private musicWanted = false;
  private listeners = new Set<() => void>();

  /** Cria os elementos de áudio uma única vez (client-side). */
  preload() {
    if (this.loaded || typeof window === "undefined") return;
    this.loaded = true;
    this.prefs = loadPrefs();

    (Object.keys(SFX_FILES) as SfxName[]).forEach((name) => {
      const pool: HTMLAudioElement[] = [];
      for (let i = 0; i < POOL_SIZE; i++) {
        const a = new Audio(SFX_FILES[name]);
        a.preload = "auto";
        a.volume = this.prefs.sfxVolume;
        pool.push(a);
      }
      this.sfxPool.set(name, pool);
      this.sfxIndex.set(name, 0);
    });

    const music = new Audio(MUSIC_FILE);
    music.loop = true;
    music.preload = "auto";
    music.volume = this.prefs.musicVolume;
    this.music = music;
    this.emit();
  }

  /* ----- preferências ----- */

  getPrefs(): AudioPrefs {
    return this.prefs;
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  private persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.prefs));
    } catch {
      /* storage indisponível */
    }
    this.emit();
  }

  setSfxVolume(v: number) {
    this.prefs = { ...this.prefs, sfxVolume: clamp01(v) };
    this.sfxPool.forEach((pool) => pool.forEach((a) => (a.volume = this.prefs.sfxVolume)));
    this.persist();
  }

  setMusicVolume(v: number) {
    this.prefs = { ...this.prefs, musicVolume: clamp01(v) };
    if (this.music) this.music.volume = this.prefs.musicVolume;
    this.persist();
  }

  setSfxEnabled(on: boolean) {
    this.prefs = { ...this.prefs, sfxEnabled: on };
    this.persist();
  }

  setMusicEnabled(on: boolean) {
    this.prefs = { ...this.prefs, musicEnabled: on };
    if (!on) this.pauseMusic();
    else if (this.musicWanted) this.startMusic();
    this.persist();
  }

  /* ----- desbloqueio pelo navegador ----- */

  /** Deve ser chamado dentro de um gesto do usuário (clique/toque/tecla). */
  unlock() {
    if (this.unlocked) return;
    this.preload();
    this.unlocked = true;
    if (this.musicWanted) this.startMusic();
  }

  isUnlocked() {
    return this.unlocked;
  }

  /* ----- reprodução ----- */

  playSfx(name: SfxName) {
    if (typeof window === "undefined") return;
    this.preload();
    if (!this.prefs.sfxEnabled || !this.unlocked) return;
    const pool = this.sfxPool.get(name);
    if (!pool?.length) return;
    const i = (this.sfxIndex.get(name) ?? 0) % pool.length;
    this.sfxIndex.set(name, i + 1);
    const el = pool[i];
    try {
      el.currentTime = 0;
      el.volume = this.prefs.sfxVolume;
      void el.play().catch(() => undefined);
    } catch {
      /* ignora */
    }
  }

  startMusic() {
    // Música de fundo desabilitada por solicitação do usuário.
    return;
  }

  /** Pausa mantendo a intenção de tocar (usado ao desligar a música). */
  private pauseMusic() {
    // Música de fundo desabilitada.
  }

  stopMusic() {
    // Música de fundo desabilitada.
  }
}

export const audioManager = new AudioManager();
