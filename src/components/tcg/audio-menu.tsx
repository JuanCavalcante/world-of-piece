import { Volume2, VolumeX, Waves } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { audioManager } from "@/lib/audio-manager";
import { useAudioPrefs } from "@/hooks/use-audio";

export function AudioMenu() {
  const prefs = useAudioPrefs();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="p-2 text-gold/70 hover:text-gold transition-colors rounded-lg hover:bg-gold/5"
          aria-label="Configurações de áudio"
        >
          {prefs.sfxEnabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 p-0 bg-sea-surface/95 backdrop-blur-xl border-gold/20 text-parchment shadow-2xl overflow-hidden"
      >
        <div className="p-4 border-b border-gold/10 bg-sea-deep/40">
          <h3 className="text-xs font-display tracking-widest uppercase text-gold">Áudio</h3>
        </div>

        <div className="p-4 space-y-5">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs tracking-wider uppercase text-parchment/80">
                <Waves className="size-3.5 text-gold/70" /> Efeitos sonoros
              </span>
              <Switch
                checked={prefs.sfxEnabled}
                onCheckedChange={(v) => {
                  audioManager.unlock();
                  audioManager.setSfxEnabled(v);
                  if (v) audioManager.playSfx("turn");
                }}
              />
            </div>
            <Slider
              value={[Math.round(prefs.sfxVolume * 100)]}
              onValueChange={([v]) => audioManager.setSfxVolume(v / 100)}
              max={100}
              step={1}
              disabled={!prefs.sfxEnabled}
              aria-label="Volume dos efeitos"
            />
            <p className="text-[10px] tracking-widest uppercase text-parchment/40">
              Volume · {Math.round(prefs.sfxVolume * 100)}%
            </p>
          </section>
        </div>
      </PopoverContent>
    </Popover>
  );
}
