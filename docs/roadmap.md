# Roadmap

The owner's five phases, with what each needs from this codebase.

## Phase 1: Functional web app ✅ (this build)

AI companionship (Mochi), period tracking with honest predictions, wellness (moods, breathing, goals, journal), Bloom Shield (SOS, trusted circle, journeys, discreet mode, offline SOS), Bloomverse, home screen, settings and the privacy centre.

## Phase 2: Real-world testing

- Recruit 20–50 women across a few cities, with contacts on varied phones. Run SOS and journey drills, and measure push delivery and receipt times.
- Clinician review of the knowledge base and triage. Legal review (DPDP). Publish a privacy notice and terms. See [production-readiness.md](production-readiness.md).
- Add privacy-respecting product analytics (aggregate, opt-in, no health data) to learn which features matter.
- Make the journey grace period configurable; add an SMS fallback for alerts.
- Accessibility testing with screen-reader users, in English and Hindi.

## Phase 3: Mobile launch

- Wrap the web app with Capacitor, or build React Native screens around the same API, for:
  - background location during journeys
  - reliable native notifications
  - a home-screen SOS widget, and a power-button or shake shortcut where the platform allows it.
- Keep `src/lib/*` as the shared core. The route handlers are already the API.
- Store the master-key-wrapped keys as today; consider device-held keys for an end-to-end-encrypted journal.

## Phase 4: AI personalisation

- Richer cycle insights and the wellness pattern explorer (correlations shown without implying causation).
- Hindi interface (the fonts already cover Devanagari), and more Indian languages for Mochi.
- Doctor-visit assistant: symptom timeline and questions, as a PDF.
- PCOS/PCOD centre and a learning centre, both clinician-reviewed.
- Guided voice relaxation; optional Spotify connection.
- Wearables (cycle-related temperature and sleep), only with explicit consent.

## Phase 5: Startup expansion

- Partnerships: gynaecologists and clinics, women's safety organisations, universities (campus safety journeys), state helplines.
- Organisation accounts for campuses (with no access to individuals' data).
- Independent security certification and published transparency reports.
