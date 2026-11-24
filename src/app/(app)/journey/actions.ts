"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { setConsent } from "@/lib/consent";
import { JourneyError, startJourney, type JourneyInput } from "@/lib/safety/journeys";
import { webPushSender } from "@/lib/safety/push";

type Started = { ok: true; alerted: string[]; notAlerted: string[] } | { ok: false; error: string };

export async function beginJourney(input: JourneyInput): Promise<Started> {
  const user = await requireUser();
  try {
    const { deliveries } = await startJourney(user.id, input, webPushSender());
    revalidatePath("/journey");
    revalidatePath("/dashboard");
    return {
      ok: true,
      alerted: deliveries.filter((d) => d.status === "sent").map((d) => d.contactName),
      notAlerted: deliveries.filter((d) => d.status !== "sent").map((d) => d.contactName),
    };
  } catch (err) {
    if (err instanceof JourneyError) return { ok: false, error: err.message };
    console.error("journey start failed", err);
    return { ok: false, error: "Couldn't start the journey. Check your connection and try again." };
  }
}

export async function allowJourneyLocation(granted: boolean): Promise<{ ok: true }> {
  const user = await requireUser();
  await setConsent(user.id, "location_journey", granted);
  revalidatePath("/journey");
  revalidatePath("/privacy");
  return { ok: true };
}
