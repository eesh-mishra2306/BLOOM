import { describe, expect, it } from "vitest";
import { INITIAL_MOCHI, mochiReducer, type MochiState } from "@/components/mochi/behaviour";

const run = (events: Parameters<typeof mochiReducer>[1][], from: MochiState = INITIAL_MOCHI) => events.reduce(mochiReducer, from);

describe("mochiReducer", () => {
  it("starts awake and visible", () => {
    expect(INITIAL_MOCHI).toMatchObject({ expression: "idle", hidden: false });
  });

  it("gets sleepy, then falls asleep, when nothing happens", () => {
    expect(run(["idle"]).expression).toBe("sleepy");
    expect(run(["idle", "idle"]).expression).toBe("asleep");
  });

  it("wakes up happy when tapped while asleep", () => {
    const s = run(["idle", "idle", "tap"]);
    expect(s.expression).toBe("happy");
    expect(s.transient).toBe(true);
    expect(s.bounce).toBe(1);
  });

  it("returns to idle when a happy moment times out", () => {
    expect(run(["tap", "timeout"]).expression).toBe("idle");
  });

  it("listens, thinks and talks through a chat turn", () => {
    expect(run(["chat-sent"]).expression).toBe("thinking");
    expect(run(["chat-sent", "chat-streaming"]).expression).toBe("talking");
    const done = run(["chat-sent", "chat-streaming", "chat-done"]);
    expect(done.expression).toBe("happy");
    expect(done.transient).toBe(true);
  });

  it("stays comforting after a worrying message until the next turn", () => {
    const s = run(["chat-sent", "concern", "chat-done", "timeout"]);
    expect(s.expression).toBe("comforting");
    expect(run(["chat-sent"], s).expression).toBe("thinking");
  });

  it("doesn't nod off in the middle of a conversation", () => {
    expect(run(["chat-sent", "idle"]).expression).toBe("thinking");
  });

  it("disappears during an emergency and comes back afterwards", () => {
    const hidden = run(["emergency-start"]);
    expect(hidden.hidden).toBe(true);
    expect(run(["tap"], hidden).hidden).toBe(true);
    const back = run(["emergency-end"], hidden);
    expect(back.hidden).toBe(false);
    expect(back.expression).toBe("idle");
  });
});
