import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { consent } from "@/lib/db/schema";
import { CONSENT_PURPOSES, CONSENT_VERSION, type ConsentPurpose } from "./consent-copy";

export { CONSENT_PURPOSES, CONSENT_COPY, CONSENT_VERSION, type ConsentPurpose } from "./consent-copy";

/** Appends a choice. History is never rewritten; the latest row per purpose is current. */
export async function setConsent(userId: string, purpose: ConsentPurpose, granted: boolean) {
  await getDb().insert(consent).values({ userId, purpose, granted, version: CONSENT_VERSION });
}

export async function getConsents(userId: string): Promise<Record<ConsentPurpose, boolean>> {
  const rows = await getDb()
    .select({ purpose: consent.purpose, granted: consent.granted })
    .from(consent)
    .where(eq(consent.userId, userId))
    .orderBy(asc(consent.createdAt), asc(consent.id));
  const current = Object.fromEntries(CONSENT_PURPOSES.map((p) => [p, false])) as Record<ConsentPurpose, boolean>;
  for (const row of rows) {
    if ((CONSENT_PURPOSES as readonly string[]).includes(row.purpose)) current[row.purpose as ConsentPurpose] = row.granted;
  }
  return current;
}

export async function hasConsent(userId: string, purpose: ConsentPurpose): Promise<boolean> {
  const [row] = await getDb()
    .select({ granted: consent.granted })
    .from(consent)
    .where(and(eq(consent.userId, userId), eq(consent.purpose, purpose)))
    .orderBy(desc(consent.createdAt), desc(consent.id))
    .limit(1);
  return row?.granted ?? false;
}

export async function consentHistory(userId: string) {
  return getDb()
    .select({ purpose: consent.purpose, granted: consent.granted, version: consent.version, createdAt: consent.createdAt })
    .from(consent)
    .where(eq(consent.userId, userId))
    .orderBy(asc(consent.createdAt), asc(consent.id));
}
