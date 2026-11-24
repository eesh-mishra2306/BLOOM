# Production readiness checklist

What has to be true before real people rely on BLOOM. Items marked done are done in this repository. The rest need people, accounts or decisions outside the code.

## Must do before the first real user

- [ ] **Clinical review** of the knowledge base (`src/lib/ai/knowledge.ts`), the triage rules (`src/lib/ai/triage.ts`) and the prediction copy, by a gynaecologist and a mental-health professional. Then flip `reviewed` to `true`.
- [ ] **Legal review** against India's Digital Personal Data Protection Act 2023 and the DPDP Rules 2025. Health data, consent notices, an 18+ age gate (no verifiable parental consent flow exists), breach notification, data principal rights, and grievance contact. Publish a privacy notice and terms.
- [ ] **Safety-workflow testing with real people**: SOS and journeys on mid-range Android phones and iPhones (installed to the Home Screen), with contacts on different phones, in battery-saver mode, on weak networks.
- [ ] **Real push delivery** with production VAPID keys over HTTPS: measure delivery time and receipt rates.
- [ ] **Scheduler** calling `/api/cron/journeys` every minute (Vercel Pro cron, or an external scheduler on Hobby), with alerting if it stops. The journey screens already warn travellers when it hasn't run for 5 minutes; you still need to hear about it yourself.
- [ ] **Node.js**: production is pinned to Node 22, which is supported until April 2027. Before then, run the test suite on the next LTS and change `engines.node` in `package.json`.
- [ ] **Secrets** in a secret manager: `BLOOM_MASTER_KEY` (with an offline backup; losing it loses all health data), `BETTER_AUTH_SECRET`, VAPID keys, AI key, `CRON_SECRET`.
- [ ] **Database**: managed PostgreSQL with point-in-time recovery, TLS, and key-table backups kept 7 days or less so crypto-shredding completes.
- [ ] **Email**: Resend (or another provider) with a verified domain, for password reset.
- [ ] **AI provider data terms** reviewed and named in the privacy notice. Use zero data retention if it's available on your plan.

## Done in this repository

- [x] Per-user envelope encryption, crypto-shredding on deletion, export of all data.
- [x] Per-purpose consent with history; nothing sent to AI without consent.
- [x] Nonce CSP, security headers, same-site checks, zod validation, rate limits, hashed tokens.
- [x] Honest SOS statuses; SOS works without AI, WebGL or network; offline page.
- [x] Neutral lock-screen wording for reminders; discreet mode; PIN lock that covers the app before first paint.
- [x] 224 automated tests (156 unit, 68 integration against real PostgreSQL), 7 end-to-end flows against the production build, an axe WCAG 2.2 AA scan of 27 page and theme combinations, strict TypeScript, and lint clean with the React Compiler rules.

## Should do soon after launch

- [ ] Error monitoring that never captures request bodies or health data (for example Sentry with `sendDefaultPii: false` and scrubbing).
- [ ] Uptime checks on `/sos`, `/api/safety/sos` and the cron endpoint.
- [ ] Load test chat, SOS and the cron endpoint.
- [ ] Penetration test, or at least an OWASP ASVS level 2 self-review.
- [ ] Master-key rotation command (re-wrap every user key under a new master key id).
- [ ] Configurable journey grace period; SMS fallback for alerts (paid provider).
- [ ] Session and device list in Settings.

## Operating rules

- Never log message bodies, journal text, locations or contact details. The audit log records actions and counts only.
- Any change to triage, SOS or journeys needs: a failing test first, the e2e flows passing (`npm run test:e2e`), and a manual run on a real phone.
- Keep `docs/known-limitations.md` in step with the product. If the app makes a promise, this repository should prove it.
