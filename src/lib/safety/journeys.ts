import "server-only";
import { createHmac } from "node:crypto";
import { and, desc, eq, inArray, isNotNull, isNull, lt, lte, or } from "drizzle-orm";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { hasConsent } from "@/lib/consent";
import { openJson, sealJson } from "@/lib/crypto/user-keys";
import { getDb } from "@/lib/db/client";
import { journey, profile } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { displayNameOf } from "@/lib/user-name";
import { listContacts } from "./contacts";
import { pushToUser } from "./devices";
import { dispatchAlerts, type DeliveryView, type PushSender } from "./dispatch";
import { isLive, journeyActions, nextDueAfterCheckIn, SHARE_AFTER_END_MS, SHARE_AFTER_ETA_MS, type JourneyStatus } from "./journey-rules";
import type { Fix } from "./links";
import { locationSchema } from "./sos";
import { hashToken } from "./tokens";

export class JourneyError extends Error {
  constructor(
    public code: "invalid" | "already_active" | "unknown_contact" | "not_found",
    message: string,
  ) {
    super(message);
  }
}

export const journeyInputSchema = z.object({
  destination: z.string().trim().min(1, "Say where you're going").max(80),
  minutes: z.number().int().min(5).max(720),
  checkInEveryMin: z.union([z.literal(10), z.literal(15), z.literal(30)]).nullable(),
  contactIds: z.array(z.string().uuid()).min(1, "Choose at least one person").max(8),
  shareLocation: z.boolean(),
});
export type JourneyInput = z.input<typeof journeyInputSchema>;

const destinationSchema = z.object({ label: z.string() });
type Row = typeof journey.$inferSelect;

export interface JourneyView {
  id: string;
  status: JourneyStatus;
  destination: string;
  startedAt: Date;
  expectedArrivalAt: Date;
  checkInIntervalMin: number | null;
  nextCheckInDueAt: Date;
  graceMinutes: number;
  lastCheckInAt: Date | null;
  escalatedAt: Date | null;
  endedAt: Date | null;
  shareLocation: boolean;
  lastLocation: Fix | null;
  contactIds: string[];
  sharePath: string;
}

/** The follow-along link is derived from the journey id with a server secret, so it never needs storing. */
export function journeyShareToken(journeyId: string): string {
  return createHmac("sha256", getEnv().BETTER_AUTH_SECRET).update(`bloom.journey-share.v1:${journeyId}`).digest("base64url");
}

async function toView(row: Row): Promise<JourneyView> {
  const destination = await openJson(row.userId, "destination", row.destination, destinationSchema).catch(() => ({ label: "" }));
  const lastLocation = row.lastLocation ? await openJson(row.userId, "location", row.lastLocation, locationSchema).catch(() => null) : null;
  return {
    id: row.id,
    status: row.status,
    destination: destination.label,
    startedAt: row.startedAt,
    expectedArrivalAt: row.expectedArrivalAt,
    checkInIntervalMin: row.checkInIntervalMin,
    nextCheckInDueAt: row.nextCheckInDueAt,
    graceMinutes: row.graceMinutes,
    lastCheckInAt: row.lastCheckInAt,
    escalatedAt: row.escalatedAt,
    endedAt: row.endedAt,
    shareLocation: row.shareLocation,
    lastLocation,
    contactIds: row.contactIds,
    sharePath: `/j/${journeyShareToken(row.id)}`,
  };
}

async function timeZoneOf(userId: string) {
  const [p] = await getDb().select({ timeZone: profile.timeZone }).from(profile).where(eq(profile.userId, userId)).limit(1);
  return p?.timeZone ?? "Asia/Kolkata";
}

export const clockTime = (d: Date, timeZone: string) => d.toLocaleTimeString("en-IN", { timeZone, hour: "numeric", minute: "2-digit" });

export async function startJourney(userId: string, raw: JourneyInput, sender: PushSender | null, now = new Date()) {
  const parsed = journeyInputSchema.safeParse(raw);
  if (!parsed.success) throw new JourneyError("invalid", parsed.error.issues[0]?.message ?? "Check the journey details.");
  const input = parsed.data;
  if (await getActiveJourney(userId)) throw new JourneyError("already_active", "You already have a journey running. End it before starting another.");
  const mine = new Set((await listContacts(userId)).map((c) => c.id));
  if (!input.contactIds.every((id) => mine.has(id))) throw new JourneyError("unknown_contact", "Choose people from your trusted circle.");

  const id = crypto.randomUUID();
  const eta = new Date(now.getTime() + input.minutes * 60_000);
  const firstDue = input.checkInEveryMin ? new Date(Math.min(eta.getTime(), now.getTime() + input.checkInEveryMin * 60_000)) : eta;
  const shareLocation = input.shareLocation && (await hasConsent(userId, "location_journey"));
  const [row] = await getDb()
    .insert(journey)
    .values({
      id,
      userId,
      destination: await sealJson(userId, "destination", { label: input.destination }),
      contactIds: [...new Set(input.contactIds)],
      startedAt: now,
      expectedArrivalAt: eta,
      checkInIntervalMin: input.checkInEveryMin,
      nextCheckInDueAt: firstDue,
      shareLocation,
      shareTokenHash: hashToken(journeyShareToken(id)),
      shareExpiresAt: new Date(eta.getTime() + SHARE_AFTER_ETA_MS),
    })
    .returning();
  const view = await toView(row);
  const deliveries = await dispatchAlerts({
    userId,
    kind: "journey_start",
    sender,
    url: view.sharePath,
    journeyId: id,
    contactIds: view.contactIds,
    detail: clockTime(eta, await timeZoneOf(userId)),
  });
  return { journey: view, deliveries };
}

export async function getActiveJourney(userId: string): Promise<JourneyView | null> {
  const [row] = await getDb()
    .select()
    .from(journey)
    .where(and(eq(journey.userId, userId), inArray(journey.status, ["active", "escalated"])))
    .orderBy(desc(journey.startedAt))
    .limit(1);
  return row ? toView(row) : null;
}

export async function getJourney(userId: string, id: string): Promise<JourneyView | null> {
  if (!z.string().uuid().safeParse(id).success) return null;
  const [row] = await getDb()
    .select()
    .from(journey)
    .where(and(eq(journey.id, id), eq(journey.userId, userId)))
    .limit(1);
  return row ? toView(row) : null;
}

export async function recentJourneys(userId: string, limit = 5): Promise<JourneyView[]> {
  const rows = await getDb().select().from(journey).where(eq(journey.userId, userId)).orderBy(desc(journey.startedAt)).limit(limit);
  return Promise.all(rows.map(toView));
}

async function liveRow(userId: string, id: string): Promise<Row> {
  if (!z.string().uuid().safeParse(id).success) throw new JourneyError("not_found", "That journey doesn't exist.");
  const [row] = await getDb()
    .select()
    .from(journey)
    .where(and(eq(journey.id, id), eq(journey.userId, userId), inArray(journey.status, ["active", "escalated"])))
    .limit(1);
  if (!row) throw new JourneyError("not_found", "That journey has already ended.");
  return row;
}

/** After a missed check-in, the contacts deserve to hear exactly what happened next — no more. */
async function tellContactsAfterMiss(row: Row, sender: PushSender | null, text: (name: string) => { title: string; body: string }) {
  if (row.status !== "escalated") return;
  await dispatchAlerts({ userId: row.userId, kind: "safe", sender, url: `/j/${journeyShareToken(row.id)}`, journeyId: row.id, contactIds: row.contactIds, text });
}

export async function checkIn(userId: string, id: string, sender: PushSender | null, now = new Date()): Promise<JourneyView> {
  const row = await liveRow(userId, id);
  const [updated] = await getDb()
    .update(journey)
    .set({ status: "active", lastCheckInAt: now, nextCheckInDueAt: nextDueAfterCheckIn(row, now) })
    .where(eq(journey.id, row.id))
    .returning();
  await tellContactsAfterMiss(row, sender, (name) => ({
    title: `${name} checked in`,
    body: `${name} checked in from their phone after missing one. The journey is still going.`,
  }));
  return toView(updated);
}

export async function extendJourney(userId: string, id: string, minutes: number, sender: PushSender | null, now = new Date()): Promise<JourneyView> {
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 120) throw new JourneyError("invalid", "Add between 5 and 120 minutes.");
  const row = await liveRow(userId, id);
  const eta = new Date(Math.max(row.expectedArrivalAt.getTime(), now.getTime()) + minutes * 60_000);
  const [updated] = await getDb()
    .update(journey)
    .set({
      status: "active",
      expectedArrivalAt: eta,
      lastCheckInAt: now,
      nextCheckInDueAt: nextDueAfterCheckIn({ expectedArrivalAt: eta, checkInIntervalMin: row.checkInIntervalMin }, now),
      shareExpiresAt: new Date(eta.getTime() + SHARE_AFTER_ETA_MS),
    })
    .where(eq(journey.id, row.id))
    .returning();
  await tellContactsAfterMiss(row, sender, (name) => ({
    title: `${name} checked in`,
    body: `${name} added ${minutes} minutes to the journey from their phone.`,
  }));
  return toView(updated);
}

async function finish(userId: string, id: string, status: "arrived" | "ended", now: Date) {
  const row = await liveRow(userId, id);
  const [updated] = await getDb()
    .update(journey)
    .set({ status, endedAt: now, shareExpiresAt: new Date(now.getTime() + SHARE_AFTER_END_MS) })
    .where(eq(journey.id, row.id))
    .returning();
  return { row, updated };
}

export async function arrive(userId: string, id: string, sender: PushSender | null, now = new Date()) {
  const { row, updated } = await finish(userId, id, "arrived", now);
  const deliveries = await dispatchAlerts({ userId, kind: "arrived", sender, url: `/j/${journeyShareToken(row.id)}`, journeyId: row.id, contactIds: row.contactIds });
  return { journey: await toView(updated), deliveries };
}

export async function endJourney(userId: string, id: string, sender: PushSender | null, now = new Date()) {
  const { row, updated } = await finish(userId, id, "ended", now);
  await tellContactsAfterMiss(row, sender, (name) => ({ title: `${name} ended the journey`, body: `${name} ended the journey from their phone.` }));
  return toView(updated);
}

export async function updateJourneyLocation(userId: string, id: string, fix: Fix): Promise<boolean> {
  const loc = locationSchema.safeParse(fix);
  if (!loc.success || !z.string().uuid().safeParse(id).success) return false;
  const sealed = await sealJson(userId, "location", { ...loc.data, at: loc.data.at ?? Date.now() });
  const done = await getDb()
    .update(journey)
    .set({ lastLocation: sealed })
    .where(and(eq(journey.id, id), eq(journey.userId, userId), eq(journey.shareLocation, true), inArray(journey.status, ["active", "escalated"])))
    .returning({ id: journey.id });
  return done.length > 0;
}

export type SharedJourney = Omit<JourneyView, "contactIds" | "sharePath" | "shareLocation"> & {
  expired: false;
  name: string;
  phone: string | null;
  country: string;
  timeZone: string;
};

/** What a contact sees through the follow-along link. */
export async function journeyForShareToken(token: string, now = new Date()): Promise<SharedJourney | { expired: true } | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const [row] = await getDb().select().from(journey).where(eq(journey.shareTokenHash, hashToken(token))).limit(1);
  if (!row) return null;
  if (now.getTime() >= row.shareExpiresAt.getTime()) return { expired: true };
  return sharedView(row);
}

/** Runs the journey checks for whoever holds the follow-along link (a contact's page refresh). */
export async function checkJourneyByToken(token: string, now: Date, sender: PushSender | null) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return;
  const [row] = await getDb().select({ id: journey.id }).from(journey).where(eq(journey.shareTokenHash, hashToken(token))).limit(1);
  if (row) await processJourney(row.id, now, sender);
}

async function sharedView(row: Row): Promise<SharedJourney> {
  const [p] = await getDb().select().from(profile).where(eq(profile.userId, row.userId)).limit(1);
  const { contactIds: _c, sharePath: _s, shareLocation: _l, ...view } = await toView(row);
  return { ...view, expired: false, name: await displayNameOf(row.userId), phone: p?.phone ?? null, country: p?.country ?? "IN", timeZone: p?.timeZone ?? "Asia/Kolkata" };
}

type Summary = { prompted: number; escalated: number; expired: number };

/** Applies whatever is due for one journey. Each step claims the row first, so it runs once. */
async function processRow(row: Row, now: Date, sender: PushSender | null, summary: Summary) {
  const db = getDb();
  const live = and(eq(journey.id, row.id), eq(journey.nextCheckInDueAt, row.nextCheckInDueAt), inArray(journey.status, ["active", "escalated"]));
  for (const action of journeyActions({ ...row, hasLocation: row.lastLocation !== null }, now)) {
    if (action === "prompt_user") {
      const claimed = await db
        .update(journey)
        .set({ userPromptedAt: now })
        .where(and(live, or(isNull(journey.userPromptedAt), lt(journey.userPromptedAt, journey.nextCheckInDueAt))))
        .returning({ id: journey.id });
      if (!claimed.length) continue;
      summary.prompted++;
      await pushToUser(row.userId, sender, {
        kind: "checkin",
        // Lock screens are visible to others, so the wording stays neutral.
        title: "Check in now",
        body: `Tap “I’m okay” within ${row.graceMinutes} minutes.`,
        url: "/journey",
        tag: `checkin-${row.id}`,
        j: row.id,
      });
    } else if (action === "escalate") {
      const claimed = await db
        .update(journey)
        .set({ status: "escalated", escalatedAt: now })
        .where(and(live, or(isNull(journey.escalatedAt), lt(journey.escalatedAt, journey.nextCheckInDueAt))))
        .returning({ id: journey.id });
      if (!claimed.length) continue;
      summary.escalated++;
      await audit(row.userId, "journey.escalated");
      await dispatchAlerts({ userId: row.userId, kind: "journey_missed", sender, url: `/j/${journeyShareToken(row.id)}`, journeyId: row.id, contactIds: row.contactIds });
      await pushToUser(row.userId, sender, {
        kind: "checkin",
        title: "Please check in",
        body: "You missed a check-in, so your people were told. Tap “I’m okay” to let them know.",
        url: "/journey",
        tag: `checkin-${row.id}`,
        j: row.id,
      });
    } else {
      const closing = isLive(row.status) ? { status: "ended" as const, endedAt: now } : {};
      const done = await db
        .update(journey)
        .set({ ...closing, lastLocation: null })
        .where(and(eq(journey.id, row.id), lte(journey.shareExpiresAt, now)))
        .returning({ id: journey.id });
      summary.expired += done.length;
    }
  }
}

/**
 * The every-minute job: reminds travellers whose check-in is due, alerts contacts after the grace
 * period, and closes out expired links. Safe to run from overlapping schedulers.
 */
export async function processJourneys(now: Date, sender: PushSender | null): Promise<Summary> {
  const summary: Summary = { prompted: 0, escalated: 0, expired: 0 };
  const rows = await getDb()
    .select()
    .from(journey)
    .where(
      or(
        and(inArray(journey.status, ["active", "escalated"]), lte(journey.nextCheckInDueAt, now)),
        and(inArray(journey.status, ["arrived", "ended"]), isNotNull(journey.lastLocation), lte(journey.shareExpiresAt, now)),
      ),
    )
    .limit(500);
  for (const row of rows) await processRow(row, now, sender, summary);
  return summary;
}

/**
 * The same checks for one journey. Called whenever the traveller's screen or a contact's
 * follow-along page asks about it, so a missed check-in still escalates if the scheduler is late.
 */
export async function processJourney(id: string, now: Date, sender: PushSender | null): Promise<Summary> {
  const summary: Summary = { prompted: 0, escalated: 0, expired: 0 };
  if (!z.string().uuid().safeParse(id).success) return summary;
  const [row] = await getDb().select().from(journey).where(eq(journey.id, id)).limit(1);
  if (row) await processRow(row, now, sender, summary);
  return summary;
}

export type { DeliveryView };
