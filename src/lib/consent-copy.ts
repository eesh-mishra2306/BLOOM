/** Consent purposes and the exact words shown when asking. Safe to import on the client. */

export const CONSENT_VERSION = "2026-11-24";

export const CONSENT_PURPOSES = [
  "ai_chat",
  "ai_cycle_context",
  "ai_memory",
  "location_sos",
  "location_journey",
  "mood_bloomverse",
] as const;

export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

export const CONSENT_COPY: Record<ConsentPurpose, { title: string; body: string }> = {
  ai_chat: {
    title: "Chat with Mochi using an AI service",
    body: "Your messages to Mochi are sent to the AI provider this BLOOM server uses so it can write replies. BLOOM doesn't keep your conversations. Read the provider's privacy terms, linked in Privacy, for how they handle messages.",
  },
  ai_cycle_context: {
    title: "Let Mochi see your cycle summary",
    body: "Mochi gets a short summary — your cycle day, your predicted window and symptoms from the last week — so replies can take it into account. Your full history isn't shared.",
  },
  ai_memory: {
    title: "Let Mochi remember things you save",
    body: "Only things you choose to save are kept, encrypted, and included in later chats. You can read and delete them in Privacy. Turning this off deletes everything Mochi saved.",
  },
  location_sos: {
    title: "Add my location to SOS alerts",
    body: "When you send an SOS, BLOOM reads your phone's location once and shares it with your trusted contacts. It doesn't track you at any other time.",
  },
  location_journey: {
    title: "Share my location during journeys",
    body: "While a journey is running and BLOOM is open on your screen, your location updates about once a minute for the contacts you picked. Sharing stops when the journey ends, and BLOOM deletes the last location an hour later.",
  },
  mood_bloomverse: {
    title: "Let my moods tint Bloomverse",
    body: "Your recent mood check-ins gently change the light in your garden. Nothing is shared with anyone.",
  },
};
