/** Links that hand an emergency to the phone itself — they work with no internet. */

export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[^\d]/g, "");
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

export function telLink(number: string): string {
  return `tel:${normalizePhone(number)}`;
}

export type Platform = "ios" | "android" | "other";

export function detectPlatform(userAgent: string): Platform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "other";
}

/** Opens the messages app with recipients and text filled in. The user still taps Send. */
export function smsLink(numbers: string[], body: string, platform: Platform): string {
  const to = numbers.map(normalizePhone).filter(Boolean).join(",");
  const text = encodeURIComponent(body);
  if (platform === "ios") return to ? `sms:/open?addresses=${to}&body=${text}` : `sms:&body=${text}`;
  return `sms:${to}?body=${text}`;
}

export function mapsLink(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
}

export interface Fix {
  lat: number;
  lng: number;
  accuracy: number;
  /** When the reading was taken (ms since epoch). */
  at?: number;
}

export function sosMessage({ name, location, custom }: { name: string; location?: Fix | null; custom?: string | null }): string {
  const where = location
    ? ` My location: ${mapsLink(location.lat, location.lng)} (accurate to about ${Math.round(location.accuracy)} m).`
    : " I couldn't share my location.";
  const base = `SOS from ${name} (sent with BLOOM): I need help.${where}`;
  return custom?.trim() ? `${custom.trim()}\n\n${base}` : base;
}
