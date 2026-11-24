import { compareIso, diffDays } from "@/lib/dates";
import type { DayLog, Period } from "./types";

const BLEEDING = new Set(["light", "medium", "heavy", "unspecified"]);

/**
 * Turns day logs into periods.
 * - Bleeding (light/medium/heavy/unspecified) starts and extends a period.
 * - Spotting extends a period it touches but never starts one; leading spotting isn't day 1.
 * - One unlogged day between bleeding days doesn't split a period (gap ≤ 2 days).
 */
export function derivePeriods(logs: DayLog[]): Period[] {
  const days = logs
    .filter((l) => BLEEDING.has(l.flow) || l.flow === "spotting")
    .sort((a, b) => compareIso(a.date, b.date));

  const periods: Period[] = [];
  let group: DayLog[] = [];

  const close = () => {
    const firstBleed = group.findIndex((d) => BLEEDING.has(d.flow));
    if (firstBleed >= 0) {
      const start = group[firstBleed].date;
      const end = group[group.length - 1].date;
      periods.push({ start, end, length: diffDays(start, end) + 1 });
    }
    group = [];
  };

  for (const d of days) {
    const prev = group[group.length - 1];
    if (prev && diffDays(prev.date, d.date) > 2) close();
    group.push(d);
  }
  if (group.length) close();
  return periods;
}

/** Start-to-start lengths. Gaps under 15 or over 90 days are probably missed logs, so they're set aside. */
export function cycleLengths(periods: Period[]): { used: number[]; excluded: number[] } {
  const used: number[] = [];
  const excluded: number[] = [];
  for (let i = 1; i < periods.length; i++) {
    const len = diffDays(periods[i - 1].start, periods[i].start);
    (len >= 15 && len <= 90 ? used : excluded).push(len);
  }
  return { used, excluded };
}
