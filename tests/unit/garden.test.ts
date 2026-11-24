import { describe, expect, it } from "vitest";
import { ambientFromMoods, placeFlowers, sceneForHour, speciesFor, type GrowthActivity } from "@/lib/garden/growth";

const acts = (n: number, start = 0): GrowthActivity[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `a${i + start}-${(i + start) * 7919}`,
    kind: (["breathing", "mood", "journal", "cycle_log", "goal"] as const)[(i + start) % 5],
    at: new Date(Date.UTC(2026, 10, 1) + (i + start) * 3_600_000).toISOString(),
  }));
const opts = { radius: 4.6, minSpacing: 0.34, keepClear: [{ x: 0, z: 0, r: 1 }] };
const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

describe("speciesFor", () => {
  it("grows a different flower for each kind of activity", () => {
    expect(speciesFor("breathing")).toBe("lavender");
    expect(speciesFor("mood")).toBe("daisy");
    expect(speciesFor("journal")).toBe("rose");
    expect(speciesFor("cycle_log")).toBe("tulip");
    expect(speciesFor("goal")).toBe("marigold");
  });
});

describe("placeFlowers", () => {
  it("gives the same layout for the same activities, in any order", () => {
    const a = acts(60);
    expect(placeFlowers(a, opts)).toEqual(placeFlowers([...a].reverse(), opts));
  });

  it("keeps every flower apart, inside the island and out of Mochi's spot", () => {
    const flowers = placeFlowers(acts(300), opts);
    expect(flowers.length).toBeGreaterThan(250);
    for (let i = 0; i < flowers.length; i++) {
      expect(Math.hypot(flowers[i].x, flowers[i].z)).toBeLessThanOrEqual(opts.radius);
      expect(Math.hypot(flowers[i].x, flowers[i].z)).toBeGreaterThanOrEqual(1);
      for (let j = i + 1; j < flowers.length; j++) expect(dist(flowers[i], flowers[j])).toBeGreaterThanOrEqual(opts.minSpacing);
    }
  });

  it("never moves existing flowers when a new one grows", () => {
    const before = placeFlowers(acts(40), opts);
    const after = placeFlowers([...acts(40), ...acts(1, 40)], opts);
    expect(after.slice(0, 40)).toEqual(before);
    expect(after).toHaveLength(41);
  });
});

describe("ambientFromMoods", () => {
  const now = new Date("2026-11-24T12:00:00Z");
  const moods = (values: number[]) => values.map((mood, i) => ({ mood, createdAt: new Date(now.getTime() - i * 86_400_000) }));

  it("needs consent", () => {
    expect(ambientFromMoods(moods([5, 5]), false, now)).toBeNull();
  });

  it("needs recent check-ins", () => {
    expect(ambientFromMoods([], true, now)).toBeNull();
    expect(ambientFromMoods([{ mood: 5, createdAt: new Date("2026-10-01T00:00:00Z") }], true, now)).toBeNull();
  });

  it("follows how the week has felt", () => {
    expect(ambientFromMoods(moods([5, 4, 4]), true, now)).toBe("golden");
    expect(ambientFromMoods(moods([3, 4, 3]), true, now)).toBe("dawn");
    expect(ambientFromMoods(moods([2, 3, 2]), true, now)).toBe("dusk");
    expect(ambientFromMoods(moods([1, 2, 1]), true, now)).toBe("moon");
  });
});

describe("sceneForHour", () => {
  it("matches the sky to the time of day", () => {
    expect([4, 5, 10, 11, 16, 17, 19, 20, 23].map(sceneForHour)).toEqual(["moon", "dawn", "dawn", "golden", "golden", "dusk", "dusk", "moon", "moon"]);
  });
});
