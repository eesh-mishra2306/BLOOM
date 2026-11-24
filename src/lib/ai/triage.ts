import { emergencyFor } from "@/lib/safety/emergency-numbers";

/**
 * Deterministic safety triage. Runs on every message before (and regardless of) the AI,
 * so emergency help still appears when no AI provider is configured or the provider fails.
 * Tuned for recall: a gentle false positive is better than a missed emergency.
 */

export type TriageLevel = "none" | "urgent_medical" | "crisis" | "danger";

export interface TriageResult {
  level: TriageLevel;
  reasons: string[];
}

type Rule = { level: Exclude<TriageLevel, "none">; re: RegExp; reason: string };

const IDIOM = /\b(die|dying|died) (of|from) (embarrassment|laughter|laughing|boredom|cuteness|shame|curiosity|cringe)\b/;

const RULES: Rule[] = [
  // Immediate danger from another person
  { level: "danger", reason: "being followed", re: /\b(someone|somebody|a (man|guy|stranger)|he|they|men|guys)( is| are|'s|'re)? (following|stalking|chasing) me\b/ },
  { level: "danger", reason: "being followed", re: /\bbeing (followed|stalked|chased)\b/ },
  {
    level: "danger",
    reason: "violence from someone",
    re: /\b(he|she|someone|somebody|they|my (husband|boyfriend|partner|ex|father|dad|brother|uncle|in-?laws?|mother-in-law|father-in-law))( is| are|'s|'re)? (hitting|beating|hurting|attacking|choking|threatening|abusing) me\b/,
  },
  { level: "danger", reason: "feels unsafe", re: /\b((i('m| am)|i feel|feeling)( so)? (not safe|unsafe|in danger)|(don'?t|do not) feel safe)\b/ },
  { level: "danger", reason: "assault or abduction", re: /\b(kidnap(ped)?|abduct(ed)?|raped|sexually assaulted|molested|groped)\b/ },
  { level: "danger", reason: "being held", re: /\b(trapped|locked (me )?in|won'?t let me (leave|go out))\b/ },
  { level: "danger", reason: "asks for rescue (Hinglish)", re: /\b(mujhe )?bachao\b|\b(peecha|pichha|peechha) kar (raha|rahe|rahi)\b|\bkhatre (mein|me)\b|\bmujhe maar (raha|rahe|rahi)\b/ },

  // Mental-health crisis
  { level: "crisis", reason: "mentions self-harm", re: /\b(kill|hurt|harm|cut|starve) (myself|my ?self)\b|\bself[- ]?harm(ing)?\b/ },
  { level: "crisis", reason: "mentions suicide", re: /\bsuicid(e|al)\b|\b(end|take) my (own )?life\b/ },
  { level: "crisis", reason: "wants to die", re: /\b(want|wanna|going|plan(ning)?|ready) to die\b/ },
  { level: "crisis", reason: "doesn't want to live", re: /\b(don'?t|do not) want to (live|be alive|exist|wake up)\b|\b(no|not any) (reason|point) (to|in) (live|living|going on)\b|\bbetter off (dead|without me)\b/ },
  { level: "crisis", reason: "wants to die (Hinglish)", re: /\bmarna (hai|chahti|chahta|chahte)\b|\bmar (jaana|jana) (chahti|chahta|hai)\b|\bkhud ?kushi\b|\baatmahatya\b|\bjeena nahi?n? (chahti|chahta|hai)\b/ },

  // Urgent medical
  { level: "urgent_medical", reason: "very heavy bleeding", re: /\b(soak|soaking|soaked|filling|fill)\b[^.!?]{0,40}\b(pads?|tampons?|cups?|napkins?)\b[^.!?]{0,40}\b(every|each|an|in an|within an) hour\b|\bevery hour\b[^.!?]{0,30}\b(pads?|tampons?)\b/ },
  { level: "urgent_medical", reason: "bleeding with fainting", re: /\b(bleed\w*|period|flow)\b[^.!?]{0,60}\b(dizzy|faint\w*|light ?headed|passed out|black(ed)? out)\b|\b(dizzy|faint\w*|light ?headed|passed out|black(ed)? out)\b[^.!?]{0,60}\b(bleed\w*|period)\b/ },
  { level: "urgent_medical", reason: "pain or bleeding in pregnancy", re: /\b(pregnan\w*|positive (pregnancy )?test|missed (my )?period)\b[^.!?]{0,80}\b((sharp|severe|bad|strong|intense|stabbing|one[- ]sided) [^.!?]{0,20}pain|pain[^.!?]{0,20}one side|bleed\w*|shoulder (tip )?pain)\b/ },
  { level: "urgent_medical", reason: "chest pain or breathing trouble", re: /\bchest pain\b|\b(can'?t|cannot|unable to|struggling to) breathe\b/ },
  { level: "urgent_medical", reason: "seizure or unconsciousness", re: /\b(seizure|convulsion|unconscious|not waking up)\b/ },
  { level: "urgent_medical", reason: "vomiting blood", re: /\b(vomiting|throwing up|coughing up) blood\b/ },
  { level: "urgent_medical", reason: "possible toxic shock", re: /\b(tampon|menstrual cup)\b[^.!?]{0,60}\b(high )?(fever|rash)\b/ },
  { level: "urgent_medical", reason: "pain stopping movement", re: /\bpain (is )?(so bad|so severe|unbearable)\b[^.!?]{0,30}\b(can'?t (walk|stand|move)|fainted|passed out|vomit\w*)\b/ },
  { level: "urgent_medical", reason: "fainting (Hinglish)", re: /\bbehosh\b|\b(bahut )?(zyada )?(khoon|bleeding)\b[^.!?]{0,40}\bchakkar\b|\bchakkar\b[^.!?]{0,40}\b(khoon|bleeding|period)\b/ },
];

const ORDER: TriageLevel[] = ["none", "urgent_medical", "crisis", "danger"];

export function triage(text: string): TriageResult {
  const t = text.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
  let level: TriageLevel = "none";
  const reasons: string[] = [];
  for (const rule of RULES) {
    if (!rule.re.test(t)) continue;
    if (rule.reason === "wants to die" && IDIOM.test(t)) continue;
    reasons.push(rule.reason);
    if (ORDER.indexOf(rule.level) > ORDER.indexOf(level)) level = rule.level;
  }
  return { level, reasons: [...new Set(reasons)] };
}

export interface Resource {
  label: string;
  href: string;
  number?: string;
  detail?: string;
}

const call = (label: string, number: string, detail?: string): Resource => ({ label, number, href: `tel:${number}`, detail });

export function resourcesFor(level: Exclude<TriageLevel, "none">, country: string): Resource[] {
  const e = emergencyFor(country);
  const india = e.code === "IN";
  switch (level) {
    case "danger":
      return [
        call(`Call ${e.emergency}`, e.emergency, "Police, ambulance and fire"),
        ...(india ? [call("Women Helpline 181", "181", "24×7 support for women")] : []),
        { label: "Open SOS", href: "/sos", detail: "Alert your trusted contacts" },
      ];
    case "crisis": {
      const line = india
        ? call("Tele-MANAS 14416", "14416", "Free, confidential, 24×7, in your language")
        : e.extras.find((x) => x.number === "988")
          ? call("Call or text 988", "988", "Suicide and crisis support, 24×7")
          : null;
      return [...(line ? [line] : []), call(`Call ${e.emergency}`, e.emergency, "If you might act on these thoughts, or you're in danger now")];
    }
    case "urgent_medical":
      return [
        call(`Call ${e.emergency}`, e.emergency, "For an ambulance"),
        { label: "Find an emergency department", href: "https://www.google.com/maps/search/hospital+emergency+near+me", detail: "Opens maps" },
      ];
  }
}

export const TRIAGE_HEADLINE: Record<Exclude<TriageLevel, "none">, string> = {
  danger: "If you're in danger, get help now",
  crisis: "You don't have to go through this alone",
  urgent_medical: "This could need medical help now",
};
