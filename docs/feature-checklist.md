# Feature checklist

Status against the master prompt (`docs/spec/master-prompt.md`) and the owner's additions (`docs/spec/additions.md`).

- ✅ Built and tested
- 🟡 Partly built (the gap is named)
- ⏭️ Deferred to a later phase on purpose (see [roadmap.md](roadmap.md))

## Owner's signature features

| Feature | Status | Where |
| --- | --- | --- |
| Mochi Everywhere: 3D kitten on every screen, reacts, sleeps, expands into chat | ✅ | `components/mochi/*`; dock on every app page except SOS, chat and Bloomverse |
| Bloomverse: 3D garden that grows from wellness activities, themes, moods, ambient sound, companion | ✅ | `/bloomverse` |
| Bloom Shield: one-tap help, journeys, trusted contacts, discreet interface, works without AI or network | ✅ | `/sos`, `/safety`, `/journey`, offline page |

## 2. Visual design

| Item | Status | Notes |
| --- | --- | --- |
| Liquid Petal design language, palette, glass, petal shapes | ✅ | [design-system.md](design-system.md) |
| Animated background | ✅ | 2D petal field, can be turned off |
| Motion and transitions, reduced-motion support | ✅ | |
| Light, dark, discreet and high-contrast themes | ✅ | axe-clean in all four |

## 3. AI companion

| Item | Status | Notes |
| --- | --- | --- |
| Animated companion with expressions | ✅ | four species, six colours, accessories |
| Real AI chat, streaming, provider choice | ✅ | Anthropic, OpenAI or Google. The key stays on the server |
| Sources for health answers | ✅ | BM25 over a cited knowledge base |
| Safety triage (danger, crisis, urgent medical) with helplines | ✅ | on the device and on the server, rule-based |
| Memory with consent; read and delete | ✅ | privacy centre |
| Personality and language (English, Hinglish) | ✅ | companion studio |
| Voice conversation | ⏭️ | |

## 4. Menstrual tracking

| Item | Status | Notes |
| --- | --- | --- |
| Period calendar, day logging (flow, cramps, symptoms, moods, energy, sleep, notes) | ✅ | |
| Cycle visualisation (ring, phases) | ✅ | |
| Prediction engine with uncertainty and FIGO irregularity flags | ✅ | 20 unit tests |
| Fertile window (opt-in display, never framed as contraception) | ✅ | |
| Insights (averages, ranges, top symptoms and moods) | ✅ | |

## 5. PCOS/PCOD support centre | ⏭️ | needs clinician-reviewed content |

## 6. Bloom Shield

| Item | Status | Notes |
| --- | --- | --- |
| Large SOS, configurable countdown and cancel | ✅ | 0–10 s |
| Trusted contact alerts with honest delivery status | ✅ | Web Push, receipts, "I'm on it" |
| Location with explicit consent | ✅ | |
| Emergency call shortcut (112 in India; other countries configured) | ✅ | |
| Emergency information screen | ✅ | sealed, optional offline copy |
| Trusted circle: invite and consent flow, management | ✅ | up to 8 |
| Journeys: destination, contacts, time-limited session, status sharing, check-ins, safe arrival | ✅ | |
| Missed check-in escalation | ✅ | prompt at due time, alert after 5 minutes, once per missed check-in |
| User-configured escalation rules | 🟡 | the check-in interval is configurable; the 5-minute grace isn't yet |
| Live location during journeys | 🟡 | while the page is open. Browsers can't share location in the background; the native apps will |
| Discreet mode: neutral look, quick exit, app lock, session timeout | ✅ | |
| Sensitive notification suppression | 🟡 | reminder wording is always neutral; there's no per-notification setting |
| Location permission audit, privacy checkup | ✅ | privacy centre |
| Emergency contact information | ✅ | |
| Offline SOS | ✅ | service worker and a static page |
| Emergency preparedness guides, safety education | 🟡 | the knowledge base has an India safety entry; no guide library yet |
| Evidence journaling | 🟡 | the encrypted, timestamped journal and its export cover the basics; no dedicated evidence mode |

## 7. Sexual and reproductive health education | 🟡 | a 14-entry cited knowledge base inside Mochi and the daily reading. The full learning centre is deferred until clinicians review it |

## 8. Emotional wellness

| Item | Status | Notes |
| --- | --- | --- |
| Mood check-ins with tags and notes | ✅ | triage on notes |
| Breathing exercises (slow, box, 4-7-8, double sigh), haptics, sound cues | ✅ | |
| Gentle goals without streaks | ✅ | |
| Reflection prompts | ✅ | daily |
| AI wellness insights | ⏭️ | |

## 9. Music and audio

| Item | Status | Notes |
| --- | --- | --- |
| Original soundscapes: rain, forest, ocean, soft music, white noise | ✅ | synthesised on the device, no licensed audio |
| Breathing sound cues | ✅ | |
| Opt-in only, respects autoplay rules | ✅ | |
| Pauses during emergencies | ✅ | tested |
| Guided relaxation (voice) | ⏭️ | |
| Spotify integration | ⏭️ | |

## 10. Personalised home

| Item | Status |
| --- | --- |
| Greeting, companion greeting, cycle overview, mood check-in, daily reading (cycle-aware), quick safety, what's coming up, ambient controls, daily reflection, garden link | ✅ |

## 11. Additional features

| Item | Status | Notes |
| --- | --- | --- |
| Bloom Garden (merged into Bloomverse), no penalties, no streaks | ✅ | |
| Journal: mood, encryption, search, export, deletion | ✅ | |
| Journal: rich text, voice notes | ⏭️ | plain text for now |
| Doctor visit assistant (PDF summaries) | ⏭️ | |
| Wellness pattern explorer | 🟡 | cycle insights only |
| Accessibility: screen readers, large text, contrast, reduced motion | ✅ | |
| Accessibility: voice navigation | ⏭️ | |
| Privacy centre | ✅ | |

## 13. Security and privacy | ✅ | see [security-privacy.md](security-privacy.md). An independent review is still pending |

## 16. Testing

| Item | Status |
| --- | --- |
| Unit and integration tests | ✅ 224 tests: 156 unit, 68 integration against real PostgreSQL |
| End-to-end browser flows | ✅ 7 flows, run against the production build |
| Accessibility scan | ✅ 27 page and theme scans, no WCAG 2.2 AA violations |
| Load and penetration testing | ⏭️ before launch |

## 19. Deliverables

Source code, clean structure, database schema and migrations, auth configuration, AI integration, secured API endpoints, responsive frontend, working core flows, automated tests, `.env.example`, setup and deployment instructions (README), architecture diagrams, security and privacy documentation, this checklist, [known-limitations.md](known-limitations.md) and [production-readiness.md](production-readiness.md): ✅
