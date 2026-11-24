/**
 * The timing rules for a shared journey, as pure functions. The cron job and the journey screen
 * both rely on these, so they are tested on their own.
 *
 * A check-in is due at `nextCheckInDueAt`. At that moment BLOOM prompts the traveller. If she still
 * hasn't checked in `graceMinutes` later, BLOOM alerts her chosen contacts — once per missed check-in.
 */

export type JourneyStatus = "active" | "arrived" | "ended" | "escalated";

export interface JourneySnapshot {
  status: JourneyStatus;
  expectedArrivalAt: Date;
  checkInIntervalMin: number | null;
  nextCheckInDueAt: Date;
  graceMinutes: number;
  userPromptedAt: Date | null;
  escalatedAt: Date | null;
  shareExpiresAt: Date;
  hasLocation: boolean;
}

export type JourneyAction = "prompt_user" | "escalate" | "expire_share";

/** How long the follow-along link keeps working after the journey ends. */
export const SHARE_AFTER_END_MS = 60 * 60_000;
/** How long the link works past the expected arrival if the journey is never ended. */
export const SHARE_AFTER_ETA_MS = 12 * 60 * 60_000;
/** Checking in after the expected arrival buys this much more time. */
export const LATE_CHECK_IN_MIN = 10;

export const isLive = (status: JourneyStatus) => status === "active" || status === "escalated";

export function journeyActions(j: JourneySnapshot, now: Date): JourneyAction[] {
  const actions: JourneyAction[] = [];
  const t = now.getTime();
  if (isLive(j.status)) {
    // Nobody ended it and the link has run out: close it rather than keep alerting.
    if (t >= j.shareExpiresAt.getTime()) return ["expire_share"];
    const due = j.nextCheckInDueAt.getTime();
    if (t >= due && (!j.userPromptedAt || j.userPromptedAt.getTime() < due)) actions.push("prompt_user");
    if (t >= due + j.graceMinutes * 60_000 && (!j.escalatedAt || j.escalatedAt.getTime() < due)) actions.push("escalate");
  } else if (j.hasLocation && t >= j.shareExpiresAt.getTime()) {
    actions.push("expire_share");
  }
  return actions;
}

/** When the next check-in falls due after the traveller checks in at `now`. */
export function nextDueAfterCheckIn(j: Pick<JourneySnapshot, "expectedArrivalAt" | "checkInIntervalMin">, now: Date): Date {
  const eta = j.expectedArrivalAt.getTime();
  const t = now.getTime();
  if (t >= eta) return new Date(t + (j.checkInIntervalMin ?? LATE_CHECK_IN_MIN) * 60_000);
  if (!j.checkInIntervalMin) return new Date(eta);
  return new Date(Math.min(eta, t + j.checkInIntervalMin * 60_000));
}
