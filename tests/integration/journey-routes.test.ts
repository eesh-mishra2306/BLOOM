import { beforeEach, describe, expect, it } from "vitest";
import { getEnv } from "@/lib/env";
import { getActiveJourney, journeyTimerRunning, recordJourneyTimerRun, startJourney } from "@/lib/safety/journeys";
import { resetDb, signUp } from "./helpers";
import { acceptedContact } from "./safety-helpers";

const { GET: cron } = await import("@/app/api/cron/journeys/route");
const route = await import("@/app/api/journey/[id]/route");
const devices = await import("@/app/api/devices/route");

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
function patch(id: string, body: object, cookie?: string) {
  return route.PATCH(
    new Request(`http://localhost:3000/api/journey/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", origin: "http://localhost:3000", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    }),
    ctx(id),
  );
}

async function travelling() {
  const asha = await signUp("Asha");
  const priya = await acceptedContact(asha.userId, "Priya");
  const { journey } = await startJourney(asha.userId, { destination: "Home", minutes: 20, checkInEveryMin: null, contactIds: [priya.id], shareLocation: false }, null);
  return { ...asha, journey };
}

describe("journey cron", () => {
  beforeEach(resetDb);

  it("requires the cron secret", async () => {
    expect((await cron(new Request("http://localhost:3000/api/cron/journeys"))).status).toBe(401);
    const wrong = await cron(new Request("http://localhost:3000/api/cron/journeys", { headers: { authorization: "Bearer nope" } }));
    expect(wrong.status).toBe(401);
  });

  it("runs with the secret and reports what it did", async () => {
    const res = await cron(new Request("http://localhost:3000/api/cron/journeys", { headers: { authorization: `Bearer ${getEnv().CRON_SECRET}` } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ prompted: 0, escalated: 0, expired: 0 });
  });

  it("marks the journey timer as running after a successful run", async () => {
    expect(await journeyTimerRunning()).toBe(false);
    const res = await cron(new Request("http://localhost:3000/api/cron/journeys", { headers: { authorization: `Bearer ${getEnv().CRON_SECRET}` } }));
    expect(res.status).toBe(200);
    expect(await journeyTimerRunning()).toBe(true);
  });

  it("doesn't count a refused call as a run", async () => {
    await cron(new Request("http://localhost:3000/api/cron/journeys", { headers: { authorization: "Bearer nope" } }));
    expect(await journeyTimerRunning()).toBe(false);
  });

  it("treats a timer that last ran six minutes ago as off", async () => {
    await recordJourneyTimerRun(new Date(Date.now() - 6 * 60_000));
    expect(await journeyTimerRunning()).toBe(false);
    await recordJourneyTimerRun(new Date());
    expect(await journeyTimerRunning()).toBe(true);
  });
});

describe("journey API", () => {
  beforeEach(resetDb);

  it("lets the traveller check in and arrive", async () => {
    const { cookie, journey, userId } = await travelling();
    const res = await patch(journey.id, { action: "check_in" }, cookie);
    expect(res.status).toBe(200);
    expect((await res.json()).journey.status).toBe("active");
    const done = await patch(journey.id, { action: "arrive" }, cookie);
    expect((await done.json()).journey.status).toBe("arrived");
    expect(await getActiveJourney(userId)).toBeNull();
  });

  it("hides other people's journeys", async () => {
    const { journey } = await travelling();
    const other = await signUp("Meera");
    expect((await patch(journey.id, { action: "end" }, other.cookie)).status).toBe(404);
    expect((await patch(journey.id, { action: "end" })).status).toBe(401);
  });

  it("escalates an overdue journey when the traveller's screen checks in with the server", async () => {
    const asha = await signUp("Asha");
    const priya = await acceptedContact(asha.userId, "Priya");
    const started = new Date(Date.now() - 40 * 60_000);
    const { journey } = await startJourney(asha.userId, { destination: "Home", minutes: 30, checkInEveryMin: null, contactIds: [priya.id], shareLocation: false }, null, started);
    const res = await route.GET(new Request(`http://localhost:3000/api/journey/${journey.id}`, { headers: { cookie: asha.cookie } }), ctx(journey.id));
    expect((await res.json()).journey.status).toBe("escalated");
  });

  it("tells the traveller's screen whether the journey timer is on", async () => {
    const { cookie, journey } = await travelling();
    const get = () => route.GET(new Request(`http://localhost:3000/api/journey/${journey.id}`, { headers: { cookie } }), ctx(journey.id));
    expect((await (await get()).json()).timerOn).toBe(false);
    await recordJourneyTimerRun();
    expect((await (await get()).json()).timerOn).toBe(true);
  });

  it("rejects unknown actions", async () => {
    const { cookie, journey } = await travelling();
    expect((await patch(journey.id, { action: "teleport" }, cookie)).status).toBe(422);
  });
});

describe("device registration", () => {
  beforeEach(resetDb);

  it("registers this browser for the signed-in user", async () => {
    const { cookie } = await signUp();
    const res = await devices.POST(
      new Request("http://localhost:3000/api/devices", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie },
        body: JSON.stringify({ subscription: { endpoint: "https://push.example/asha", keys: { p256dh: "p256dh-key", auth: "auth-key" } } }),
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ devices: 1 });
  });
});
