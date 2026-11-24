"use client";
import { Pause, Play, Volume1, Volume2 } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { audioSupported, getAmbient, useAmbient } from "@/lib/audio/ambient";
import { SOUNDSCAPES, type Soundscape } from "@/lib/audio/ambient-engine";
import { usePrefs } from "@/lib/prefs/store";
import { useClientValue } from "@/lib/use-client-value";
import { cn } from "@/lib/utils";

/** Pick a soundscape, play or pause, set the volume. Nothing plays until the person presses play. */
export function AmbientPlayer({ compact = false }: { compact?: boolean }) {
  const supported = useClientValue(audioSupported, true);
  const state = useAmbient();
  const saved = usePrefs((s) => s.ambient);
  const update = usePrefs((s) => s.update);
  const chosen: Soundscape = state.kind ?? saved.kind ?? "rain";

  // Bring back the last volume the person chose.
  useEffect(() => {
    if (getAmbient().getState().volume !== saved.volume && !getAmbient().getState().playing) getAmbient().setVolume(saved.volume);
  }, [saved.volume]);

  if (!supported) return <p className="text-sm text-muted">This browser can&apos;t play BLOOM&apos;s soundscapes.</p>;

  const choose = (kind: Soundscape) => {
    update({ ambient: { kind, volume: state.volume } });
    void getAmbient().play(kind);
  };

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Soundscape" className={cn("flex flex-wrap gap-2", compact && "gap-1.5")}>
        {SOUNDSCAPES.filter((s) => !compact || s.id !== "noise").map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={chosen === s.id}
            title={s.description}
            onClick={() => choose(s.id)}
            className={cn(
              "min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors",
              chosen === s.id ? "border-transparent bg-accent text-accent-fg" : "border-line bg-surface-strong text-heading hover:border-accent/40",
            )}
          >
            {s.name}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="icon"
          aria-label={state.playing ? "Pause" : `Play ${SOUNDSCAPES.find((s) => s.id === chosen)?.name}`}
          disabled={state.loading}
          onClick={() => (state.playing ? getAmbient().pause() : choose(chosen))}
        >
          {state.playing ? <Pause aria-hidden /> : <Play aria-hidden />}
        </Button>
        <label className="flex flex-1 items-center gap-2">
          <span className="sr-only">Volume</span>
          <Volume1 aria-hidden className="size-4 shrink-0 text-muted" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={state.volume}
            onChange={(e) => {
              getAmbient().setVolume(Number(e.target.value));
              update({ ambient: { kind: chosen, volume: Number(e.target.value) } });
            }}
            className="h-2 w-full cursor-pointer accent-[var(--accent)]"
          />
          <Volume2 aria-hidden className="size-4 shrink-0 text-muted" />
        </label>
      </div>
      <p className="text-sm text-muted" aria-live="polite">
        {state.loading
          ? "Making the sound…"
          : state.pausedForEmergency
            ? "Paused because SOS opened."
            : state.playing
              ? `Playing ${SOUNDSCAPES.find((s) => s.id === state.kind)?.name.toLowerCase()}.`
              : compact
                ? "Made on your phone, nothing to download."
                : "Every sound is made on your phone. Nothing downloads, and it pauses if you open SOS."}
      </p>
    </div>
  );
}
