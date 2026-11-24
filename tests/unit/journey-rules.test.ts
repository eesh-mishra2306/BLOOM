import { describe, expect, it } from "vitest";
import { journeyActions, nextDueAfterCheckIn, type JourneySnapshot } from "@/lib/safety/journey-rules";

const T0 = new Date("2026-11-24T15:00:00Z");
const min = (n: number) => new Date(T0.getTime() + n * 60_000);

function journey(over: Partial<JourneySnapshot> = {}): JourneySnapshot {
  return {
    status: "active",
    expectedArrivalAt: min(30),
    checkInIntervalMin: null,
    nextCheckInDueAt: min(30),
    graceMinutes: 5,
    userPromptedAt: null,
    escalatedAt: null,
    shareExpiresAt: min(30 + 12 * 60),
    hasLocation: false,
    ...over,
  };
}

describe("journeyActions", () => {
  it("does nothing before the check-in is due", () => {
    expect(journeyActions(journey(), min(29))).toEqual([]);
  });

  it("prompts the traveller when the check-in is due", () => {
    expect(journeyActions(journey(), min(30))).toEqual(["prompt_user"]);
  });

  it("doesn't prompt twice for the same check-in", () => {
    expect(journeyActions(journey({ userPromptedAt: min(30) }), min(32))).toEqual([]);
  });

  it("escalates after the grace period, exactly once", () => {
    const j = journey({ userPromptedAt: min(30) });
    expect(journeyActions(j, min(35))).toEqual(["escalate"]);
    const after = { ...j, status: "escalated" as const, escalatedAt: min(35) };
    expect(journeyActions(after, min(36))).toEqual([]);
    expect(journeyActions(after, min(90))).toEqual([]);
  });

  it("prompts and escalates together when the cron was late", () => {
    expect(journeyActions(journey(), min(40))).toEqual(["prompt_user", "escalate"]);
  });

  it("never escalates an arrived journey", () => {
    expect(journeyActions(journey({ status: "arrived" }), min(60))).toEqual([]);
    expect(journeyActions(journey({ status: "ended" }), min(60))).toEqual([]);
  });

  it("escalates again for a new missed check-in after the traveller checked in", () => {
    const j = journey({ status: "active", escalatedAt: min(35), userPromptedAt: min(30), nextCheckInDueAt: min(45), checkInIntervalMin: 10 });
    expect(journeyActions(j, min(44))).toEqual([]);
    expect(journeyActions(j, min(50))).toEqual(["prompt_user", "escalate"]);
  });

  it("forgets the location once the share link expires", () => {
    const ended = journey({ status: "arrived", shareExpiresAt: min(90), hasLocation: true });
    expect(journeyActions(ended, min(89))).toEqual([]);
    expect(journeyActions(ended, min(90))).toEqual(["expire_share"]);
    expect(journeyActions({ ...ended, hasLocation: false }, min(91))).toEqual([]);
  });
});

describe("abandoned journeys", () => {
  it("closes a journey nobody ended once its link expires", () => {
    const stale = journey({ status: "escalated", escalatedAt: min(35), userPromptedAt: min(30), shareExpiresAt: min(30 + 12 * 60) });
    expect(journeyActions(stale, min(30 + 12 * 60 - 1))).toEqual([]);
    expect(journeyActions(stale, min(30 + 12 * 60))).toEqual(["expire_share"]);
  });
});

describe("nextDueAfterCheckIn", () => {
  it("waits until arrival when there are no regular check-ins", () => {
    expect(nextDueAfterCheckIn(journey(), min(10))).toEqual(min(30));
  });

  it("asks again after the interval, but never later than arrival", () => {
    const j = journey({ checkInIntervalMin: 15 });
    expect(nextDueAfterCheckIn(j, min(5))).toEqual(min(20));
    expect(nextDueAfterCheckIn(j, min(20))).toEqual(min(30));
  });

  it("gives ten more minutes when checking in after the expected arrival", () => {
    expect(nextDueAfterCheckIn(journey(), min(33))).toEqual(min(43));
  });
});
