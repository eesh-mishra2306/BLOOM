"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { deleteDayLog, upsertDayLog } from "@/lib/cycle/repo";
import { dayLogSchema, type DayLog } from "@/lib/cycle/types";
import { addDays, compareIso, isoToday } from "@/lib/dates";
import { ensureProfile, updateProfile } from "@/lib/profile";

type Result = { ok: true } | { ok: false; error: string };

export async function saveDayLog(input: DayLog): Promise<Result> {
  const user = await requireUser();
  const parsed = dayLogSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Some of that didn't look right. Check the entries and try again." };
  const profile = await ensureProfile(user.id);
  // Allow tomorrow to absorb time-zone edges, never further ahead.
  if (compareIso(parsed.data.date, addDays(isoToday(profile.timeZone), 1)) > 0) {
    return { ok: false, error: "You can't log days in the future." };
  }
  try {
    await upsertDayLog(user.id, parsed.data);
  } catch {
    return { ok: false, error: "BLOOM couldn't save this day. Check your connection and try again." };
  }
  revalidatePath("/cycle");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function removeDayLog(date: string): Promise<Result> {
  const user = await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "That date isn't valid." };
  await deleteDayLog(user.id, date);
  revalidatePath("/cycle");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setFertileWindowVisible(visible: boolean): Promise<Result> {
  const user = await requireUser();
  await updateProfile(user.id, { showFertileWindow: visible });
  revalidatePath("/cycle");
  return { ok: true };
}
