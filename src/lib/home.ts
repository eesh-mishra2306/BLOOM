/** The home screen's words: a greeting from the companion, and one thing worth knowing today. */
import { KNOWLEDGE, type KnowledgeEntry } from "@/lib/ai/knowledge";
import type { Phase } from "@/lib/cycle/types";
import { diffDays } from "@/lib/dates";

export interface HomeContext {
  name: string;
  /** Local hour, 0–23. */
  hour: number;
  journey?: boolean;
  lastMood?: { mood: number; hoursAgo: number } | null;
  phase?: Phase | null;
  daysToPeriod?: number | null;
}

export function homeGreeting(ctx: HomeContext): { title: string; line: string } {
  const h = ctx.hour;
  const part = h >= 5 && h < 12 ? "Good morning" : h >= 12 && h < 17 ? "Good afternoon" : h >= 17 && h < 22 ? "Good evening" : "Hello";
  const title = `${part}, ${ctx.name}`;
  if (ctx.journey) return { title, line: "You're on a journey. I'll keep an eye on the time with you. Check in when you can." };
  if (ctx.lastMood && ctx.lastMood.mood <= 2 && ctx.lastMood.hoursAgo <= 24)
    return { title, line: "Your last check-in sounded hard. I'm here if you want to talk, or we can just breathe for a minute." };
  if (ctx.phase === "menstrual") return { title, line: "Period days can be rough. A warm drink and an easy pace count as looking after yourself." };
  if (ctx.daysToPeriod !== null && ctx.daysToPeriod !== undefined && ctx.daysToPeriod >= 0 && ctx.daysToPeriod <= 2)
    return { title, line: "Your period may start in the next couple of days. Might be worth keeping supplies handy." };
  if (h >= 5 && h < 12) return { title, line: "I'm glad you're here. What would make today a little easier?" };
  if (h >= 12 && h < 17) return { title, line: "Hope the day is being kind to you. Remember to drink some water." };
  if (h >= 17 && h < 22) return { title, line: "How did today go? I'm all ears if you want to tell me." };
  return { title, line: "It's late. Be gentle with yourself tonight." };
}

const NOT_TIPS = new Set(["safety-india", "mental-health-india", "not-contraception", "pregnancy-test"]);
const FOR_PHASE: Partial<Record<Phase, string[]>> = {
  menstrual: ["period-pain", "heavy-periods", "iron-tiredness"],
  luteal: ["pms", "breathing-stress", "normal-cycle"],
  late: ["irregular-periods", "normal-cycle"],
};

/** One reading for today: the same all day, and suited to the cycle phase when there's one. */
export function dailyTip(phase: Phase | null | undefined, today: string): KnowledgeEntry {
  const ids = (phase && FOR_PHASE[phase]) || KNOWLEDGE.map((k) => k.id).filter((id) => !NOT_TIPS.has(id));
  const day = Math.abs(diffDays("2026-01-01", today));
  return KNOWLEDGE.find((k) => k.id === ids[day % ids.length]) ?? KNOWLEDGE[0];
}

/** Hours since a moment, for "how recent was that check-in". */
export function hoursSince(d: Date, now: Date = new Date()): number {
  return (now.getTime() - d.getTime()) / 3_600_000;
}
