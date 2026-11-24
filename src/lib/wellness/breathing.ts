/** Guided breathing patterns, timed by a pure function so the UI and tests agree. */

export type StepKind = "in" | "hold" | "out";
export interface Step {
  kind: StepKind;
  ms: number;
  label: string;
}
export interface Pattern {
  id: "slow" | "box" | "calm" | "sigh";
  name: string;
  short: string;
  description: string;
  steps: Step[];
}

export const BREATHING_PATTERNS: Record<Pattern["id"], Pattern> = {
  slow: {
    id: "slow",
    short: "Slow",
    name: "Slow breathing",
    description: "In for 4, out for 6. A longer out-breath helps your body settle.",
    steps: [
      { kind: "in", ms: 4000, label: "Breathe in" },
      { kind: "out", ms: 6000, label: "Breathe out slowly" },
    ],
  },
  box: {
    id: "box",
    short: "Box",
    name: "Box breathing",
    description: "In, hold, out, hold — four counts each. Steadying when your thoughts race.",
    steps: [
      { kind: "in", ms: 4000, label: "Breathe in" },
      { kind: "hold", ms: 4000, label: "Hold" },
      { kind: "out", ms: 4000, label: "Breathe out" },
      { kind: "hold", ms: 4000, label: "Hold" },
    ],
  },
  calm: {
    id: "calm",
    short: "4-7-8",
    name: "4-7-8",
    description: "In for 4, hold for 7, out for 8. Many people use it to wind down for sleep.",
    steps: [
      { kind: "in", ms: 4000, label: "Breathe in" },
      { kind: "hold", ms: 7000, label: "Hold" },
      { kind: "out", ms: 8000, label: "Breathe out" },
    ],
  },
  sigh: {
    id: "sigh",
    short: "Sigh",
    name: "Double sigh",
    description: "Two breaths in through the nose, one long breath out. Quick relief when you feel tense.",
    steps: [
      { kind: "in", ms: 2000, label: "Breathe in" },
      { kind: "in", ms: 1000, label: "A little more" },
      { kind: "out", ms: 6000, label: "Long breath out" },
    ],
  },
};

export function cycleMs(p: Pattern): number {
  return p.steps.reduce((a, s) => a + s.ms, 0);
}

export function phaseAt(p: Pattern, elapsedMs: number) {
  const total = cycleMs(p);
  const cycle = Math.floor(Math.max(0, elapsedMs) / total);
  let t = Math.max(0, elapsedMs) - cycle * total;
  for (let index = 0; index < p.steps.length; index++) {
    const step = p.steps[index];
    if (t < step.ms) return { ...step, index, cycle, remainingMs: step.ms - t, progress: t / step.ms };
    t -= step.ms;
  }
  const last = p.steps[p.steps.length - 1];
  return { ...last, index: p.steps.length - 1, cycle, remainingMs: 0, progress: 1 };
}
