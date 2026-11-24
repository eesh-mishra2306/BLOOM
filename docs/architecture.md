# Architecture

BLOOM is one Next.js 16 application (App Router, React 19, TypeScript). It talks to one PostgreSQL database. There are no separate services: server components read data directly, server actions handle form-style changes, and a small number of route handlers serve browsers, service workers and schedulers.

```mermaid
flowchart LR
  subgraph Phone["Person's phone or laptop"]
    UI["Next.js pages<br/>(React 19, Tailwind 4, Motion)"]
    R3F["Mochi and Bloomverse<br/>(three.js via React Three Fiber)"]
    SW["Service worker<br/>push · receipts · offline SOS"]
    LS[("localStorage<br/>display prefs · PIN hash ·<br/>offline emergency card")]
  end
  subgraph Server["BLOOM server (Node)"]
    PX["proxy.ts<br/>CSP nonce · auth redirect"]
    RSC["Server components and actions"]
    API["Route handlers<br/>/api/companion/chat · /api/safety/* ·<br/>/api/journey/* · /api/cron/journeys · exports"]
    AUTH["Better Auth<br/>password · passkeys · sessions"]
    CRYPTO["Envelope encryption<br/>AES-256-GCM per-user keys"]
  end
  DB[("PostgreSQL<br/>public schema: app data (sealed)<br/>keystore schema: wrapped keys")]
  AI["AI provider<br/>(Anthropic by default)"]
  PUSH["Browser push services<br/>(FCM, Mozilla, Apple)"]
  CRON["Scheduler<br/>(every minute)"]
  Contacts["Trusted contacts'<br/>phones"]

  UI --> PX --> RSC
  UI --> API
  RSC --> CRYPTO --> DB
  API --> CRYPTO
  API --> AUTH --> DB
  API -- "only with ai_chat consent" --> AI
  API --> PUSH --> Contacts
  CRON --> API
  SW -. "offline: tel: and sms: links" .- Contacts
```

## Principles the code follows

- **Nothing pretends.** Mochi's replies come from a real model or Mochi says the AI isn't connected. SOS statuses come from push-service responses and device receipts, never from optimism. Predictions carry their uncertainty.
- **Safety doesn't depend on the clever parts.** SOS works with no AI, no WebGL, no animation and no network. Triage runs on the device and on the server, independent of the model.
- **Personal data is sealed at the application layer.** The database sees ciphertext for every health, journal, contact and location payload. See [security-privacy.md](security-privacy.md).
- **Consent is per purpose and recorded.** AI chat, AI cycle context, AI memory, SOS location, journey location and mood-tinted Bloomverse each have their own switch and history.

## Main flows

### Talking to Mochi

```mermaid
sequenceDiagram
  participant P as Person
  participant C as Chat panel (browser)
  participant R as /api/companion/chat
  participant T as Triage (rules)
  participant K as Knowledge base (BM25)
  participant M as AI model
  P->>C: types a message
  C->>T: on-device triage
  T-->>C: crisis / danger / urgent? show helplines immediately
  C->>R: POST (same-site, signed in, rate limited, consent checked)
  R->>T: server triage
  R-->>C: data-safety part (if any)
  R->>K: retrieve cited sources
  R-->>C: data-sources part
  R->>M: instructions + consented context + history
  M-->>C: streamed reply with [S1] citations
```

If no provider is configured, the route sends a `data-notice` part and no reply text. The safety card and the sources still arrive.

### SOS

```mermaid
sequenceDiagram
  participant P as Person
  participant S as SOS screen
  participant A as /api/safety/sos
  participant D as dispatchAlerts
  participant W as Push service
  participant K as Contact's phone (service worker)
  P->>S: tap SOS
  S->>S: countdown with Cancel (configurable, 0–10 s)
  S->>S: emit emergency-start (sounds stop)
  S->>A: POST
  A->>D: alert accepted contacts
  D->>W: Web Push per device
  W-->>D: accepted or failed or gone
  D-->>S: per-contact status: sent / failed / no device / invite pending
  K->>A: receipt when the notification is shown → "delivered"
  K->>A: "I'm on it" from the alert page → acknowledged
  S->>S: polls every 4 s, shows exactly what is known
  Note over S: Call 112 and Text buttons work throughout,<br/>even when everything above fails
```

When there's no connection, the service worker serves `public/sos-offline.html`. It reads the emergency card from localStorage and offers `tel:` and `sms:` links with GPS coordinates.

### Journeys

A journey has an expected arrival time and optional check-ins every 10, 15 or 30 minutes. The rules are pure functions in `src/lib/safety/journey-rules.ts`:

```mermaid
stateDiagram-v2
  [*] --> active: start (contacts get a follow-along link)
  active --> active: check in / add time
  active --> active: due → prompt the traveller (once per check-in)
  active --> escalated: due + 5 min grace, no check-in → alert contacts (once per check-in)
  escalated --> active: traveller checks in → contacts told "checked in"
  active --> arrived: "I've arrived" → contacts told
  escalated --> arrived
  active --> ended: "End without arriving"
  escalated --> ended: contacts told it was ended
  active --> ended: link expires 12 h after arrival time
  arrived --> [*]: location deleted 1 h later
  ended --> [*]: location deleted 1 h later
```

`processJourneys` runs from the scheduler, and `processJourney` runs whenever the traveller's screen or a contact's follow-along page asks about a journey. Each successful scheduler run updates `job_heartbeat`; when it is more than 5 minutes old, the journey screens say that reminders and alerts only work while BLOOM is open. Each step claims its row with a conditional `UPDATE … RETURNING`, so overlapping runs can't send the same alert twice.

### Bloomverse

Wellness activities (breathing ≥ 60 s, mood check-ins, journal entries, cycle logs, completed goals) are recorded in `wellness_activity`. `placeFlowers` turns them into flowers deterministically: positions come from a hash of each activity id, and the oldest are placed first, so a new flower never moves an old one. Each species is one merged geometry drawn with one instanced mesh, and a vertex shader makes them sway. The soundscapes are synthesised once in an `OfflineAudioContext`, made seamless and looped, so playback doesn't depend on timers.

## Folder responsibilities

| Folder | Holds |
| --- | --- |
| `src/lib/cycle` | Day logs (sealed), period derivation, FIGO-based prediction, insights |
| `src/lib/ai` | Triage rules, knowledge base and BM25 retrieval, prompt builder, provider selection, memory, cycle context |
| `src/lib/safety` | Contacts and invites, SOS, push dispatch and receipts, journeys and their rules, devices, emergency numbers and info |
| `src/lib/wellness` | Moods, journal, goals, breathing timings, reflection prompts, activity records |
| `src/lib/garden`, `src/lib/audio` | Flower placement and sky mapping; the ambient engine and soundscape synthesis |
| `src/lib/crypto` | `seal`/`open` (AES-256-GCM), per-user key management, crypto-shredding |
| `src/lib/privacy.ts` | Full data export and account deletion |
| `src/components/*` | UI per feature; `ui/` holds the shared primitives |
