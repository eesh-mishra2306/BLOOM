import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import { cycleLengths, derivePeriods } from "@/lib/cycle/derive";
import { computeInsights } from "@/lib/cycle/insights";
import { predict } from "@/lib/cycle/predict";
import type { DayLog, Flow } from "@/lib/cycle/types";

const day = (date: string, flow: Flow, extra: Partial<DayLog> = {}): DayLog => ({ date, flow, cramps: 0, moods: [], symptoms: [], ...extra });

/** A period of `length` bleeding days starting on `start`. */
const period = (start: string, length = 5, flow: Flow = "medium") =>
  Array.from({ length }, (_, i) => day(addDays(start, i), flow));

/** Periods starting at day offsets from 2026-01-01. */
const periodsAt = (offsets: number[], length = 5) => offsets.flatMap((o) => period(addDays("2026-01-01", o), length));

describe("derivePeriods", () => {
  it("groups consecutive bleeding days into one period", () => {
    expect(derivePeriods(period("2026-03-01", 5))).toEqual([{ start: "2026-03-01", end: "2026-03-05", length: 5 }]);
  });

  it("keeps a single unlogged day inside one period", () => {
    const logs = [day("2026-03-01", "heavy"), day("2026-03-02", "medium"), day("2026-03-04", "light"), day("2026-03-05", "light")];
    expect(derivePeriods(logs)).toEqual([{ start: "2026-03-01", end: "2026-03-05", length: 5 }]);
  });

  it("splits periods separated by more than one day", () => {
    const logs = [...period("2026-03-01", 3), ...period("2026-03-29", 4)];
    expect(derivePeriods(logs).map((p) => p.start)).toEqual(["2026-03-01", "2026-03-29"]);
  });

  it("never starts a period from spotting alone", () => {
    expect(derivePeriods([day("2026-03-10", "spotting"), day("2026-03-11", "spotting")])).toEqual([]);
  });

  it("starts the period on the first full-flow day and lets trailing spotting extend it", () => {
    const logs = [day("2026-03-01", "spotting"), day("2026-03-02", "medium"), day("2026-03-03", "light"), day("2026-03-04", "spotting")];
    expect(derivePeriods(logs)).toEqual([{ start: "2026-03-02", end: "2026-03-04", length: 3 }]);
  });

  it("treats a period day with unspecified flow as bleeding", () => {
    expect(derivePeriods([day("2026-03-01", "unspecified")])).toHaveLength(1);
  });
});

describe("cycleLengths", () => {
  it("excludes gaps that are probably missed logs", () => {
    const periods = derivePeriods(periodsAt([0, 28, 123, 151]));
    expect(cycleLengths(periods)).toEqual({ used: [28, 28], excluded: [95] });
  });
});

describe("predict", () => {
  it("has nothing to say without any logs", () => {
    const p = predict([], "2026-03-01");
    expect(p.status).toBe("none");
  });

  it("asks for another period when only one is logged and no typical length is known", () => {
    const p = predict(period("2026-03-01"), "2026-03-10");
    expect(p.status).toBe("none");
    expect(p.message).toMatch(/log/i);
  });

  it("estimates from a typical cycle length with low confidence when there is one period", () => {
    const p = predict(period("2026-03-01"), "2026-03-10", { typicalCycleLength: 30 });
    expect(p).toMatchObject({ status: "estimate", basis: "typical", nextStart: "2026-03-31", windowStart: "2026-03-27", windowEnd: "2026-04-04", confidence: "low" });
  });

  it("uses the mean and a ±3 day window with two cycles", () => {
    const p = predict(periodsAt([0, 28, 58]), "2026-03-05");
    expect(p.nextStart).toBe(addDays("2026-01-01", 58 + 29));
    expect(p.windowStart).toBe(addDays(p.nextStart!, -3));
    expect(p.confidence).toBe("low");
  });

  it("predicts +28 with a tight window and high confidence for six regular cycles", () => {
    const p = predict(periodsAt([0, 28, 56, 84, 112, 140, 168]), "2026-06-20");
    expect(p.medianCycle).toBe(28);
    expect(p.nextStart).toBe(addDays("2026-01-01", 196));
    expect(p.windowStart).toBe(addDays("2026-01-01", 194));
    expect(p.windowEnd).toBe(addDays("2026-01-01", 198));
    expect(p.confidence).toBe("high");
    expect(p.irregular).toBe(false);
  });

  it("uses the median so one long cycle doesn't drag the estimate", () => {
    const p = predict(periodsAt([0, 28, 56, 84, 124]), "2026-05-10");
    expect(p.medianCycle).toBe(28);
  });

  it("marks cycles irregular when shortest and longest differ by more than 9 days", () => {
    const p = predict(periodsAt([0, 26, 64, 94]), "2026-04-10");
    expect(p.variability).toBe(12);
    expect(p.irregular).toBe(true);
    expect(p.irregularReasons.join(" ")).toMatch(/12 days/);
    expect(p.confidence).toBe("low");
  });

  it("flags cycles outside the 24–38 day range", () => {
    const p = predict(periodsAt([0, 22, 44, 66]), "2026-03-15");
    expect(p.irregular).toBe(true);
    expect(p.irregularReasons.join(" ")).toMatch(/shorter than 24/);
  });

  it("reports a late period once today is past the window", () => {
    const logs = periodsAt([0, 28, 56, 84]);
    const p = predict(logs, addDays("2026-01-01", 84 + 28 + 6));
    expect(p.late).toBe(true);
    expect(p.daysLate).toBe(6);
  });

  it("estimates ovulation 14 days before the next period and a six-day fertile window", () => {
    const p = predict(periodsAt([0, 28, 56, 84]), "2026-03-30");
    expect(p.ovulationEstimate).toBe(addDays(p.nextStart!, -14));
    expect(p.fertileWindow).toEqual({ start: addDays(p.nextStart!, -19), end: addDays(p.nextStart!, -13) });
  });

  it("reports the cycle day and the menstrual phase during a period", () => {
    const p = predict(periodsAt([0, 28, 56]), addDays("2026-01-01", 57));
    expect(p.cycleDay).toBe(2);
    expect(p.phase).toBe("menstrual");
  });
});

describe("computeInsights", () => {
  it("summarises cycles, periods and the most common symptoms", () => {
    const logs = periodsAt([0, 28, 57]).map((l, i) => (i % 5 === 0 ? { ...l, symptoms: ["cramps" as const], cramps: 3 as const } : l));
    logs.push(day("2026-01-15", "none", { symptoms: ["headache"], moods: ["tired"] }));
    const ins = computeInsights(logs, "2026-03-05");
    expect(ins.cyclesTracked).toBe(2);
    expect(ins.averageCycle).toBe(28.5);
    expect(ins.averagePeriod).toBe(5);
    expect(ins.topSymptoms[0]).toEqual({ symptom: "cramps", days: 3 });
    expect(ins.topMoods[0]).toEqual({ mood: "tired", days: 1 });
    expect(ins.longPeriods).toBe(0);
  });

  it("counts periods longer than 8 days", () => {
    const ins = computeInsights(period("2026-01-01", 10), "2026-01-20");
    expect(ins.longPeriods).toBe(1);
  });
});
