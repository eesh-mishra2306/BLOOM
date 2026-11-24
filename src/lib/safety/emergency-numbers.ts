/**
 * Emergency numbers by country. India is verified against government sources (Nov 2026):
 * ERSS 112, Women Helpline 181 (MWCD, integrated with 112), Tele-MANAS 14416 (MoHFW, 24×7).
 * Other countries use their widely published national numbers — verify each before launching there.
 */

export interface CountryEmergency {
  code: string;
  name: string;
  emergency: string;
  extras: { label: string; number: string }[];
  note?: string;
}

export const COUNTRIES: CountryEmergency[] = [
  {
    code: "IN",
    name: "India",
    emergency: "112",
    extras: [
      { label: "Women Helpline", number: "181" },
      { label: "Tele-MANAS mental health helpline", number: "14416" },
    ],
  },
  { code: "US", name: "United States", emergency: "911", extras: [{ label: "988 Suicide & Crisis Lifeline", number: "988" }] },
  { code: "CA", name: "Canada", emergency: "911", extras: [{ label: "988 Suicide Crisis Helpline", number: "988" }] },
  { code: "GB", name: "United Kingdom", emergency: "999", extras: [{ label: "NHS 111 (urgent, not an emergency)", number: "111" }] },
  { code: "IE", name: "Ireland", emergency: "112", extras: [] },
  { code: "AU", name: "Australia", emergency: "000", extras: [] },
  { code: "NZ", name: "New Zealand", emergency: "111", extras: [] },
  { code: "SG", name: "Singapore", emergency: "999", extras: [{ label: "Ambulance", number: "995" }] },
  { code: "AE", name: "United Arab Emirates", emergency: "999", extras: [{ label: "Ambulance", number: "998" }] },
  { code: "DE", name: "Germany", emergency: "112", extras: [] },
  { code: "FR", name: "France", emergency: "112", extras: [] },
  { code: "ES", name: "Spain", emergency: "112", extras: [] },
  { code: "IT", name: "Italy", emergency: "112", extras: [] },
  { code: "NL", name: "Netherlands", emergency: "112", extras: [] },
  { code: "SE", name: "Sweden", emergency: "112", extras: [] },
];

const FALLBACK: CountryEmergency = {
  code: "OTHER",
  name: "Somewhere else",
  emergency: "112",
  extras: [],
  note: "112 reaches emergency services on most mobile networks. Check your local emergency number too.",
};

const byCode = new Map(COUNTRIES.map((c) => [c.code, c]));

export function isSupportedCountry(code: string): boolean {
  return byCode.has(code);
}

export function emergencyFor(code: string | null | undefined): CountryEmergency {
  return (code && byCode.get(code)) || FALLBACK;
}
