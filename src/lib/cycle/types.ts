import { z } from "zod";

export const FLOWS = ["none", "spotting", "light", "medium", "heavy", "unspecified"] as const;
export type Flow = (typeof FLOWS)[number];

export const MOODS = ["calm", "happy", "energetic", "sensitive", "sad", "anxious", "irritable", "tired"] as const;
export type Mood = (typeof MOODS)[number];

export const SYMPTOMS = [
  "cramps",
  "headache",
  "bloating",
  "acne",
  "tender_breasts",
  "backache",
  "nausea",
  "cravings",
  "insomnia",
  "dizziness",
] as const;
export type Symptom = (typeof SYMPTOMS)[number];

export const FLOW_LABEL: Record<Flow, string> = {
  none: "No bleeding",
  spotting: "Spotting",
  light: "Light",
  medium: "Medium",
  heavy: "Heavy",
  unspecified: "Period day",
};
export const MOOD_LABEL: Record<Mood, string> = {
  calm: "Calm",
  happy: "Happy",
  energetic: "Energetic",
  sensitive: "Sensitive",
  sad: "Low",
  anxious: "Anxious",
  irritable: "Irritable",
  tired: "Tired",
};
export const SYMPTOM_LABEL: Record<Symptom, string> = {
  cramps: "Cramps",
  headache: "Headache",
  bloating: "Bloating",
  acne: "Acne",
  tender_breasts: "Tender breasts",
  backache: "Backache",
  nausea: "Nausea",
  cravings: "Cravings",
  insomnia: "Poor sleep",
  dizziness: "Dizziness",
};

export const dayLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  flow: z.enum(FLOWS),
  cramps: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  moods: z.array(z.enum(MOODS)).max(MOODS.length),
  symptoms: z.array(z.enum(SYMPTOMS)).max(SYMPTOMS.length),
  energy: z.number().int().min(1).max(5).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  note: z.string().max(1000).optional(),
});

export type DayLog = z.infer<typeof dayLogSchema>;

export interface Period {
  start: string;
  end: string;
  length: number;
}

export type Phase = "menstrual" | "follicular" | "fertile" | "luteal" | "late";

export const PHASE_LABEL: Record<Phase, string> = {
  menstrual: "Period",
  follicular: "Follicular phase",
  fertile: "Estimated fertile window",
  luteal: "Luteal phase",
  late: "Period expected",
};

export interface Prediction {
  status: "none" | "estimate";
  basis: "history" | "typical" | "none";
  message: string;
  nextStart?: string;
  windowStart?: string;
  windowEnd?: string;
  confidence?: "low" | "medium" | "high";
  cyclesUsed: number;
  medianCycle?: number;
  sd?: number;
  variability?: number;
  irregular: boolean;
  irregularReasons: string[];
  late: boolean;
  daysLate?: number;
  cycleDay?: number;
  phase?: Phase;
  ovulationEstimate?: string;
  fertileWindow?: { start: string; end: string };
  periodLengthEstimate?: number;
  lastPeriod?: Period;
}
