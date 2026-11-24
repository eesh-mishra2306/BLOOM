import { describe, expect, it } from "vitest";
import { createAmbientEngine } from "@/lib/audio/ambient-engine";

function fakeAudio() {
  const calls: string[] = [];
  const param = () => ({ value: 0, setTargetAtTime() {}, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} });
  const node = () => ({ connect: (n: unknown) => n, disconnect() {} });
  const ctx = {
    state: "running" as AudioContextState,
    currentTime: 0,
    sampleRate: 44_100,
    destination: {},
    createGain: () => ({ ...node(), gain: param() }),
    createOscillator: () => ({ ...node(), type: "sine", frequency: param(), start() {}, stop() {} }),
    createBufferSource: () => ({ ...node(), buffer: null, loop: false, start: () => calls.push("start"), stop: () => calls.push("stop") }),
    resume: async () => {
      calls.push("resume");
      ctx.state = "running";
    },
    suspend: async () => {
      calls.push("suspend");
      ctx.state = "suspended";
    },
  };
  return { ctx, calls };
}

function setup() {
  const fake = fakeAudio();
  let emergency: () => void = () => {};
  const rendered: string[] = [];
  const engine = createAmbientEngine({
    createContext: () => fake.ctx as unknown as AudioContext,
    render: async (kind) => {
      rendered.push(kind);
      return {} as AudioBuffer;
    },
    onEmergency: (cb) => {
      emergency = cb;
      return () => {};
    },
  });
  return { engine, fake, rendered, emergency: () => emergency() };
}

describe("ambient engine", () => {
  it("does nothing until someone presses play", () => {
    const { engine, fake } = setup();
    expect(engine.getState()).toMatchObject({ kind: null, playing: false });
    expect(fake.calls).toEqual([]);
  });

  it("plays a soundscape and renders each one only once", async () => {
    const { engine, rendered } = setup();
    await engine.play("rain");
    expect(engine.getState()).toMatchObject({ kind: "rain", playing: true, loading: false });
    await engine.play("ocean");
    await engine.play("rain");
    expect(rendered).toEqual(["rain", "ocean"]);
  });

  it("stops at once when an emergency starts, and doesn't restart by itself", async () => {
    const { engine, fake, emergency } = setup();
    await engine.play("forest");
    emergency();
    expect(engine.getState()).toMatchObject({ playing: false, pausedForEmergency: true });
    expect(fake.calls).toContain("stop");
  });

  it("keeps the volume between 0 and 1", async () => {
    const { engine } = setup();
    engine.setVolume(3);
    expect(engine.getState().volume).toBe(1);
    engine.setVolume(-1);
    expect(engine.getState().volume).toBe(0);
  });
});
