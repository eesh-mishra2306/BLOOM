# Known limitations

The same limits the app itself is honest about, in one place.

## Safety

- **BLOOM doesn't contact emergency services.** SOS alerts the person's own trusted contacts and puts 112 (or the local number) one tap away.
- **Automatic alerts need the contact's cooperation.** A contact must accept the invite and turn on notifications in a browser that supports Web Push. On iPhone that means adding BLOOM to the Home Screen first (iOS 16.4+). Otherwise the SOS screen says so and offers calling and texting, which always work.
- **Push isn't instant or guaranteed.** BLOOM reports "sent" when a push service accepts the alert and "delivered" only when the contact's device confirms it. Phones in battery saver or with BLOOM's notifications blocked may not show it.
- **Journey location only updates while the journey page is open.** Browsers don't allow background location. Check-ins and escalation still work with the page closed, as long as a scheduler calls `/api/cron/journeys`.
- **Journeys need a scheduler** that calls the cron endpoint every minute. Without one, a missed check-in escalates only when the traveller's screen or a contact's follow-along page next asks the server. Vercel's Hobby plan can't run per-minute cron jobs. When the scheduler hasn't run for 5 minutes, the journey planner and live screen say that reminders and alerts only work while BLOOM is open on screen.
- **The grace period is fixed at 5 minutes.** The check-in interval is the person's choice; the grace period isn't yet.
- **The PIN lock is for casual privacy on a shared phone.** It doesn't protect against someone who knows the phone's passcode, can open developer tools, or can clear site data.
- **Discreet mode changes how BLOOM looks.** It can't hide that a browser visited the site, and the installed app keeps its name and icon.

## Health

- **Predictions are estimates** based on the person's own logs, or on the cycle length they gave at the start. They aren't medical advice and must never be used as contraception. The app says this wherever fertile days appear.
- **The knowledge base hasn't been clinically reviewed.** Each entry cites NHS, MSD Manuals, MoHFW and others, and is marked `reviewed: false` in the code.
- **Triage is rule-based** (English and common Hinglish phrasing). It can miss unusual wording, and it errs toward showing helplines.

## Mochi

- Mochi uses a third-party model when an API key is configured. Messages go to that provider while the person chats, as the consent and the privacy centre explain. Mochi can be wrong.
- Mochi doesn't keep conversation history between sessions. It only remembers notes the person chooses to save.
- With no provider configured, Mochi says so and only the safety cards and sources work.

## Data

- Encryption protects against database leaks. It doesn't protect against whoever operates the server with the master key. Journal end-to-end encryption is a later upgrade.
- Crypto-shredding on deletion is complete only once any backups of the key table have expired. Keep key backups short (7 days or less).
- Rotating `BETTER_AUTH_SECRET` invalidates follow-along links for journeys in progress.

## Product scope

- English interface only. Mochi can reply in Hinglish.
- Not built yet: PCOS centre, learning centre, doctor-visit PDFs, Spotify, guided voice relaxation, rich-text and voice journal, native apps, push reminders for logging. See [roadmap.md](roadmap.md).
- Real push delivery was tested with a fake push sender and a real browser subscription flow, not against live FCM or APNs from this build environment. Test it on real phones before launch.
