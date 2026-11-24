# Data model

PostgreSQL, managed with Drizzle. The schema lives in `src/lib/db/schema/` and the migrations in `drizzle/`. Every user-owned table references `user.id` with `ON DELETE CASCADE`, so deleting the user row removes everything they own. The integration test `privacy.test.ts` checks this against every table with a `user_id` column.

**Sealed** means AES-256-GCM with the user's own data key, plus additional authenticated data `purpose:userId`, so a ciphertext can't be moved to another row type or another user. The stored format is `v1.<iv>.<ciphertext+tag>`.

## Accounts (Better Auth)

| Table | Holds | Notes |
| --- | --- | --- |
| `user` | id, email, first name, created | |
| `session` | session tokens, expiry, user agent | 30-day sessions |
| `account` | password hash (scrypt, by Better Auth) | |
| `passkey` | WebAuthn credentials | |
| `verification` | password-reset tokens | removed on account deletion |
| `rate_limit` | sign-in and sign-up attempt counters | stored in the database so limits hold across instances |

## Keys (`keystore` schema)

| Table | Holds |
| --- | --- |
| `keystore.user_key` | the user's 256-bit data key, wrapped (AES-256-GCM) by `BLOOM_MASTER_KEY`, plus the master key id |

The keys live in a separate schema so they can be backed up and retained separately from app data. Deleting this row (crypto-shredding) makes every sealed value for that user unreadable, including copies in database backups, once any key backups have expired.

## App data

| Table | Plain columns | Sealed payload |
| --- | --- | --- |
| `profile` | display name, country, time zone, companion look and personality, SOS countdown and message, phone, typical cycle and period length, onboarding time | none |
| `consent` | purpose, granted, copy version, time. Append-only: the latest row per purpose is the current answer | none |
| `cycle_day` | date (unique per user) | flow, cramps, moods, symptoms, energy, sleep, note |
| `mood_checkin` | created | mood 1–5, tags, note |
| `journal_entry` | created, updated | title, body, mood |
| `wellness_goal` | icon, archived | the goal's label |
| `wellness_activity` | kind, reference, completed | none: it grows Bloomverse flowers and says only *that* something happened |
| `companion_memory` | created | the note Mochi was asked to keep |
| `emergency_info` | updated | blood group, allergies, medicines, conditions, notes |
| `trusted_contact` | status, invite token hash and expiry, accepted | name, phone, email, relationship |
| `contact_device` | push endpoint and keys for a contact's browser | none. The endpoint is a URL at the browser vendor's push service |
| `user_device` | push endpoint for the user's own reminders | none |
| `sos_event` | status, created, resolved, view-link token hash and expiry (24 h) | location |
| `journey` | status, times, check-in interval, grace, contact ids, share-link hash and expiry, escalation and prompt times | destination, last location |
| `alert_delivery` | kind, status (sent / delivered / failed / not configured / no device), receipt token hash, error, delivered and acknowledged times | none |
| `app_rate_limit` | key, count, window | keys include the user id and are deleted with the account |
| `audit_log` | action and counts only, never content | deleted with the account. One anonymous "account.deleted" row is kept |

## Tokens

Invite links, SOS view links and receipts use 32 random bytes encoded as base64url. Only their SHA-256 hash is stored.

Journey follow-along links are different: they're an HMAC-SHA256 of the journey id under `BETTER_AUTH_SECRET`, so the scheduler can rebuild them without storing them. Rotating that secret invalidates links for active journeys.

## Retention

| Data | Kept until |
| --- | --- |
| Everything the user owns | they delete it, or delete their account |
| Journey last location | 1 hour after the journey ends, or 12 hours after the expected arrival if it was never ended |
| Journey follow-along link | the same expiry as the location |
| SOS view link | 24 hours |
| Contact invites | 14 days if not accepted; accepted links last 365 days |
| Push devices | until the push service reports them gone, the user removes them, or the account is deleted |

## Kept only on the device (localStorage)

| Key | Holds |
| --- | --- |
| `bloom.prefs.v1` | theme, text size, contrast, motion, petals, floating Mochi, discreet mode, quick-exit URL, garden sky, breathing sounds, sound choice and volume, PIN lock (PBKDF2-SHA256 hash and salt, timeout) |
| `bloom.emergencyCard.v1` | contact names and numbers, emergency number and emergency info, for the offline SOS page. Optional, on by default, and can be switched off in Shield |
