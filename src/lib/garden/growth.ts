/**
 * How Bloomverse grows. One flower per thing the person chose to do for herself. Flowers never
 * wilt, and nothing is lost by skipping a day: there are no streaks to break.
 */

export type GrowthKind = "breathing" | "mood" | "journal" | "cycle_log" | "goal";
export type Species = "lavender" | "daisy" | "rose" | "tulip" | "marigold";
export type Scene = "dawn" | "golden" | "dusk" | "moon";

export const SPECIES: Record<GrowthKind, { species: Species; name: string; from: string }> = {
  breathing: { species: "lavender", name: "Lavender", from: "a breathing session" },
  mood: { species: "daisy", name: "Daisy", from: "a mood check-in" },
  journal: { species: "rose", name: "Rose", from: "a journal entry" },
  cycle_log: { species: "tulip", name: "Tulip", from: "a cycle log" },
  goal: { species: "marigold", name: "Marigold", from: "a gentle goal" },
};

export const speciesFor = (kind: GrowthKind): Species => SPECIES[kind].species;

export interface GrowthActivity {
  id: string;
  kind: GrowthKind;
  at: string;
}

export interface FlowerSpec {
  id: string;
  kind: GrowthKind;
  species: Species;
  at: string;
  x: number;
  z: number;
  /** 0.85–1.15 */
  scale: number;
  /** Radians around the stem. */
  rotation: number;
  /** 0–1, a small colour variation within the species. */
  tint: number;
}

export interface PlaceOptions {
  radius: number;
  minSpacing: number;
  /** Circles to leave empty, e.g. where Mochi sits. */
  keepClear?: { x: number; z: number; r: number }[];
  /** Candidate spots to try per flower before giving up on it. */
  attempts?: number;
}

/** FNV-1a: a stable 32-bit hash of the activity id. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a tiny seeded random number generator. */
function random(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Places flowers on a round island. Positions come from each activity's id, and the oldest flowers
 * are placed first, so a new flower never moves the ones already growing. If the island is full
 * a flower is left out rather than crowding the others.
 */
export function placeFlowers(activities: GrowthActivity[], opts: PlaceOptions): FlowerSpec[] {
  const attempts = opts.attempts ?? 24;
  const ordered = [...activities].sort((a, b) => (a.at === b.at ? (a.id < b.id ? -1 : 1) : a.at < b.at ? -1 : 1));
  const placed: FlowerSpec[] = [];
  const cell = opts.minSpacing;
  const grid = new Map<string, FlowerSpec[]>();
  const key = (x: number, z: number) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;

  const free = (x: number, z: number) => {
    if (Math.hypot(x, z) > opts.radius) return false;
    if (opts.keepClear?.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) return false;
    const cx = Math.floor(x / cell);
    const cz = Math.floor(z / cell);
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++)
        for (const f of grid.get(`${cx + dx},${cz + dz}`) ?? []) if (Math.hypot(f.x - x, f.z - z) < opts.minSpacing) return false;
    return true;
  };

  for (const a of ordered) {
    const rand = random(hash(a.id));
    for (let i = 0; i < attempts; i++) {
      const angle = rand() * Math.PI * 2;
      const r = opts.radius * Math.sqrt(rand());
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      if (!free(x, z)) continue;
      const flower: FlowerSpec = {
        id: a.id,
        kind: a.kind,
        species: speciesFor(a.kind),
        at: a.at,
        x,
        z,
        scale: 0.85 + rand() * 0.3,
        rotation: rand() * Math.PI * 2,
        tint: rand(),
      };
      placed.push(flower);
      const k = key(x, z);
      grid.set(k, [...(grid.get(k) ?? []), flower]);
      break;
    }
  }
  return placed;
}

export function sceneForHour(hour: number): Scene {
  if (hour >= 5 && hour < 11) return "dawn";
  if (hour >= 11 && hour < 17) return "golden";
  if (hour >= 17 && hour < 20) return "dusk";
  return "moon";
}

const MOOD_WINDOW_MS = 14 * 86_400_000;

/** The sky that matches the last week or two of check-ins. Only with the person's consent. */
export function ambientFromMoods(moods: { mood: number; createdAt: Date | string }[], consent: boolean, now = new Date()): Scene | null {
  if (!consent) return null;
  const recent = moods.filter((m) => now.getTime() - new Date(m.createdAt).getTime() <= MOOD_WINDOW_MS).slice(0, 7);
  if (!recent.length) return null;
  const avg = recent.reduce((s, m) => s + m.mood, 0) / recent.length;
  if (avg >= 4) return "golden";
  if (avg >= 3) return "dawn";
  if (avg >= 2) return "dusk";
  return "moon";
}
