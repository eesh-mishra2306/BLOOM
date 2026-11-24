import { diffDays } from "@/lib/dates";

export const PROMPTS = [
  "What's one thing that went better than you expected today?",
  "What does your body need more of this week?",
  "Who made you feel cared for recently?",
  "What's taking up the most space in your head right now?",
  "What would you tell a friend who felt the way you do today?",
  "What's something small you're looking forward to?",
  "When did you feel most like yourself this week?",
  "What could you let go of for tonight?",
  "What made you laugh lately?",
  "What's one kind thing you did for yourself today?",
];

/** The same prompt all day, a new one tomorrow. */
export function reflectionPrompt(today: string): string {
  return PROMPTS[((diffDays("2026-01-01", today) % PROMPTS.length) + PROMPTS.length) % PROMPTS.length];
}
