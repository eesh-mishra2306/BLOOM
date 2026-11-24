import { cycleLengths, derivePeriods } from "./derive";
import { FIGO } from "./predict";
import { mean } from "./stats";
import type { DayLog, Mood, Symptom } from "./types";

export interface Insights {
  cyclesTracked: number;
  averageCycle?: number;
  shortestCycle?: number;
  longestCycle?: number;
  averagePeriod?: number;
  longPeriods: number;
  daysLogged: number;
  topSymptoms: { symptom: Symptom; days: number }[];
  topMoods: { mood: Mood; days: number }[];
  heavyCrampDays: number;
  /** Change in average cycle length, last 3 cycles vs the 3 before. */
  trend?: number;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

export function computeInsights(logs: DayLog[], _today: string): Insights {
  const periods = derivePeriods(logs);
  const { used } = cycleLengths(periods);
  const symptomCounts = new Map<Symptom, number>();
  const moodCounts = new Map<Mood, number>();
  for (const l of logs) {
    for (const s of l.symptoms) symptomCounts.set(s, (symptomCounts.get(s) ?? 0) + 1);
    for (const m of l.moods) moodCounts.set(m, (moodCounts.get(m) ?? 0) + 1);
  }
  const byCount = <K>(m: Map<K, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return {
    cyclesTracked: used.length,
    averageCycle: used.length ? round1(mean(used)) : undefined,
    shortestCycle: used.length ? Math.min(...used) : undefined,
    longestCycle: used.length ? Math.max(...used) : undefined,
    averagePeriod: periods.length ? round1(mean(periods.map((p) => p.length))) : undefined,
    longPeriods: periods.filter((p) => p.length > FIGO.maxPeriodDays).length,
    daysLogged: logs.length,
    topSymptoms: byCount(symptomCounts).map(([symptom, days]) => ({ symptom, days })),
    topMoods: byCount(moodCounts).map(([mood, days]) => ({ mood, days })),
    heavyCrampDays: logs.filter((l) => l.cramps === 3).length,
    trend: used.length >= 6 ? round1(mean(used.slice(-3)) - mean(used.slice(-6, -3))) : undefined,
  };
}
