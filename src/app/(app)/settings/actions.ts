"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { profilePatchSchema, updateProfile } from "@/lib/profile";

const settingsSchema = profilePatchSchema.pick({ displayName: true, country: true, timeZone: true, typicalCycleLength: true, typicalPeriodLength: true }).partial();

export async function saveProfileSettings(input: z.input<typeof settingsSchema>): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check those details." };
  await updateProfile(user.id, parsed.data);
  revalidatePath("/", "layout");
  return { ok: true };
}
