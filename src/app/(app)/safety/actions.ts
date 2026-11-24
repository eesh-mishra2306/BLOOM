"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/session";
import { setConsent } from "@/lib/consent";
import { getEnv } from "@/lib/env";
import { profilePatchSchema, updateProfile } from "@/lib/profile";
import { rateLimit } from "@/lib/rate-limit";
import { addContact, removeContact, renewInvite, type ContactInput } from "@/lib/safety/contacts";
import { emergencyInfoSchema, saveEmergencyInfo, type EmergencyInfo } from "@/lib/safety/emergency-info";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const inviteUrl = (token: string) => new URL(`/circle/accept/${token}`, getEnv().BETTER_AUTH_URL).toString();

export async function addTrustedContact(input: ContactInput): Promise<Result<{ inviteUrl: string }>> {
  const user = await requireUser();
  const limit = await rateLimit(`contact-add:${user.id}`, 20, 3600);
  if (!limit.ok) return { ok: false, error: "You've added a lot of contacts recently. Try again later." };
  try {
    const { inviteToken } = await addContact(user.id, input);
    await audit(user.id, "contact.invited");
    revalidatePath("/safety");
    return { ok: true, inviteUrl: inviteUrl(inviteToken) };
  } catch (err) {
    if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? "Check the contact details." };
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't add that contact." };
  }
}

export async function newInviteLink(contactId: string): Promise<Result<{ inviteUrl: string }>> {
  const user = await requireUser();
  const token = await renewInvite(user.id, contactId);
  if (!token) return { ok: false, error: "This contact has already accepted." };
  revalidatePath("/safety");
  return { ok: true, inviteUrl: inviteUrl(token) };
}

export async function removeTrustedContact(contactId: string): Promise<Result> {
  const user = await requireUser();
  await removeContact(user.id, contactId);
  await audit(user.id, "contact.removed");
  revalidatePath("/safety");
  return { ok: true };
}

const sosSettings = profilePatchSchema.pick({ sosCountdownSeconds: true, sosMessage: true, phone: true });

export async function saveSosSettings(input: z.input<typeof sosSettings>): Promise<Result> {
  const user = await requireUser();
  const parsed = sosSettings.safeParse({
    ...input,
    sosMessage: input.sosMessage?.trim() ? input.sosMessage.trim() : null,
    phone: input.phone?.trim() ? input.phone.trim() : null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check those settings." };
  await updateProfile(user.id, parsed.data);
  revalidatePath("/safety");
  return { ok: true };
}

export async function setSosLocation(granted: boolean): Promise<Result> {
  const user = await requireUser();
  await setConsent(user.id, "location_sos", granted);
  await audit(user.id, "consent.changed", { purpose: "location_sos", granted });
  revalidatePath("/safety");
  return { ok: true };
}

export async function saveEmergencyDetails(input: EmergencyInfo): Promise<Result> {
  const user = await requireUser();
  const parsed = emergencyInfoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Some fields are too long." };
  await saveEmergencyInfo(user.id, parsed.data);
  revalidatePath("/safety");
  return { ok: true };
}
