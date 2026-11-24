/**
 * The standalone ambient sound engine. Every soundscape is generated on the device with the Web Audio
 * API — no recordings, no downloads, nothing licensed. Nothing plays until the person presses play
 * (browsers require that anyway), and an SOS stops the sound immediately.
 */

export type Soundscape = "rain" | "ocean" | "forest" | "pads" | "noise";

export const SOUNDSCAPES: { id: Soundscape; name: string; description: string }[] = [
  { id: "rain", name: "Rain", description: "Steady rainfall with soft drops" },
  { id: "ocean", name: "Ocean", description: "Slow waves rolling in" },
  { id: "forest", name: "Forest", description: "A light breeze and distant birds" },
  { id: "pads", name: "Soft music", description: "Slow, warm chords" },
  { id: "noise", name: "White noise", description: "Even, steady noise for focus or sleep" },
];

export interface AmbientState {
  kind: Soundscape | null;
  playing: boolean;
  loading: boolean;
  volume: number;
  pausedForEmergency: boolean;
}

export interface EngineDeps {
  createContext: () => AudioContext;
  render: (kind: Soundscape, sampleRate: number) => Promise<AudioBuffer>;
  /** Subscribe to the start of an emergency (SOS). */
  onEmergency: (cb: () => void) => () => void;
}

const FADE = 0.35; // seconds, time constant for fades
const gainFor = (v: number) => v * v * 0.9; // feels linear to the ear

export function createAmbientEngine(deps: EngineDeps) {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let source: AudioBufferSourceNode | null = null;
  const cache = new Map<Soundscape, AudioBuffer>();
  const listeners = new Set<() => void>();
  let state: AmbientState = { kind: null, playing: false, loading: false, volume: 0.5, pausedForEmergency: false };

  const set = (patch: Partial<AmbientState>) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  };

  function ensure(): { ctx: AudioContext; master: GainNode } {
    if (!ctx || !master) {
      ctx = deps.createContext();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
    }
    return { ctx, master };
  }

  function stopSource(now = false) {
    if (!source || !ctx) return;
    const s = source;
    source = null;
    try {
      s.stop(now ? 0 : ctx.currentTime + FADE * 4);
    } catch {
      /* already stopped */
    }
  }

  async function play(kind: Soundscape) {
    const { ctx: c, master: m } = ensure();
    if (c.state === "suspended") await c.resume();
    set({ kind, loading: !cache.has(kind), pausedForEmergency: false });
    let buffer = cache.get(kind);
    if (!buffer) {
      buffer = await deps.render(kind, c.sampleRate);
      cache.set(kind, buffer);
    }
    if (state.kind !== kind) return; // switched to something else while this one was being made
    stopSource();
    const next = c.createBufferSource();
    next.buffer = buffer;
    next.loop = true;
    next.connect(m);
    next.start();
    source = next;
    m.gain.setTargetAtTime(gainFor(state.volume), c.currentTime, FADE);
    set({ playing: true, loading: false });
  }

  function pause() {
    if (ctx && master) master.gain.setTargetAtTime(0, ctx.currentTime, FADE / 3);
    stopSource();
    set({ playing: false, loading: false });
  }

  function setVolume(v: number) {
    const volume = Math.min(1, Math.max(0, v));
    if (ctx && master && state.playing) master.gain.setTargetAtTime(gainFor(volume), ctx.currentTime, 0.08);
    set({ volume });
  }

  /** A soft rising or falling tone that paces breathing. */
  function cue(step: "in" | "hold" | "out", ms: number) {
    if (step === "hold" || state.pausedForEmergency) return;
    const { ctx: c } = ensure();
    if (c.state === "suspended") void c.resume();
    const t = c.currentTime;
    const d = Math.max(0.5, ms / 1000);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    const [from, to] = step === "in" ? [196, 261.63] : [261.63, 196];
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.linearRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.14 * Math.max(0.25, state.volume), t + Math.min(1.2, d / 3));
    g.gain.setTargetAtTime(0, t + d * 0.75, d * 0.1);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + d + 0.6);
  }

  deps.onEmergency(() => {
    if (!state.playing && !state.loading) return;
    if (ctx && master) master.gain.cancelScheduledValues(ctx.currentTime);
    if (master) master.gain.value = 0;
    stopSource(true);
    set({ playing: false, loading: false, pausedForEmergency: true });
  });

  return {
    play,
    pause,
    setVolume,
    cue,
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type AmbientEngine = ReturnType<typeof createAmbientEngine>;
