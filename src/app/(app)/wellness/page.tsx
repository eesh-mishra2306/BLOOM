import { BookHeart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BreathingExercise } from "@/components/wellness/breathing-exercise";
import { Goals } from "@/components/wellness/goals";
import { MoodCheckin } from "@/components/wellness/mood-checkin";
import { MoodIcon, moodLabel } from "@/components/wellness/mood-faces";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/ui/glass";
import { requireOnboardedUser } from "@/lib/auth/session";
import { isoToday } from "@/lib/dates";
import { listGoals, listMoods } from "@/lib/wellness/repo";
import { reflectionPrompt } from "@/lib/wellness/prompts";

export const metadata: Metadata = { title: "Wellness" };

export default async function WellnessPage() {
  const { user, profile } = await requireOnboardedUser("/wellness");
  const today = isoToday(profile.timeZone);
  const [moods, goals] = await Promise.all([listMoods(user.id, 7), listGoals(user.id, today)]);
  const prompt = reflectionPrompt(today);

  return (
    <div className="space-y-5">
      <h1 className="text-4xl">Wellness</h1>
      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <Glass tier={1} petal id="mood" className="scroll-mt-24 space-y-4">
          <h2 className="text-2xl">How are you feeling?</h2>
          <MoodCheckin country={profile.country} />
          {moods.length ? (
            <div className="border-t border-line pt-4">
              <p className="mb-2 text-sm font-semibold text-muted">Your last check-ins</p>
              <ul className="flex gap-2 overflow-x-auto">
                {moods.map((m) => (
                  <li key={m.id} className="flex min-w-14 flex-col items-center rounded-2xl bg-accent-soft px-2 py-2 text-heading" title={moodLabel(m.mood)}>
                    <MoodIcon value={m.mood} className="size-6" />
                    <span className="mt-1 text-[0.7rem] text-muted">{m.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: profile.timeZone })}</span>
                    <span className="sr-only">{moodLabel(m.mood)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Glass>
        <Glass tier={2} className="space-y-3">
          <h2 className="text-2xl">Gentle goals</h2>
          <Goals goals={goals} />
        </Glass>
      </div>

      <Glass tier={2} id="breathe" className="scroll-mt-24">
        <h2 className="mb-4 text-2xl">Breathe</h2>
        <BreathingExercise />
      </Glass>

      <Glass tier={3} className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-semibold text-muted">Today&apos;s reflection</p>
          <p className="font-display text-xl text-heading">{prompt}</p>
        </div>
        <Button asChild variant="secondary">
          <Link href={`/journal?prompt=${encodeURIComponent(prompt)}`}>
            <BookHeart aria-hidden /> Write about it
          </Link>
        </Button>
      </Glass>
    </div>
  );
}
