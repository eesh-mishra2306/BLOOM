# BLOOM

**Live:** https://bloom-beige-one.vercel.app (Vercel project `bloom`, Neon PostgreSQL in Singapore, functions in `sin1`)

BLOOM is a women's safety, cycle and wellness app with an AI companion called Mochi. This repository is **Phase 1: the functional web app**. It's a responsive Next.js app with these parts:

- **Mochi**, an animated 3D companion. Mochi floats on every screen, reacts to what you do, and opens into a chat powered by a real AI model. On-device safety triage and checkable sources run alongside the chat.
- **Cycle tracking**: period and symptom logging, with predictions shown as ranges and an honest confidence level (FIGO 2018 thresholds).
- **Wellness**: mood check-ins, guided breathing with optional sound cues, gentle goals with no streaks, and an encrypted journal with search and download.
- **Bloom Shield**:
  - SOS with a countdown, push alerts to a trusted circle, and honest per-contact delivery status.
  - Call and text buttons that work through the phone even when nothing else does, plus an offline SOS page.
  - Journeys: check-ins, follow-along links for your contacts, and automatic alerts if you miss a check-in.
  - Discreet mode, quick exit and a PIN lock.
- **Bloomverse**: a 3D floating island where your wellness activities grow flowers, with sky scenes and generated soundscapes (rain, ocean, forest, soft music, white noise).
- **Privacy centre**:
  - Per-purpose consents with history.
  - Mochi's memory you can read and delete.
  - A full data export, and account deletion that destroys the encryption key first.

Plain-language background: [docs/architecture.md](docs/architecture.md), [docs/security-privacy.md](docs/security-privacy.md), [docs/known-limitations.md](docs/known-limitations.md).

## Run it locally

You need Node.js 22 (the version production runs on, pinned in `package.json`), npm, and PostgreSQL 15+. Docker is the easiest way to get PostgreSQL.

```bash
npm install
docker compose up -d                 # PostgreSQL on :5432, plus an empty bloom_test database
cp .env.example .env.local
```

Fill in `.env.local`:

```bash
openssl rand -base64 48              # paste as BETTER_AUTH_SECRET
npm run keys:master                  # paste as BLOOM_MASTER_KEY  (back this up: losing it loses all health data)
npm run keys:vapid                   # paste the pair as VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (optional: SOS push alerts)
openssl rand -hex 24                 # paste as CRON_SECRET (optional: journey checks)
```

To let Mochi chat, set `ANTHROPIC_API_KEY`. The default model is `claude-sonnet-5-5`. Alternatively set `AI_PROVIDER=openai` or `google` with that provider's key and an `AI_MODEL`. Without a key, Mochi says plainly that the AI isn't connected; the safety cards and sources still work.

Then:

```bash
npm run db:migrate                   # creates the tables
npm run dev                          # http://localhost:3000
npm run cron:journeys                # in a second terminal: runs journey checks every 30 s
```

Create an account at `/auth?mode=create`. Onboarding asks for your consents and a rough cycle history.

## Tests

| Command | What it runs |
| --- | --- |
| `npm run typecheck` | TypeScript, strict |
| `npm run lint` | ESLint with the React Compiler rules |
| `npm run test:unit` | Pure logic: cycle predictions, triage, retrieval, journeys, garden growth, audio engine, crypto, links |
| `npm run test:integration` | Real PostgreSQL (`bloom_test`): auth, encryption at rest, every repository, API routes, export and deletion |
| `npm run test:e2e` | Seven browser flows in Chrome against a running app (`npm run build && npm start` first) |
| `npm run test:a11y` | axe-core WCAG 2.2 AA scan of every screen, in light, dark, discreet and high-contrast modes |

The integration tests use `TEST_DATABASE_URL`, falling back to `postgres://postgres@localhost:5432/bloom_test`. The browser flows use `/usr/bin/google-chrome` if it exists, or `CHROME_PATH`, or Playwright's Chromium (`npx playwright install chromium`). Their screenshots go to `/tmp/shots`.

## Deploying

BLOOM is a standard Next.js server app with PostgreSQL. It runs on Vercel, Render, Railway, Fly.io or a VPS.

1. Provision PostgreSQL (Neon, Supabase, RDS, or your own) and run `npm run db:migrate` against it.
2. Set every variable from `.env.example` in the host's secret store. `BETTER_AUTH_URL` must be the public HTTPS origin.
3. **Journeys need a scheduler.** Something must call `GET /api/cron/journeys` with `Authorization: Bearer $CRON_SECRET` every minute.
   - Vercel Pro can do this from `vercel.json`:
     ```json
     { "crons": [{ "path": "/api/cron/journeys", "schedule": "* * * * *" }] }
     ```
   - Vercel Hobby only allows daily cron jobs, and a per-minute schedule fails the deploy. On Hobby, use an external scheduler or a small always-on worker. With [cron-job.org](https://cron-job.org): create a job for `https://<your domain>/api/cron/journeys`, run it every minute, and add the request header `Authorization: Bearer <CRON_SECRET>`.
   - Each successful run is recorded. When there hasn't been one for 5 minutes, the journey screens tell travellers that reminders and alerts only work while BLOOM is open on their screen. The notice goes away by itself within a minute of the next run.
   - As a fallback, an overdue journey is also checked whenever the traveller's screen or a contact's follow-along page asks for it. Don't rely on that alone.
4. Push alerts need HTTPS and VAPID keys. On iPhone, contacts must add BLOOM to their Home Screen (iOS 16.4+) before they can receive alerts.
5. Read [docs/production-readiness.md](docs/production-readiness.md) before real people use it.

## Project map

```
src/app/                 routes (App Router). (app)/ is the signed-in shell; sos/, j/, alert/, circle/ work signed out
src/app/api/             route handlers: auth, companion chat, safety (SOS, invites, receipts), journeys, cron, exports
src/components/          UI by feature: mochi/, cycle/, wellness/, journal/, safety/, bloomverse/, audio/, privacy/, settings/, ui/, shell/
src/lib/                 domain logic, server-only where it touches data: cycle/, ai/, safety/, wellness/, garden/, audio/, crypto/, db/, auth/
public/sw.js             service worker: push alerts, delivery receipts, the "I'm okay" check-in action, offline SOS page
public/sos-offline.html  zero-dependency emergency page served when there's no connection
drizzle/                 SQL migrations
tests/unit, tests/integration, scripts/e2e-*.mjs, scripts/a11y.mjs
docs/                    architecture, data model, design system, security and privacy, roadmap, checklists
```

## Health and safety notes

- BLOOM does not contact emergency services. SOS alerts the person's own trusted contacts and puts the local emergency number (112 in India) one tap away.
- Cycle predictions are estimates, not medical advice or contraception.
- Mochi's knowledge base cites NHS, MSD Manuals, India's MoHFW and others. It **has not been reviewed by a clinician yet**, and it must be before launch. See [docs/production-readiness.md](docs/production-readiness.md).
