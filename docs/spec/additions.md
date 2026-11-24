# BLOOM v1 — additions and decisions on top of the master prompt

The master prompt (`docs/spec/master-prompt.md`) is the product spec. This file records what the
product owner (Eesh) added and decided on 24 Nov 2026, plus the calls made on their behalf. Where
this file and the master prompt disagree, this file wins.

## Signature features added by the owner

1. **Mochi Everywhere** — a tiny 3D kitten that appears throughout the app, reacts to
   interactions, answers questions and offers help. It can sleep in the corner, follow selected
   interface interactions, and expand into the full AI chat. **Mochi stays 3D** (owner decision).
2. **Bloomverse** — a personal 3D sanctuary: an interactive floral garden that changes with the
   user's chosen themes, moods and wellness activities. Users can explore it, relax with ambient
   sound, and spend time with their companion.
3. **Bloom Shield, safety without complexity** — one-tap emergency help, temporary journey
   sharing, trusted contacts and a discreet interface. The emergency experience must stay fast
   and simple even when animations, AI or network services are unavailable.

## What BLOOM is for (owner's words, condensed)

A real, scalable consumer product — not a portfolio piece. Owner's roadmap:

1. Functional web app: polished, responsive, with AI companionship, period tracking, wellness
   features and foundational safety tools. **← this build**
2. Real-world testing with women: usability, accuracy, validated safety workflows.
3. Mobile launch (Android/iOS) with native notifications and location.
4. AI personalisation: richer cycle insights, multilingual AI, wearables.
5. Startup expansion: partnerships with clinicians, safety organisations, universities.

## Decisions made on the owner's behalf (owner approved the playback: "works make it")

| Area | Decision | Why |
|---|---|---|
| First users | Women in India, **18+**, mostly mid-range Android phones. English UI; Mochi can reply in Hinglish. Default emergency number 112. | DPDP Rules require verifiable parental consent for under-18s; core obligations phase in by 14 May 2027. |
| 3D Mochi on every screen | One small WebGL canvas, slows when asleep, pauses when the tab is hidden, lowers quality on weak devices, unmounts during SOS, flat SVG fallback. | Owner wants 3D everywhere; this keeps battery and safety intact. |
| Scope of v1 | Mochi + AI chat; period tracking with honest uncertainty; mood check-ins, breathing, private journal; Bloom Shield (SOS, trusted circle, journeys, discreet mode, offline SOS); Bloomverse (merged with the master prompt's Bloom Garden); dashboard; settings; privacy centre. | Matches the owner's Phase 1 line. |
| Deferred | PCOS centre, learning centre (needs clinician review), Spotify, doctor PDFs, Hindi UI, native apps, voice, reminders by push. | Later owner phases. |
| ORM | **Drizzle** instead of Prisma. | Prisma's schema engine downloads from binaries.prisma.sh, which the build workspace cannot reach, so Prisma migrations could not be verified here. Drizzle is pure TypeScript. |
| Caching | Next.js `cacheComponents` **off**. No server-side caching of personal data. | Every app page is per-user and sensitive; cache keys are stored in plain text. |
| Data privacy | Per-user data key (AES-256-GCM) wrapped by a master key; all health payloads encrypted at the application layer; keys live in a separate `keystore` schema so account deletion crypto-shreds data once key backups (≤7 days) roll off. Server can decrypt to compute predictions and (with consent) give Mochi context. | Real product needs durable multi-device storage; E2EE journal is a later upgrade. |
| Automatic SOS alerts | Free Web Push to trusted contacts who accepted an invite; delivery receipt when the alert is shown on their device; acknowledgement when they open it. SMS/email are extension points. | No paid provider needed; delivery is confirmable. |
| Offline SOS | Static zero-dependency `sos-offline.html` precached by a service worker: `tel:` and `sms:` links with GPS coordinates. | Works without internet, JS frameworks, animations or AI. |
| Dropped libraries | TanStack Query, React Hook Form, GSAP, Lenis. | Server Components + Server Actions cover data flow; Motion covers animation. Master prompt rule: no unnecessary complexity. |
| Typography | Baloo 2 (display) + Mukta (text), both by Ek Type, both with Devanagari. | Soft, petal-like forms; Hindi-ready for the owner's Phase 4. |

## Verified facts used in product copy (checked 24 Nov 2026)

- India ERSS emergency number: **112** (police, fire, health). Women Helpline: **181** (MWCD, integrated with 112).
- Tele-MANAS national mental-health helpline: **14416** or **1-800-891-4416**, free, 24×7 (MoHFW).
- FIGO 2018 normal cycle parameters: frequency **24–38 days**; regularity (shortest-to-longest
  variation) **≤7–9 days**; duration **≤8 days**.
- Heavy bleeding red flag used by triage: soaking through a pad or tampon **every hour for 2+ hours**,
  or feeling faint/dizzy with heavy bleeding (NHS / ACOG guidance).
