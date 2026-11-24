"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { setConsent } from "@/lib/consent";

export async function setMoodGarden(granted: boolean): Promise<{ ok: true }> {
  const user = await requireUser();
  await setConsent(user.id, "mood_bloomverse", granted);
  revalidatePath("/bloomverse");
  revalidatePath("/privacy");
  return { ok: true };
}
