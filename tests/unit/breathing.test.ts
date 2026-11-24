import { describe, expect, it } from "vitest";
import { BREATHING_PATTERNS, cycleMs, phaseAt } from "@/lib/wellness/breathing";

describe("breathing patterns", () => {
  it("starts with breathing in", () => {
    expect(phaseAt(BREATHING_PATTERNS.box, 0)).toMatchObject({ kind: "in", remainingMs: 4000, cycle: 0 });
  });

  it("moves through each step of box breathing", () => {
    expect(phaseAt(BREATHING_PATTERNS.box, 4500)).toMatchObject({ kind: "hold", remainingMs: 3500 });
    expect(phaseAt(BREATHING_PATTERNS.box, 8000).kind).toBe("out");
    expect(phaseAt(BREATHING_PATTERNS.box, 12000).kind).toBe("hold");
  });

  it("loops into the next cycle", () => {
    expect(phaseAt(BREATHING_PATTERNS.box, 16000)).toMatchObject({ kind: "in", cycle: 1 });
  });

  it("breathes out for longer than in on the slow pattern", () => {
    const slow = BREATHING_PATTERNS.slow;
    expect(cycleMs(slow)).toBe(10000);
    const p = phaseAt(slow, 5000);
    expect(p.kind).toBe("out");
    expect(p.progress).toBeCloseTo(1 / 6, 5);
  });

  it("times 4-7-8 at 19 seconds a cycle", () => {
    expect(cycleMs(BREATHING_PATTERNS.calm)).toBe(19000);
  });

  it("includes the second short breath in of a sigh", () => {
    expect(phaseAt(BREATHING_PATTERNS.sigh, 2500).label).toMatch(/little more/i);
  });
});
