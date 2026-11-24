"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addMemory } from "@/lib/ai/memory";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/session";
import { hasConsent, setConsent } from "@/lib/consent";
import { profilePatchSchema, updateProfile } from "@/lib/profile";

type Result = { ok: true } | { ok: false; error: string };

/** The user explicitly turns on AI chat from Mochi's panel. */
export async function allowMochiChat(): Promise<Result> {
  const user = await requireUser();
  await setConsent(user.id, "ai_chat", true);
  await audit(user.id, "consent.changed", { purpose: "ai_chat", granted: true });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function rememberForMochi(text: string): Promise<Result> {
  const user = await requireUser();
  if (!(await hasConsent(user.id, "ai_memory"))) {
    return { ok: false, error: "Turn on “Let Mochi remember things you save” in Privacy first." };
  }
  const clean = z.string().trim().min(1).max(280).safeParse(text);
  if (!clean.success) return { ok: false, error: "Notes for Mochi can be up to 280 characters." };
  try {
    await addMemory(user.id, clean.data);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't save that note." };
  }
  revalidatePath("/privacy");
  return { ok: true };
}

const companionPatch = profilePatchSchema.pick({
  companionName: true,
  companionSpecies: true,
  companionColor: true,
  companionAccessory: true,
  companionPersonality: true,
  companionLanguage: true,
});

export async function updateCompanion(patch: z.input<typeof companionPatch>): Promise<Result> {
  const user = await requireUser();
  const parsed = companionPatch.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "That change didn't look right." };
  await updateProfile(user.id, parsed.data);
  revalidatePath("/", "layout");
  return { ok: true };
}
