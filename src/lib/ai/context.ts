import "server-only";
import { predict } from "@/lib/cycle/predict";
import { getDayLogs } from "@/lib/cycle/repo";
import { MOOD_LABEL, PHASE_LABEL, SYMPTOM_LABEL } from "@/lib/cycle/types";
import { addDays, isoToday } from "@/lib/dates";
import type { Profile } from "@/lib/profile";
import type { CycleContext } from "./prompt";

/** A short cycle summary for Mochi — only built when the user allowed it. */
export async function cycleContextFor(userId: string, profile: Profile): Promise<CycleContext | undefined> {
  const today = isoToday(profile.timeZone);
  const logs = await getDayLogs(userId, addDays(today, -400), today);
  if (logs.length === 0) return undefined;
  const p = predict(logs, today, { typicalCycleLength: profile.typicalCycleLength, typicalPeriodLength: profile.typicalPeriodLength });
  const weekAgo = addDays(today, -7);
  const recent = logs.filter((l) => l.date >= weekAgo);
  return {
    cycleDay: p.cycleDay,
    phase: p.phase ? PHASE_LABEL[p.phase].toLowerCase() : undefined,
    windowStart: p.windowStart,
    windowEnd: p.windowEnd,
    confidence: p.confidence,
    late: p.late,
    recentSymptoms: [...new Set(recent.flatMap((l) => l.symptoms.map((s) => SYMPTOM_LABEL[s].toLowerCase())))],
    recentMoods: [...new Set(recent.flatMap((l) => l.moods.map((m) => MOOD_LABEL[m].toLowerCase())))],
  };
}
