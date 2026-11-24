/** Device-level preferences (stored in localStorage, never on the server). */

export type AmbientKind = "rain" | "ocean" | "forest" | "pads" | "noise";
/** Bloomverse sky: follow the clock, follow recent moods (with consent), or a fixed scene. */
export type GardenSky = "time" | "mood" | "dawn" | "golden" | "dusk" | "moon";

export interface Prefs {
  theme: "system" | "light" | "dark";
  discreet: boolean;
  motion: "system" | "reduced" | "full";
  textScale: 1 | 1.15 | 1.3;
  contrast: "normal" | "high";
  petals: boolean;
  mochi: boolean;
  quickExitUrl: string;
  /** Keep a copy of contacts and emergency info on this device for the offline SOS page. */
  offlineCard: boolean;
  ambient: { kind: AmbientKind | null; volume: number };
  gardenSky: GardenSky;
  /** Soft tones that pace the breathing exercise. */
  breathSound: boolean;
  lock: { enabled: boolean; pinHash?: string; salt?: string; timeoutMin: 1 | 5 | 15 };
}

export const DEFAULT_PREFS: Prefs = {
  theme: "system",
  discreet: false,
  motion: "system",
  textScale: 1,
  contrast: "normal",
  petals: true,
  mochi: true,
  quickExitUrl: "https://www.google.com/search?q=weather+today",
  offlineCard: true,
  ambient: { kind: null, volume: 0.5 },
  gardenSky: "time",
  breathSound: false,
  lock: { enabled: false, timeoutMin: 5 },
};

export interface ResolvedAttributes {
  theme: "light" | "dark";
  discreet: boolean;
  motion: "reduced" | "full";
  contrast: "normal" | "high";
  textScale: number;
}

export function resolveAttributes(
  prefs: Prefs,
  env: { prefersDark: boolean; prefersReducedMotion: boolean },
): ResolvedAttributes {
  const dark = !prefs.discreet && (prefs.theme === "dark" || (prefs.theme === "system" && env.prefersDark));
  const motion =
    prefs.motion === "system" ? (env.prefersReducedMotion ? "reduced" : "full") : prefs.motion === "reduced" ? "reduced" : "full";
  const scale = Number(prefs.textScale);
  return {
    theme: dark ? "dark" : "light",
    discreet: prefs.discreet,
    motion,
    contrast: prefs.contrast === "high" ? "high" : "normal",
    textScale: scale >= 1 && scale <= 1.4 ? scale : 1,
  };
}

export type NavIcon = "home" | "cycle" | "garden" | "wellness" | "shield";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  /** Other sections that live under this tab. */
  also?: string[];
}

export function navItems(discreet: boolean): NavItem[] {
  return [
    { href: "/dashboard", label: "Home", icon: "home" },
    { href: "/cycle", label: discreet ? "Calendar" : "Cycle", icon: "cycle" },
    { href: "/bloomverse", label: discreet ? "Garden" : "Bloomverse", icon: "garden" },
    { href: "/wellness", label: discreet ? "Notes" : "Wellness", icon: "wellness" },
    { href: "/safety", label: discreet ? "Help" : "Shield", icon: "shield", also: ["/journey"] },
  ];
}

export function isNavActive(item: NavItem, pathname: string): boolean {
  return [item.href, ...(item.also ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
