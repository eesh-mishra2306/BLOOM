/**
 * Original soundscapes, synthesised offline in the browser (OfflineAudioContext) and looped.
 * Rendering ahead of time means playback doesn't depend on timers, so it keeps going smoothly
 * in a background tab.
 */
import type { Soundscape } from "./ambient-engine";

const LOOP: Record<Soundscape, number> = { rain: 12, ocean: 12, forest: 16, pads: 24, noise: 6 };
const XFADE = 1.5;

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Color = "white" | "pink" | "brown";

function noise(ctx: BaseAudioContext, seconds: number, color: Color, rand: () => number): AudioBufferSourceNode {
  const length = Math.ceil(seconds * ctx.sampleRate);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const out = buffer.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < length; i++) {
      const w = rand() * 2 - 1;
      if (color === "white") out[i] = w * 0.5;
      else if (color === "pink") {
        // Paul Kellet's pink filter
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else {
        last = (last + 0.02 * w) / 1.02;
        out[i] = last * 3.5;
      }
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  return src;
}

function filter(ctx: BaseAudioContext, type: BiquadFilterType, frequency: number, q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = q;
  return f;
}

function gain(ctx: BaseAudioContext, value: number) {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

/** A slow sine that wobbles an AudioParam by ±depth. */
function lfo(ctx: BaseAudioContext, param: AudioParam, hz: number, depth: number, phase = 0) {
  const osc = ctx.createOscillator();
  osc.frequency.value = hz;
  const g = gain(ctx, depth);
  osc.connect(g);
  g.connect(param);
  osc.start(phase / hz);
  return osc;
}

function chain(...nodes: AudioNode[]) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  return nodes[nodes.length - 1];
}

function rain(ctx: OfflineAudioContext, seconds: number, rand: () => number) {
  const bed = noise(ctx, seconds, "pink", rand);
  chain(bed, filter(ctx, "highpass", 450), filter(ctx, "lowpass", 6500), gain(ctx, 0.55), ctx.destination);
  bed.start();
  const drop = ctx.createBuffer(1, Math.ceil(0.04 * ctx.sampleRate), ctx.sampleRate);
  const d = drop.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (rand() * 2 - 1) * Math.exp(-i / (d.length / 5));
  for (let t = 0.02; t < seconds - 0.05; t += 0.012 + rand() * 0.05) {
    const s = ctx.createBufferSource();
    s.buffer = drop;
    const heavy = rand() < 0.06;
    const pan = ctx.createStereoPanner();
    pan.pan.value = rand() * 1.6 - 0.8;
    chain(s, filter(ctx, "bandpass", heavy ? 700 + rand() * 400 : 1500 + rand() * 4000, heavy ? 3 : 1.4), gain(ctx, heavy ? 0.5 : 0.08 + rand() * 0.22), pan, ctx.destination);
    s.start(t);
  }
}

function ocean(ctx: OfflineAudioContext, seconds: number, rand: () => number) {
  const wave = 1 / 6; // two waves per 12 s loop
  const body = noise(ctx, seconds, "brown", rand);
  const low = filter(ctx, "lowpass", 600);
  const swell = gain(ctx, 0.32);
  chain(body, low, swell, ctx.destination);
  lfo(ctx, low.frequency, wave, 380);
  lfo(ctx, swell.gain, wave, 0.24);
  body.start();
  const foam = noise(ctx, seconds, "pink", rand);
  const foamGain = gain(ctx, 0.05);
  const pan = ctx.createStereoPanner();
  pan.pan.value = 0.3;
  chain(foam, filter(ctx, "highpass", 1400), foamGain, pan, ctx.destination);
  lfo(ctx, foamGain.gain, wave, 0.045, 1.2);
  foam.start();
}

function forest(ctx: OfflineAudioContext, seconds: number, rand: () => number) {
  const wind = noise(ctx, seconds, "pink", rand);
  const windGain = gain(ctx, 0.22);
  chain(wind, filter(ctx, "bandpass", 520, 0.5), windGain, ctx.destination);
  lfo(ctx, windGain.gain, 1 / 8, 0.1);
  wind.start();
  const leaves = noise(ctx, seconds, "white", rand);
  chain(leaves, filter(ctx, "highpass", 3200), gain(ctx, 0.018), ctx.destination);
  leaves.start();
  // Bird calls: short gliding whistles in little phrases.
  for (let t = 0.6 + rand(); t < seconds - 1.5; t += 1.4 + rand() * 2.6) {
    const notes = 2 + Math.floor(rand() * 4);
    const base = 2300 + rand() * 1600;
    const pan = ctx.createStereoPanner();
    pan.pan.value = rand() * 1.8 - 0.9;
    pan.connect(ctx.destination);
    let at = t;
    for (let n = 0; n < notes; n++) {
      const osc = ctx.createOscillator();
      const env = gain(ctx, 0);
      const len = 0.05 + rand() * 0.08;
      const from = base * (0.9 + rand() * 0.2);
      osc.frequency.setValueAtTime(from, at);
      osc.frequency.exponentialRampToValueAtTime(from * (1.15 + rand() * 0.35), at + len);
      env.gain.setValueAtTime(0, at);
      env.gain.linearRampToValueAtTime(0.025 + rand() * 0.03, at + len * 0.3);
      env.gain.linearRampToValueAtTime(0, at + len);
      chain(osc, env, pan);
      osc.start(at);
      osc.stop(at + len + 0.02);
      at += len + 0.06 + rand() * 0.1;
    }
  }
}

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);

function pads(ctx: OfflineAudioContext, seconds: number, rand: () => number) {
  // Fmaj7 → Dm9 → B♭maj7 → C6/9, six seconds each.
  const chords = [
    [53, 57, 60, 64],
    [50, 53, 57, 60, 64],
    [46, 50, 53, 57],
    [48, 55, 57, 62],
  ];
  const out = gain(ctx, 0.9);
  const tone = filter(ctx, "lowpass", 1700, 0.4);
  // A small hall: a convolver fed with decaying noise.
  const verb = ctx.createConvolver();
  const ir = ctx.createBuffer(2, Math.ceil(3 * ctx.sampleRate), ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < d.length; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / d.length, 2.6);
  }
  verb.buffer = ir;
  tone.connect(out);
  tone.connect(verb);
  chain(verb, gain(ctx, 0.3), out);
  out.connect(ctx.destination);
  chords.forEach((notes, c) => {
    const start = c * 6;
    for (const n of notes) {
      for (const [type, detune, level] of [
        ["sine", 0, 0.05],
        ["triangle", 4, 0.022],
      ] as const) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = midi(n);
        osc.detune.value = detune + (rand() * 4 - 2);
        const env = gain(ctx, 0);
        env.gain.setValueAtTime(0, start);
        env.gain.linearRampToValueAtTime(level, start + 2.2);
        env.gain.setValueAtTime(level, start + 5.2);
        env.gain.linearRampToValueAtTime(0, Math.min(seconds, start + 7.8));
        chain(osc, env, tone);
        osc.start(start);
        osc.stop(Math.min(seconds, start + 8));
      }
    }
  });
}

function whiteNoise(ctx: OfflineAudioContext, seconds: number, rand: () => number) {
  const n = noise(ctx, seconds, "white", rand);
  chain(n, filter(ctx, "lowpass", 9000), gain(ctx, 0.3), ctx.destination);
  n.start();
}

const BUILD = { rain, ocean, forest, pads, noise: whiteNoise } satisfies Record<Soundscape, (ctx: OfflineAudioContext, s: number, r: () => number) => void>;

/** Blends the extra tail into the start, so the loop point can't be heard. */
function seamless(src: AudioBuffer, loopSeconds: number, fadeSeconds: number): AudioBuffer {
  const sr = src.sampleRate;
  const L = Math.floor(loopSeconds * sr);
  const X = Math.floor(fadeSeconds * sr);
  const out = new AudioBuffer({ length: L, numberOfChannels: src.numberOfChannels, sampleRate: sr });
  for (let ch = 0; ch < src.numberOfChannels; ch++) {
    const s = src.getChannelData(ch);
    const o = out.getChannelData(ch);
    o.set(s.subarray(0, L));
    for (let i = 0; i < X; i++) {
      const k = i / X;
      o[i] = s[i] * Math.sqrt(k) + s[L + i] * Math.sqrt(1 - k);
    }
  }
  return out;
}

export async function renderSoundscape(kind: Soundscape, sampleRate: number): Promise<AudioBuffer> {
  const seconds = LOOP[kind] + XFADE;
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  BUILD[kind](ctx, seconds, seeded(kind.length * 7919 + 17));
  const rendered = await ctx.startRendering();
  return seamless(rendered, LOOP[kind], XFADE);
}
