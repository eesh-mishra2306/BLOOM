import { describe, expect, it } from "vitest";
import { dailyTip, homeGreeting } from "@/lib/home";

const base = { name: "Asha", hour: 9 };

describe("homeGreeting", () => {
  it("greets by the time of day", () => {
    expect(homeGreeting({ ...base, hour: 7 }).title).toBe("Good morning, Asha");
    expect(homeGreeting({ ...base, hour: 14 }).title).toBe("Good afternoon, Asha");
    expect(homeGreeting({ ...base, hour: 19 }).title).toBe("Good evening, Asha");
    expect(homeGreeting({ ...base, hour: 2 }).title).toBe("Hello, Asha");
  });

  it("puts an active journey first", () => {
    const g = homeGreeting({ ...base, journey: true, lastMood: { mood: 1, hoursAgo: 2 }, phase: "menstrual" });
    expect(g.line).toMatch(/journey/i);
  });

  it("notices a hard check-in from the last day", () => {
    expect(homeGreeting({ ...base, lastMood: { mood: 2, hoursAgo: 5 } }).line).toMatch(/hard/i);
    expect(homeGreeting({ ...base, lastMood: { mood: 2, hoursAgo: 40 } }).line).not.toMatch(/hard/i);
  });

  it("mentions a period that may start soon, gently", () => {
    expect(homeGreeting({ ...base, daysToPeriod: 1 }).line).toMatch(/period may start/i);
    expect(homeGreeting({ ...base, daysToPeriod: 6 }).line).not.toMatch(/period/i);
  });
});

describe("dailyTip", () => {
  it("leans towards period comfort during a period", () => {
    expect(["period-pain", "heavy-periods", "iron-tiredness"]).toContain(dailyTip("menstrual", "2026-11-24").id);
  });

  it("changes from day to day but is stable within a day", () => {
    expect(dailyTip(null, "2026-11-24").id).toBe(dailyTip(null, "2026-11-24").id);
    const week = new Set(["2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27"].map((d) => dailyTip(null, d).id));
    expect(week.size).toBeGreaterThan(1);
  });

  it("never offers the emergency or crisis entries as a daily tip", () => {
    for (let d = 1; d <= 28; d++) {
      const id = dailyTip(null, `2026-11-${String(d).padStart(2, "0")}`).id;
      expect(["safety-india", "mental-health-india"]).not.toContain(id);
    }
  });
});
