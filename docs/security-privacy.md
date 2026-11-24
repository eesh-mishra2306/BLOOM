# Security and privacy

BLOOM holds some of the most sensitive data a person has: their cycle, their moods, a journal, who they trust, and where they are when they're scared. This page explains what protects that data and what doesn't. The "Not protected against" sections are part of the design, not fine print.

## Who might go after this data

| Who | What they want | Main defences |
| --- | --- | --- |
| Someone with the person's unlocked phone (a partner, a family member) | Read the journal or cycle, see who's in the circle, see that BLOOM is installed | Discreet mode (neutral look, Daybook name, plain labels), quick exit (button or Escape three times), PIN lock with timeout, a `data-locked` page state set before first paint so nothing flashes, neutral lock-screen notification wording |
| An attacker with a database dump or backup | Health data, contacts, locations | Envelope encryption: every sensitive payload is sealed with a per-user key wrapped by a master key that isn't in the database. Tokens are stored only as hashes |
| An attacker on the web | Account takeover, cross-site requests, injected scripts | Better Auth sessions (HTTP-only, SameSite=Lax, Secure on HTTPS), passkeys, rate-limited sign-in and sign-up (5 per minute), same-site checks on every state-changing route, per-request nonce CSP, `frame-ancestors 'none'`, HSTS in production |
| Someone with a link | A contact's alert or journey link forwarded on | 32-byte unguessable tokens, short expiry (SOS 24 h; journeys 1 h after ending), `noindex` and `no-referrer` on link pages, and only what that contact needs |
| The AI provider | Conversations | Messages go to the provider only with `ai_chat` consent. Cycle context only with `ai_cycle_context` consent, as a short summary. Memories only with `ai_memory` consent, and only what the person saved. The journal is never sent. BLOOM doesn't store conversations |

## Encryption at rest

- **Algorithm:** AES-256-GCM through Node's `crypto`. Random 96-bit IV per value. Additional authenticated data is `purpose:userId`. Format: `v1.<iv>.<ciphertext+tag>`.
- **Keys:**
  - Each user has a random 256-bit data key.
  - It's wrapped with `BLOOM_MASTER_KEY` (32 bytes, environment only) and stored in `keystore.user_key` with the master key id, so keys can be rotated later.
  - Unwrapped keys are cached in memory for 60 seconds.
- **What's sealed:** see [data-model.md](data-model.md). Cycle days, moods, journal, goal labels, Mochi's notes, emergency info, contact details, destinations and every stored location.
- **Crypto-shredding:** account deletion destroys the key row first, then deletes the user (which cascades), the user's audit rows and rate-limit rows, and records a single anonymous "account.deleted".

**Not protected against:** anyone who holds both the database and `BLOOM_MASTER_KEY`, which includes the people running the server. The server must decrypt data to predict cycles and, with consent, to give Mochi context. This is encryption against leaks, not end-to-end encryption, and the privacy centre says so. End-to-end encryption for the journal is on the roadmap.

## Authentication

- Email and password: minimum 10 characters, scrypt hashing by Better Auth.
- Optional passkeys (WebAuthn), with the relying-party id taken from `BETTER_AUTH_URL`.
- Password reset by email when `RESEND_API_KEY` is set, rate limited to 3 per 5 minutes.
- Settings offers: change password (signs out other sessions), add and remove passkeys, and sign out other devices.
- Account deletion requires the current password (Better Auth `verifyPassword`).

## Web hardening

- `src/proxy.ts`:
  - Sets a per-request nonce Content-Security-Policy: scripts only with the nonce, no inline event handlers, `connect-src 'self'`, `frame-ancestors 'none'`.
  - Redirects signed-out requests for app pages before rendering.
- `next.config.ts` adds these headers:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - A restrictive `Permissions-Policy` (geolocation self only)
  - `Cross-Origin-Opener-Policy: same-origin`
  - HSTS in production
  - The `poweredBy` header is removed.
- Every cookie-authenticated `POST`/`PATCH` route rejects cross-site requests (`Origin` or `Sec-Fetch-Site`) and validates input with zod.
- Rate limits: chat 30 per 10 min; SOS 10 per hour, after which the screen says to use call and text; journey updates 120 per 10 min; data export 5 per hour; contact invites 20 per hour.
- The cron endpoint needs `Authorization: Bearer $CRON_SECRET`, compared in constant time.
- Database connections that ask for TLS verify the server certificate and host name. `src/lib/db/tls.ts` spells `sslmode=require`, `prefer` and `verify-ca` as `verify-full`, which is what pg 8 already does, so a future pg upgrade can't quietly weaken the check.
- AI keys and VAPID private keys never reach the browser. All AI calls are made server-side.

## Safety-critical behaviour

- SOS never claims success it can't see:
  - "Sent" means a push service accepted the alert.
  - "Delivered" means the contact's device reported showing it.
  - "Acknowledged" means they tapped "I'm on it".
  - Contacts who haven't accepted, or have no device, are named as such, and the person is told to call or text instead.
- SOS, the offline page and the call and text links work without the AI, without WebGL and without a network connection.
- Triage (danger, crisis, urgent medical) runs on the device before anything is sent, and again on the server. It shows helplines from deterministic rules, not from the model.
- Ambient sound stops the moment SOS opens.
- BLOOM never says it contacted police or an ambulance. It doesn't.

## Privacy controls in the product

- **Consents:** six independent switches. Each change is stored append-only with the copy version and shown as history in the privacy centre. Turning off `ai_memory` deletes the saved notes.
- **Export:** one JSON file with everything, decrypted: profile, consent history, cycle, moods, journal, goals, activities, Mochi's notes, contacts, emergency info, SOS and journey history, sessions. It leaves out password hashes, keys and push endpoints.
- **Deletion:** described above. Trusted contacts are not notified.
- **Permission audit:** the privacy centre shows the browser's location and notification permission states and what each is used for.
- **This device:** the privacy centre can clear BLOOM's local storage on one device without touching the account.
- **No analytics or advertising code.** Fonts are self-hosted (Fontsource) and there are no third-party requests in the page.

## Not done yet (tracked in [production-readiness.md](production-readiness.md))

- An independent security review or penetration test.
- Master-key rotation tooling. The key id is stored, but there's no rotation command.
- Legal review against India's DPDP Act and Rules, and a published privacy notice and terms.
- Clinical review of the knowledge base and triage rules.
