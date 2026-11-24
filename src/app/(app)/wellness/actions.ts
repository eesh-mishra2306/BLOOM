"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { isoToday } from "@/lib/dates";
import { ensureProfile } from "@/lib/profile";
import { recordActivity } from "@/lib/wellness/activity";
import { addGoal, archiveGoal, completeGoal, saveMood, type MoodInput } from "@/lib/wellness/repo";

type Result = { ok: true } | { ok: false; error: string };

function refresh() {
  revalidatePath("/wellness");
  revalidatePath("/dashboard");
  revalidatePath("/bloomverse");
}

export async function logMood(input: MoodInput): Promise<Result> {
  const user = await requireUser();
  try {
    await saveMood(user.id, input);
  } catch {
    return { ok: false, error: "Couldn't save your check-in. Try again." };
  }
  refresh();
  return { ok: true };
}

export async function finishBreathing(seconds: number): Promise<{ grew: boolean }> {
  const user = await requireUser();
  // A flower grows for a session of a minute or more.
  if (!Number.isFinite(seconds) || seconds < 60) return { grew: false };
  await recordActivity(user.id, "breathing");
  refresh();
  return { grew: true };
}

export async function addWellnessGoal(label: string, icon: string): Promise<Result> {
  const user = await requireUser();
  try {
    await addGoal(user.id, { label, icon });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't add that goal." };
  }
  refresh();
  return { ok: true };
}

export async function markGoalDone(goalId: string): Promise<Result> {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  try {
    await completeGoal(user.id, goalId, isoToday(profile.timeZone));
  } catch {
    return { ok: false, error: "That goal doesn't exist any more." };
  }
  refresh();
  return { ok: true };
}

export async function removeGoal(goalId: string): Promise<Result> {
  const user = await requireUser();
  await archiveGoal(user.id, goalId);
  refresh();
  return { ok: true };
}
