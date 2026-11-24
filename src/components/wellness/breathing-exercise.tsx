"use client";
import { useEffect, useRef, useState } from "react";
import { finishBreathing } from "@/app/(app)/wellness/actions";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "@/components/ui/toast";
import { emitBloom } from "@/lib/events";
import { getAmbient } from "@/lib/audio/ambient";
import { usePrefs } from "@/lib/prefs/store";
import { useReducedMotion } from "@/lib/prefs/use-reduced-motion";
import { BREATHING_PATTERNS, phaseAt, type Pattern } from "@/lib/wellness/breathing";

type PatternId = Pattern["id"];
const DURATIONS = { "1": 60_000, "3": 180_000, "5": 300_000 } as const;

export function BreathingExercise() {
  const [patternId, setPatternId] = useState<PatternId>("slow");
  const [duration, setDuration] = useState<keyof typeof DURATIONS>("1");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(0);
  const lastIndex = useRef(-1);
  const reduced = useReducedMotion();
  const sound = usePrefs((s) => s.breathSound);
  const updatePrefs = usePrefs((s) => s.update);
  const pattern = BREATHING_PATTERNS[patternId];
  const total = DURATIONS[duration];

  async function complete(ms: number) {
    const { grew } = await finishBreathing(Math.round(ms / 1000));
    if (grew) {
      emitBloom({ type: "activity", kind: "breathing" });
      toast("Nicely done. A lavender is growing in Bloomverse.", "success");
    }
    lastIndex.current = -1;
  }

  useEffect(() => {
    if (!running) return;
    started.current = performance.now() - elapsed;
    const id = window.setInterval(() => {
      const e = performance.now() - started.current;
      setElapsed(e);
      if (e >= total) {
        setRunning(false);
        void complete(e);
      }
    }, 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);


  const phase = phaseAt(pattern, elapsed);
  // Gentle buzz at each change of step, on phones that support it.
  useEffect(() => {
    if (!running || phase.index === lastIndex.current) return;
    lastIndex.current = phase.index;
    navigator.vibrate?.(phase.kind === "hold" ? 15 : 35);
    if (sound) getAmbient().cue(phase.kind, phase.remainingMs);
  }, [running, phase.index, phase.kind, phase.remainingMs, sound]);

  const scale = !running ? 0.62 : phase.kind === "in" ? 1 : phase.kind === "out" ? 0.62 : phase.index === 1 || pattern.steps[phase.index - 1]?.kind === "in" ? 1 : 0.62;
  const seconds = Math.ceil(phase.remainingMs / 1000);
  const left = Math.max(0, Math.ceil((total - elapsed) / 1000));

  return (
    <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
      <div className="relative mx-auto grid size-56 place-items-center" aria-hidden>
        <div className="absolute inset-0 rounded-full bg-accent-soft" />
        {reduced ? (
          <div className="absolute inset-x-6 bottom-8 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-accent" style={{ width: `${Math.round((running ? phase.progress : 0) * 100)}%` }} />
          </div>
        ) : (
          <div
            className="absolute inset-4 rounded-full bg-gradient-to-br from-petal via-bloom to-coral opacity-80 shadow-[0_20px_50px_-20px_var(--glow)]"
            style={{
              transform: `scale(${scale})`,
              transition: running ? `transform ${phase.kind === "hold" ? 200 : Math.max(300, phase.remainingMs)}ms ease-in-out` : "transform 600ms ease-out",
            }}
          />
        )}
        <div className="relative text-center">
          <p className="font-display text-2xl text-heading">{running ? phase.label : "Ready"}</p>
          {running ? <p className="font-display text-4xl text-heading">{seconds}</p> : null}
        </div>
      </div>
      <div className="space-y-4">
        <p className="sr-only" aria-live="polite">
          {running ? phase.label : ""}
        </p>
        <Segmented
          size="sm"
          label="Pattern"
          value={patternId}
          onChange={(v) => {
            setPatternId(v);
            setElapsed(0);
            setRunning(false);
          }}
          options={Object.values(BREATHING_PATTERNS).map((p) => ({ value: p.id, label: p.short }))}
        />
        <p className="text-muted">
          <span className="font-semibold text-heading">{pattern.name}.</span> {pattern.description}
        </p>
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-heading">
          <input type="checkbox" checked={sound} onChange={(e) => updatePrefs({ breathSound: e.target.checked })} className="size-4 accent-[var(--accent)]" />
          Soft sound cues
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            size="sm"
            label="Length"
            value={duration}
            onChange={(v) => {
              setDuration(v);
              setElapsed(0);
              setRunning(false);
            }}
            options={[
              { value: "1", label: "1 min" },
              { value: "3", label: "3 min" },
              { value: "5", label: "5 min" },
            ]}
          />
          {running ? (
            <Button variant="secondary" onClick={() => setRunning(false)}>
              Pause · {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
            </Button>
          ) : (
            <Button
              onClick={() => {
                if (elapsed >= total) setElapsed(0);
                setRunning(true);
              }}
            >
              {elapsed > 0 && elapsed < total ? "Resume" : "Start"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
