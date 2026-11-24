/**
 * Calendar-day helpers. BLOOM stores health days as ISO "YYYY-MM-DD" strings and does
 * all day arithmetic in UTC, so a log never shifts a day because of the viewer's time zone.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

function toUtcMs(iso: string): number {
  const m = ISO_DATE.exec(iso);
  if (!m) throw new RangeError(`Not an ISO date: ${iso}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isValidIsoDate(value: string): boolean {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  return fromUtcMs(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) === value;
}

export function addDays(iso: string, days: number): string {
  return fromUtcMs(toUtcMs(iso) + days * DAY_MS);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

export function compareIso(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The calendar day an instant falls on in a given IANA time zone. */
export function isoFromDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isoToday(timeZone: string): string {
  return isoFromDate(new Date(), timeZone);
}

/** Day of week, 0 = Sunday. */
export function weekday(iso: string): number {
  return new Date(toUtcMs(iso)).getUTCDay();
}

export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function addMonths(iso: string, months: number): string {
  const m = ISO_DATE.exec(iso);
  if (!m) throw new RangeError(`Not an ISO date: ${iso}`);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1 + months, 1));
  return fromUtcMs(d.getTime());
}

export function daysInMonth(iso: string): number {
  const first = startOfMonth(iso);
  return diffDays(first, addMonths(first, 1));
}

export function formatDay(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }): string {
  return new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: "UTC" }).format(new Date(toUtcMs(iso)));
}
