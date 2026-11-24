import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Application tables. Columns named `payload`, `location` or `destination` hold
 * application-encrypted ciphertext (see src/lib/crypto/user-keys.ts) — never plaintext.
 */

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const owner = () =>
  text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull();

export const profile = pgTable("profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull().default(""),
  country: text("country").notNull().default("IN"),
  timeZone: text("time_zone").notNull().default("Asia/Kolkata"),
  companionName: text("companion_name").notNull().default("Mochi"),
  companionSpecies: text("companion_species", { enum: ["kitten", "puppy", "bunny", "bear"] })
    .notNull()
    .default("kitten"),
  companionColor: text("companion_color").notNull().default("cream"),
  companionAccessory: text("companion_accessory", { enum: ["none", "flower", "bow"] })
    .notNull()
    .default("flower"),
  companionPersonality: text("companion_personality", { enum: ["gentle", "playful", "calm"] })
    .notNull()
    .default("gentle"),
  companionLanguage: text("companion_language", { enum: ["en", "hinglish"] }).notNull().default("en"),
  sosCountdownSeconds: smallint("sos_countdown_seconds").notNull().default(5),
  sosMessage: text("sos_message"),
  showFertileWindow: boolean("show_fertile_window").notNull().default(false),
  typicalCycleLength: smallint("typical_cycle_length"),
  typicalPeriodLength: smallint("typical_period_length"),
  phone: text("phone"),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Append-only consent history. The latest row per purpose is the current choice. */
export const consent = pgTable(
  "consent",
  {
    id: id(),
    userId: owner(),
    purpose: text("purpose").notNull(),
    granted: boolean("granted").notNull(),
    version: text("version").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("consent_user_purpose_idx").on(t.userId, t.purpose, t.createdAt)],
);

export const cycleDay = pgTable(
  "cycle_day",
  {
    id: id(),
    userId: owner(),
    date: date("date", { mode: "string" }).notNull(),
    payload: text("payload").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("cycle_day_user_date_idx").on(t.userId, t.date)],
);

export const moodCheckin = pgTable(
  "mood_checkin",
  {
    id: id(),
    userId: owner(),
    payload: text("payload").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("mood_user_created_idx").on(t.userId, t.createdAt)],
);

export const journalEntry = pgTable(
  "journal_entry",
  {
    id: id(),
    userId: owner(),
    payload: text("payload").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("journal_user_created_idx").on(t.userId, t.createdAt)],
);

export const wellnessGoal = pgTable(
  "wellness_goal",
  {
    id: id(),
    userId: owner(),
    label: text("label").notNull(),
    icon: text("icon").notNull().default("sprout"),
    createdAt: createdAt(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [index("goal_user_idx").on(t.userId)],
);

/** What grows the Bloomverse garden. `kind` is not sensitive (e.g. "breathing"). */
export const wellnessActivity = pgTable(
  "wellness_activity",
  {
    id: id(),
    userId: owner(),
    kind: text("kind", { enum: ["breathing", "mood", "journal", "cycle_log", "goal"] }).notNull(),
    refId: text("ref_id"),
    completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("activity_user_completed_idx").on(t.userId, t.completedAt)],
);

export const companionMemory = pgTable(
  "companion_memory",
  {
    id: id(),
    userId: owner(),
    payload: text("payload").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("memory_user_idx").on(t.userId)],
);

export const emergencyInfo = pgTable("emergency_info", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  payload: text("payload").notNull(),
  updatedAt: updatedAt(),
});

export const trustedContact = pgTable(
  "trusted_contact",
  {
    id: id(),
    userId: owner(),
    payload: text("payload").notNull(),
    status: text("status", { enum: ["pending", "accepted", "declined", "revoked"] })
      .notNull()
      .default("pending"),
    inviteTokenHash: text("invite_token_hash").unique(),
    inviteExpiresAt: timestamp("invite_expires_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("contact_user_idx").on(t.userId)],
);

/** Push endpoints of a trusted contact's devices (contacts are not BLOOM users). */
export const contactDevice = pgTable(
  "contact_device",
  {
    id: id(),
    contactId: text("contact_id")
      .notNull()
      .references(() => trustedContact.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("contact_device_contact_idx").on(t.contactId)],
);

/** Push endpoints of the user's own devices (check-in prompts). */
export const userDevice = pgTable(
  "user_device",
  {
    id: id(),
    userId: owner(),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("user_device_user_idx").on(t.userId)],
);

export const sosEvent = pgTable(
  "sos_event",
  {
    id: id(),
    userId: owner(),
    status: text("status", { enum: ["active", "resolved"] })
      .notNull()
      .default("active"),
    location: text("location"),
    viewTokenHash: text("view_token_hash").notNull().unique(),
    viewExpiresAt: timestamp("view_expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("sos_user_created_idx").on(t.userId, t.createdAt)],
);

export const journey = pgTable(
  "journey",
  {
    id: id(),
    userId: owner(),
    status: text("status", { enum: ["active", "arrived", "ended", "escalated"] })
      .notNull()
      .default("active"),
    destination: text("destination").notNull(),
    contactIds: text("contact_ids")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    expectedArrivalAt: timestamp("expected_arrival_at", { withTimezone: true }).notNull(),
    checkInIntervalMin: smallint("check_in_interval_min"),
    nextCheckInDueAt: timestamp("next_check_in_due_at", { withTimezone: true }).notNull(),
    graceMinutes: smallint("grace_minutes").notNull().default(5),
    lastCheckInAt: timestamp("last_check_in_at", { withTimezone: true }),
    lastLocation: text("last_location"),
    shareLocation: boolean("share_location").notNull().default(false),
    shareTokenHash: text("share_token_hash").notNull().unique(),
    shareExpiresAt: timestamp("share_expires_at", { withTimezone: true }).notNull(),
    userPromptedAt: timestamp("user_prompted_at", { withTimezone: true }),
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [
    index("journey_user_idx").on(t.userId, t.startedAt),
    index("journey_active_due_idx").on(t.status, t.nextCheckInDueAt),
  ],
);

export const alertDelivery = pgTable(
  "alert_delivery",
  {
    id: id(),
    userId: owner(),
    sosEventId: text("sos_event_id").references(() => sosEvent.id, { onDelete: "cascade" }),
    journeyId: text("journey_id").references(() => journey.id, { onDelete: "cascade" }),
    contactId: text("contact_id")
      .notNull()
      .references(() => trustedContact.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["sos", "safe", "journey_start", "journey_missed", "arrived", "test"] }).notNull(),
    channel: text("channel", { enum: ["webpush"] }).notNull().default("webpush"),
    status: text("status", { enum: ["sent", "delivered", "failed", "not_configured", "no_device"] }).notNull(),
    receiptTokenHash: text("receipt_token_hash"),
    error: text("error"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  },
  (t) => [
    index("delivery_sos_idx").on(t.sosEventId),
    index("delivery_journey_idx").on(t.journeyId),
    index("delivery_user_idx").on(t.userId),
  ],
);

/** Fixed-window counters for BLOOM's own limits (chat, SOS, invites). */
export const appRateLimit = pgTable("app_rate_limit", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
});

/** When each scheduled job last finished. The journey screens use it to say when the check-in timer is off. */
export const jobHeartbeat = pgTable("job_heartbeat", {
  job: text("job").primaryKey(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }).notNull(),
});

/** Security-relevant events. `meta` must never contain health content. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    userId: text("user_id"),
    action: text("action").notNull(),
    meta: jsonb("meta").$type<Record<string, string | number | boolean | null>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("audit_user_idx").on(t.userId, t.createdAt)],
);
