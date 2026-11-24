import { describe, expect, it } from "vitest";
import { mapsLink, normalizePhone, smsLink, sosMessage, telLink } from "@/lib/safety/links";
import { countdownLeft, sosReducer, type SosState } from "@/lib/safety/sos-machine";
import { hashToken, newToken } from "@/lib/safety/tokens";

describe("links", () => {
  it("builds a tel: link from a cleaned number", () => {
    expect(telLink("112")).toBe("tel:112");
    expect(telLink("+91 98765-43210")).toBe("tel:+919876543210");
  });

  it("keeps only digits and a leading plus", () => {
    expect(normalizePhone(" +91 (98765) 43210 ")).toBe("+919876543210");
    expect(normalizePhone("98-765")).toBe("98765");
  });

  it("encodes the SMS body and joins several recipients", () => {
    const link = smsLink(["+919876543210", "+919812345678"], "Help me\nnow & please", "android");
    expect(link).toBe("sms:+919876543210,+919812345678?body=Help%20me%0Anow%20%26%20please");
  });

  it("uses the iPhone multi-recipient format", () => {
    expect(smsLink(["+911", "+912"], "hi", "ios")).toBe("sms:/open?addresses=+911,+912&body=hi");
  });

  it("still opens the messages app when there are no contacts", () => {
    expect(smsLink([], "SOS", "android")).toBe("sms:?body=SOS");
  });

  it("links coordinates to a map", () => {
    expect(mapsLink(12.97161, 77.59456)).toBe("https://maps.google.com/?q=12.97161,77.59456");
  });

  it("writes an SOS message with location and accuracy", () => {
    const m = sosMessage({ name: "Asha", location: { lat: 12.97161, lng: 77.59456, accuracy: 18 } });
    expect(m).toContain("Asha");
    expect(m).toContain("https://maps.google.com/?q=12.97161,77.59456");
    expect(m).toMatch(/about 18 m/);
  });

  it("says plainly when location couldn't be shared", () => {
    expect(sosMessage({ name: "Asha" })).toMatch(/couldn't share my location/i);
  });

  it("puts the user's own words first when they wrote a message", () => {
    expect(sosMessage({ name: "Asha", custom: "Call me, it's urgent" }).startsWith("Call me, it's urgent")).toBe(true);
  });
});

describe("sosReducer", () => {
  const idle: SosState = { phase: "idle" };

  it("arms a countdown when pressed", () => {
    expect(sosReducer(idle, { type: "press", now: 1000, countdown: 5 })).toEqual({ phase: "arming", endsAt: 6000 });
  });

  it("goes straight to active with a zero-second countdown", () => {
    expect(sosReducer(idle, { type: "press", now: 1000, countdown: 0 })).toMatchObject({ phase: "active", dispatch: "pending" });
  });

  it("can be cancelled while counting down", () => {
    const arming = sosReducer(idle, { type: "press", now: 0, countdown: 5 });
    expect(sosReducer(arming, { type: "cancel" })).toEqual(idle);
  });

  it("stays armed until the countdown ends, then activates", () => {
    const arming = sosReducer(idle, { type: "press", now: 0, countdown: 5 });
    expect(sosReducer(arming, { type: "tick", now: 4999 }).phase).toBe("arming");
    expect(sosReducer(arming, { type: "tick", now: 5000 })).toMatchObject({ phase: "active", dispatch: "pending", startedAt: 5000 });
  });

  it("can't be cancelled once active", () => {
    const active = sosReducer(idle, { type: "press", now: 0, countdown: 0 });
    expect(sosReducer(active, { type: "cancel" })).toBe(active);
  });

  it("records an honest dispatch result", () => {
    const active = sosReducer(idle, { type: "press", now: 0, countdown: 0 });
    expect(sosReducer(active, { type: "dispatched", eventId: "e1", outcome: "sent" })).toMatchObject({ dispatch: "sent", eventId: "e1" });
    expect(sosReducer(active, { type: "dispatch-failed", offline: true })).toMatchObject({ phase: "active", dispatch: "offline" });
    expect(sosReducer(active, { type: "dispatch-failed", offline: false })).toMatchObject({ phase: "active", dispatch: "failed" });
  });

  it("resolves only from active", () => {
    const active = sosReducer(idle, { type: "press", now: 0, countdown: 0 });
    expect(sosReducer(active, { type: "resolve", now: 9 })).toEqual({ phase: "resolved", at: 9 });
    expect(sosReducer(idle, { type: "resolve", now: 9 })).toBe(idle);
  });
});

describe("tokens", () => {
  it("creates long unguessable tokens and stores only their hash", () => {
    const { token, hash } = newToken();
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(hash).toBe(hashToken(token));
    expect(hash).not.toContain(token);
    expect(newToken().token).not.toBe(token);
  });
});

describe("countdownLeft", () => {
  it("never shows more seconds than the countdown, even if the clock was read before the press", () => {
    expect(countdownLeft(10_000 + 5_000, 9_400, 5)).toBe(5);
  });

  it("counts down in whole seconds and never shows zero while arming", () => {
    expect(countdownLeft(15_000, 10_000, 5)).toBe(5);
    expect(countdownLeft(15_000, 11_200, 5)).toBe(4);
    expect(countdownLeft(15_000, 14_990, 5)).toBe(1);
    expect(countdownLeft(15_000, 15_500, 5)).toBe(1);
  });
});
