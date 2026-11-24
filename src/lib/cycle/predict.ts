import { addDays, compareIso, diffDays, formatDay } from "@/lib/dates";
import { cycleLengths, derivePeriods } from "./derive";
import { clamp, mean, median, sampleSd } from "./stats";
import type { DayLog, Phase, Prediction } from "./types";

/** FIGO 2018 normal limits used for gentle, non-diagnostic flags. */
export const FIGO = { minCycle: 24, maxCycle: 38, maxVariation: 9, maxPeriodDays: 8 } as const;
const LUTEAL_DAYS = 14;
const MAX_CYCLES = 12;

/**
 * Transparent statistical prediction:
 * - centre: median of recent cycle lengths (mean when fewer than 3)
 * - window: ±1.5 SD (2–10 days) with 3+ cycles, ±3 with 2, ±4 with 1 or a typical length
 * - confidence from how many cycles there are and how much they vary
 * Never presented as contraception.
 */
export function predict(
  logs: DayLog[],
  today: string,
  opts: { typicalCycleLength?: number | null; typicalPeriodLength?: number | null } = {},
): Prediction {
  const periods = derivePeriods(logs);
  const last = periods[periods.length - 1];
  const base: Prediction = { status: "none", basis: "none", message: "", cyclesUsed: 0, irregular: false, irregularReasons: [], late: false };

  if (!last) {
    return { ...base, message: "Log the first day of your period and BLOOM will start learning your cycle." };
  }

  const { used } = cycleLengths(periods);
  const recent = used.slice(-MAX_CYCLES);
  const n = recent.length;

  let center: number;
  let half: number;
  let confidence: Prediction["confidence"];
  let basis: Prediction["basis"];
  let sd: number | undefined;
  let variability: number | undefined;

  if (n === 0) {
    if (!opts.typicalCycleLength) {
      return {
        ...base,
        lastPeriod: last,
        cycleDay: compareIso(today, last.start) >= 0 ? diffDays(last.start, today) + 1 : undefined,
        message: "Log your next period start and BLOOM can estimate the one after it.",
      };
    }
    center = opts.typicalCycleLength;
    half = 4;
    confidence = "low";
    basis = "typical";
  } else {
    center = Math.round(n >= 3 ? median(recent) : mean(recent));
    sd = n >= 3 ? sampleSd(recent) : undefined;
    half = n >= 3 ? clamp(Math.round(1.5 * (sd ?? 0)), 2, 10) : n === 2 ? 3 : 4;
    variability = n >= 2 ? Math.max(...recent) - Math.min(...recent) : undefined;
    confidence = n >= 6 && (variability ?? 0) <= 7 ? "high" : n >= 3 && (variability ?? 0) <= FIGO.maxVariation ? "medium" : "low";
    basis = "history";
  }

  const irregularReasons: string[] = [];
  if (n >= 3) {
    if ((variability ?? 0) > FIGO.maxVariation) {
      irregularReasons.push(`Your cycles have varied by ${variability} days between the shortest and longest.`);
    }
    if (recent.some((l) => l < FIGO.minCycle)) irregularReasons.push(`Some of your cycles were shorter than ${FIGO.minCycle} days.`);
    if (recent.some((l) => l > FIGO.maxCycle)) irregularReasons.push(`Some of your cycles were longer than ${FIGO.maxCycle} days.`);
  }

  const nextStart = addDays(last.start, center);
  const windowStart = addDays(nextStart, -half);
  const windowEnd = addDays(nextStart, half);
  const ovulationEstimate = addDays(nextStart, -LUTEAL_DAYS);
  const fertileWindow = { start: addDays(ovulationEstimate, -5), end: addDays(ovulationEstimate, 1) };
  const late = compareIso(today, windowEnd) > 0;
  const daysLate = late ? diffDays(nextStart, today) : undefined;
  const cycleDay = compareIso(today, last.start) >= 0 ? diffDays(last.start, today) + 1 : undefined;

  let phase: Phase | undefined;
  if (compareIso(today, last.start) >= 0) {
    if (compareIso(today, last.end) <= 0) phase = "menstrual";
    else if (late) phase = "late";
    else if (compareIso(today, fertileWindow.start) < 0) phase = "follicular";
    else if (compareIso(today, fertileWindow.end) <= 0) phase = "fertile";
    else phase = "luteal";
  }

  const periodLengths = periods.slice(-MAX_CYCLES).map((p) => p.length);
  const periodLengthEstimate = periodLengths.length >= 2 ? Math.round(median(periodLengths)) : (opts.typicalPeriodLength ?? periodLengths[0]);

  const range = `${formatDay(windowStart)} and ${formatDay(windowEnd)}`;
  const message = late
    ? `Your period was expected around ${formatDay(nextStart)}. If it has started, log it to keep predictions accurate.`
    : `Your next period may start around ${formatDay(nextStart)}, most likely between ${range}.`;

  return {
    status: "estimate",
    basis,
    message,
    nextStart,
    windowStart,
    windowEnd,
    confidence,
    cyclesUsed: n,
    medianCycle: n > 0 ? center : undefined,
    sd: sd === undefined ? undefined : Math.round(sd * 10) / 10,
    variability,
    irregular: irregularReasons.length > 0,
    irregularReasons,
    late,
    daysLate,
    cycleDay,
    phase,
    ovulationEstimate,
    fertileWindow,
    periodLengthEstimate,
    lastPeriod: last,
  };
}
