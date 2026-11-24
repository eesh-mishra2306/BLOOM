import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { setConsent } from "@/lib/consent";
import { getDb } from "@/lib/db/client";
import { alertDelivery, journey } from "@/lib/db/schema";
import { addUserDevice } from "@/lib/safety/devices";
import {
  arrive,
  checkIn,
  endJourney,
  extendJourney,
  getActiveJourney,
  JourneyError,
  journeyForShareToken,
  journeyShareToken,
  processJourney,
  processJourneys,
  startJourney,
  updateJourneyLocation,
} from "@/lib/safety/journeys";
import { createTestUser, resetDb } from "./helpers";
import { acceptedContact, fakeSender, sub } from "./safety-helpers";

const T0 = new Date("2026-11-24T15:00:00Z");
const at = (m: number) => new Date(T0.getTime() + m * 60_000);
const input = (contactIds: string[], over = {}) => ({ destination: "Home from the office", minutes: 30, checkInEveryMin: null, contactIds, shareLocation: true, ...over });
const fix = { lat: 12.9352, lng: 77.6245, accuracy: 20, at: T0.getTime() };

async function setup() {
  const userId = await createTestUser("asha@example.com", "Asha");
  const priya = await acceptedContact(userId, "Priya", "https://push.example/priya");
  const { sender, sent } = fakeSender();
  return { userId, priya, sender, sent };
}

describe("journeys", () => {
  beforeEach(resetDb);

  it("starts a journey, keeps the destination encrypted and tells the chosen contacts", async () => {
    const { userId, priya, sender, sent } = await setup();
    const { journey: j, deliveries } = await startJourney(userId, input([priya.id]), sender, T0);
    expect(j).toMatchObject({ status: "active", destination: "Home from the office", expectedArrivalAt: at(30), nextCheckInDueAt: at(30) });
    const [row] = await getDb().select().from(journey).where(eq(journey.id, j.id));
    expect(row.destination).not.toContain("office");
    expect(deliveries).toEqual([expect.objectContaining({ contactName: "Priya", status: "sent" })]);
    expect(sent[0].payload).toMatchObject({ kind: "journey_start", url: expect.stringContaining(`/j/${journeyShareToken(j.id)}`) });
  });

  it("allows one journey at a time and only the user's own contacts", async () => {
    const { userId, priya, sender } = await setup();
    const stranger = await acceptedContact(await createTestUser(), "Stranger");
    await expect(startJourney(userId, input([stranger.id]), sender, T0)).rejects.toThrow(JourneyError);
    await startJourney(userId, input([priya.id]), sender, T0);
    await expect(startJourney(userId, input([priya.id]), sender, T0)).rejects.toThrow(/already/);
  });

  it("prompts the traveller once when a check-in is due", async () => {
    const { userId, priya, sender, sent } = await setup();
    await addUserDevice(userId, sub("https://push.example/asha"));
    const { journey: j } = await startJourney(userId, input([priya.id]), sender, T0);
    sent.length = 0;
    expect(await processJourneys(at(29), sender)).toMatchObject({ prompted: 0, escalated: 0 });
    expect(await processJourneys(at(30), sender)).toMatchObject({ prompted: 1, escalated: 0 });
    expect(await processJourneys(at(31), sender)).toMatchObject({ prompted: 0 });
    expect(sent).toEqual([{ endpoint: "https://push.example/asha", payload: expect.objectContaining({ kind: "checkin", j: j.id }) }]);
  });

  it("alerts the contacts once after the grace period, and again only for a new missed check-in", async () => {
    const { userId, priya, sender, sent } = await setup();
    const { journey: j } = await startJourney(userId, input([priya.id], { checkInEveryMin: 10 }), sender, T0);
    expect(j.nextCheckInDueAt).toEqual(at(10));
    sent.length = 0;
    expect(await processJourneys(at(15), sender)).toMatchObject({ escalated: 1 });
    expect(await processJourneys(at(16), sender)).toMatchObject({ escalated: 0 });
    expect(sent.filter((s) => s.payload.kind === "journey_missed")).toHaveLength(1);
    expect((await getActiveJourney(userId))?.status).toBe("escalated");

    const back = await checkIn(userId, j.id, sender, at(17));
    expect(back).toMatchObject({ status: "active", nextCheckInDueAt: at(27) });
    expect(sent.at(-1)?.payload).toMatchObject({ kind: "safe", title: "Asha checked in" });
    expect(await processJourneys(at(32), sender)).toMatchObject({ escalated: 1 });
    const missed = await getDb().select().from(alertDelivery).where(eq(alertDelivery.kind, "journey_missed"));
    expect(missed).toHaveLength(2);
  });

  it("never alerts anyone after arrival, and says so to contacts", async () => {
    const { userId, priya, sender, sent } = await setup();
    const { journey: j } = await startJourney(userId, input([priya.id]), sender, T0);
    await arrive(userId, j.id, sender, at(25));
    expect(sent.at(-1)?.payload.kind).toBe("arrived");
    expect(await processJourneys(at(60), sender)).toMatchObject({ prompted: 0, escalated: 0 });
    expect(await getActiveJourney(userId)).toBeNull();
  });

  it("adds time to the journey", async () => {
    const { userId, priya, sender } = await setup();
    const { journey: j } = await startJourney(userId, input([priya.id]), sender, T0);
    const later = await extendJourney(userId, j.id, 10, sender, at(28));
    expect(later).toMatchObject({ expectedArrivalAt: at(40), nextCheckInDueAt: at(40) });
  });

  it("shares location only when asked, and forgets it an hour after the journey ends", async () => {
    const { userId, priya, sender } = await setup();
    await setConsent(userId, "location_journey", true);
    const { journey: quiet } = await startJourney(userId, input([priya.id], { shareLocation: false }), sender, T0);
    expect(await updateJourneyLocation(userId, quiet.id, fix)).toBe(false);
    await endJourney(userId, quiet.id, sender, at(1));

    const { journey: j } = await startJourney(userId, input([priya.id]), sender, at(2));
    expect(await updateJourneyLocation(userId, j.id, fix)).toBe(true);
    const token = journeyShareToken(j.id);
    expect(await journeyForShareToken(token, at(10))).toMatchObject({ expired: false, lastLocation: { lat: 12.9352 } });
    await arrive(userId, j.id, sender, at(20));
    expect(await journeyForShareToken(token, at(79))).toMatchObject({ status: "arrived" });
    expect(await processJourneys(at(80), sender)).toMatchObject({ expired: 1 });
    const [row] = await getDb().select().from(journey).where(eq(journey.id, j.id));
    expect(row.lastLocation).toBeNull();
    expect(await journeyForShareToken(token, at(81))).toEqual({ expired: true });
  });

  it("ignores a location request without consent", async () => {
    const { userId, priya, sender } = await setup();
    const { journey: j } = await startJourney(userId, input([priya.id]), sender, T0);
    expect(j.shareLocation).toBe(false);
  });

  it("checks a single journey when it's looked at, so a missed check-in isn't left waiting for the scheduler", async () => {
    const { userId, priya, sender, sent } = await setup();
    const { journey: j } = await startJourney(userId, input([priya.id]), sender, T0);
    expect(await processJourney(j.id, at(34), sender)).toMatchObject({ prompted: 1, escalated: 0 });
    expect(await processJourney(j.id, at(36), sender)).toMatchObject({ escalated: 1 });
    expect(await processJourney(j.id, at(37), sender)).toMatchObject({ prompted: 0, escalated: 0 });
    expect(sent.filter((s) => s.payload.kind === "journey_missed")).toHaveLength(1);
  });

  it("rejects share tokens that don't match", async () => {
    expect(await journeyForShareToken("not-a-real-token", T0)).toBeNull();
  });
});
