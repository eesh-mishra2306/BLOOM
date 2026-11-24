/**
 * Mochi can't act on anything. It may only *suggest* an in-app place, by writing a marker
 * like [[suggest:breathing]]; the UI turns allowed markers into buttons the user can tap.
 */

export const SUGGESTIONS = {
  breathing: { label: "Breathe with me", href: "/wellness#breathe" },
  "log-cycle": { label: "Log today", href: "/cycle" },
  shield: { label: "Open Bloom Shield", href: "/safety" },
  journal: { label: "Write it down", href: "/journal" },
  bloomverse: { label: "Visit Bloomverse", href: "/bloomverse" },
  mood: { label: "Check in with your mood", href: "/wellness#mood" },
} as const;

export type SuggestionKey = keyof typeof SUGGESTIONS;

const MARKER = /\[\[suggest:([a-z-]+)\]\]/g;

export function parseSuggestions(text: string): { clean: string; suggestions: SuggestionKey[] } {
  const suggestions: SuggestionKey[] = [];
  let clean = text.replace(MARKER, (_, key: string) => {
    if (key in SUGGESTIONS && !suggestions.includes(key as SuggestionKey) && suggestions.length < 2) suggestions.push(key as SuggestionKey);
    return "";
  });
  // A marker still streaming in shouldn't flash on screen.
  clean = clean.replace(/\[\[[^\]]*$/, "");
  clean = clean.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return { clean, suggestions };
}
