import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { profile } from "@/lib/db/schema";
import { isSupportedCountry } from "@/lib/safety/emergency-numbers";

export type Profile = typeof profile.$inferSelect;

const timeZone = z.string().refine((tz) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}, "Unknown time zone");

export const profilePatchSchema = z
  .object({
    displayName: z.string().trim().max(40),
    country: z.string().refine((c) => c === "OTHER" || isSupportedCountry(c), "Unsupported country"),
    timeZone,
    companionName: z.string().trim().min(1).max(20),
    companionSpecies: z.enum(["kitten", "puppy", "bunny", "bear"]),
    companionColor: z.enum(["cream", "peach", "blush", "lilac", "cocoa", "snow"]),
    companionAccessory: z.enum(["none", "flower", "bow"]),
    companionPersonality: z.enum(["gentle", "playful", "calm"]),
    companionLanguage: z.enum(["en", "hinglish"]),
    sosCountdownSeconds: z.number().int().min(0).max(10),
    sosMessage: z.string().trim().max(240).nullable(),
    showFertileWindow: z.boolean(),
    typicalCycleLength: z.number().int().min(15).max(90).nullable(),
    typicalPeriodLength: z.number().int().min(1).max(15).nullable(),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{6,20}$/, "Enter a phone number with digits only")
      .nullable(),
    onboardedAt: z.date().nullable(),
  })
  .partial();

export type ProfilePatch = z.infer<typeof profilePatchSchema>;

export async function getProfile(userId: string): Promise<Profile | null> {
  const [row] = await getDb().select().from(profile).where(eq(profile.userId, userId)).limit(1);
  return row ?? null;
}

/** The user's profile, created with defaults if it doesn't exist yet. */
export async function ensureProfile(userId: string): Promise<Profile> {
  const existing = await getProfile(userId);
  if (existing) return existing;
  await getDb().insert(profile).values({ userId }).onConflictDoNothing();
  return (await getProfile(userId))!;
}

export async function updateProfile(userId: string, patch: ProfilePatch): Promise<Profile> {
  const values = profilePatchSchema.parse(patch);
  await ensureProfile(userId);
  if (Object.keys(values).length > 0) {
    await getDb().update(profile).set(values).where(eq(profile.userId, userId));
  }
  return (await getProfile(userId))!;
}
