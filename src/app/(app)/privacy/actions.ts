"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clearMemories, deleteMemory } from "@/lib/ai/memory";
import { audit } from "@/lib/audit";
import { getAuth } from "@/lib/auth/server";
import { requireUser } from "@/lib/auth/session";
import { setConsent } from "@/lib/consent";
import { CONSENT_PURPOSES, type ConsentPurpose } from "@/lib/consent-copy";
import { deleteAccount } from "@/lib/privacy";

export async function updateConsent(purpose: ConsentPurpose, granted: boolean): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!(CONSENT_PURPOSES as readonly string[]).includes(purpose)) return { ok: false };
  await setConsent(user.id, purpose, granted);
  await audit(user.id, "consent.changed", { purpose, granted });
  if (purpose === "ai_memory" && !granted) await clearMemories(user.id);
  revalidatePath("/privacy");
  revalidatePath("/companion");
  return { ok: true };
}

export async function forgetMemory(id: string) {
  const user = await requireUser();
  await deleteMemory(user.id, id);
  revalidatePath("/privacy");
}

export async function forgetAllMemories() {
  const user = await requireUser();
  await clearMemories(user.id);
  await audit(user.id, "memory.cleared");
  revalidatePath("/privacy");
}

export async function deleteMyAccount(password: string): Promise<{ ok: false; error: string }> {
  const user = await requireUser();
  const auth = getAuth();
  const h = await headers();
  try {
    await auth.api.verifyPassword({ body: { password }, headers: h });
  } catch {
    return { ok: false, error: "That password isn't right." };
  }
  await auth.api.signOut({ headers: h }).catch(() => undefined);
  await deleteAccount(user.id);
  redirect("/?deleted=1");
}
