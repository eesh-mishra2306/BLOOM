"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { CONSENT_PURPOSES, setConsent } from "@/lib/consent";
import { upsertDayLog } from "@/lib/cycle/repo";
import { addDays, compareIso, diffDays, isValidIsoDate, isoToday } from "@/lib/dates";
import { updateProfile } from "@/lib/profile";

const schema = z.object({
  displayName: z.string().trim().min(1, "Tell Mochi what to call you").max(40),
  companionSpecies: z.enum(["kitten", "puppy", "bunny", "bear"]),
  companionName: z.string().trim().min(1).max(20),
  companionColor: z.enum(["cream", "peach", "blush", "lilac", "cocoa", "snow"]),
  country: z.string().min(2).max(5),
  timeZone: z.string().min(1).max(64),
  consents: z.object(Object.fromEntries(CONSENT_PURPOSES.map((p) => [p, z.boolean()])) as Record<(typeof CONSENT_PURPOSES)[number], z.ZodBoolean>),
  cycle: z.object({
    lastPeriodStart: z.string().refine(isValidIsoDate).optional(),
    typicalCycleLength: z.number().int().min(15).max(90).optional(),
    typicalPeriodLength: z.number().int().min(1).max(15).optional(),
  }),
});

export type OnboardingInput = z.infer<typeof schema>;

export async function completeOnboarding(input: OnboardingInput): Promise<{ error: string }> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Some answers need another look." };
  const data = parsed.data;

  let timeZone = data.timeZone;
  try {
    new Intl.DateTimeFormat("en", { timeZone });
  } catch {
    timeZone = "Asia/Kolkata";
  }
  const today = isoToday(timeZone);
  const { lastPeriodStart, typicalCycleLength, typicalPeriodLength } = data.cycle;
  if (lastPeriodStart && (compareIso(lastPeriodStart, today) > 0 || diffDays(lastPeriodStart, today) > 180)) {
    return { error: "Pick a start date from the last six months, not in the future." };
  }

  try {
    await updateProfile(user.id, {
      displayName: data.displayName,
      companionSpecies: data.companionSpecies,
      companionName: data.companionName,
      companionColor: data.companionColor,
      country: data.country,
      timeZone,
      typicalCycleLength: typicalCycleLength ?? null,
      typicalPeriodLength: typicalPeriodLength ?? null,
    });
    for (const purpose of CONSENT_PURPOSES) await setConsent(user.id, purpose, data.consents[purpose]);
    if (lastPeriodStart) {
      const days = typicalPeriodLength ?? 5;
      for (let i = 0; i < days; i++) {
        const date = addDays(lastPeriodStart, i);
        if (compareIso(date, today) > 0) break;
        await upsertDayLog(user.id, { date, flow: "unspecified", cramps: 0, moods: [], symptoms: [] });
      }
    }
    await updateProfile(user.id, { onboardedAt: new Date() });
  } catch (err) {
    console.error("onboarding failed", err instanceof Error ? err.message : err);
    return { error: "BLOOM couldn't save your answers. Check your connection and try again." };
  }
  redirect("/dashboard");
}
