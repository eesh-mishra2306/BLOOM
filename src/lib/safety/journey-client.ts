import type { Fix } from "./links";

/** A journey as the browser sees it: dates are ISO strings. Matches the JSON from /api/journey/[id]. */
export interface ClientJourney {
  id: string;
  status: "active" | "arrived" | "ended" | "escalated";
  destination: string;
  startedAt: string;
  expectedArrivalAt: string;
  checkInIntervalMin: number | null;
  nextCheckInDueAt: string;
  graceMinutes: number;
  lastCheckInAt: string | null;
  escalatedAt: string | null;
  endedAt: string | null;
  shareLocation: boolean;
  lastLocation: Fix | null;
  contactIds: string[];
  sharePath: string;
}

export interface CircleMember {
  id: string;
  name: string;
  relationship?: string;
  phone: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  devices: number;
}

export const clock = (iso: string | number, timeZone: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { timeZone, hour: "numeric", minute: "2-digit" });

/** "12 min", "1 h 5 min" */
export function duration(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60_000));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`;
}

export function countdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

/** Who will actually get an automatic alert, and who needs the link sent by hand. */
export function reach(member: CircleMember): "alerts" | "send_link" | "pending" {
  if (member.status === "accepted" && member.devices > 0) return "alerts";
  if (member.status === "accepted") return "send_link";
  return "pending";
}
