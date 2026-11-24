import { KNOWLEDGE, type KnowledgeEntry } from "./knowledge";

/**
 * Lexical retrieval (BM25) over the curated notes. No embeddings service needed, fully
 * deterministic and testable; swap for pgvector embeddings when the library grows.
 */

const STOP = new Set(
  "a an and are as at be but by can do does did for from had has have how i i'm im if in into is it its just me my of on or so that the their them then there these they this to was we what when where which who why will with you your am been being about after before again any very really feel feeling get got hai ho raha rahi rahe mein me ka ki ke kya hoon hun mujhe mera meri bahut aur bhi toh nahi like whats thats dont ive know tell think want need also much many some more most other would could should maybe today now yes no okay ok hi hello hey please thanks thank look looks one".split(" "),
);

/** Everyday and Hinglish words mapped onto the vocabulary the notes use. */
const SYNONYMS: Record<string, string[]> = {
  cramp: ["pain", "period"],
  dard: ["pain"],
  pet: ["tummy", "stomach"],
  mahina: ["period"],
  mc: ["period"],
  mens: ["period"],
  khoon: ["bleeding"],
  chakkar: ["dizzy"],
  pcod: ["pcos"],
  thakan: ["tired"],
  kamzori: ["weak", "tired"],
  neend: ["sleep"],
  tension: ["stress"],
  ghabrahat: ["anxiety", "panic"],
  udaas: ["sad", "low"],
  akela: ["lonely"],
  safed: ["white", "discharge"],
  khujli: ["itching"],
  late: ["missed", "period"],
};

function stem(word: string): string {
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.toLowerCase().replace(/[’']/g, "").split(/[^a-z0-9]+/)) {
    if (raw.length < 2 || STOP.has(raw)) continue;
    const s = stem(raw);
    out.push(s);
    for (const syn of SYNONYMS[s] ?? SYNONYMS[raw] ?? []) out.push(stem(syn));
  }
  return out;
}

type Doc = { entry: KnowledgeEntry; tf: Map<string, number>; length: number };

const K1 = 1.2;
const B = 0.75;

const docs: Doc[] = KNOWLEDGE.map((entry) => {
  // Titles and tags are weighted by repetition; they describe what the note is for.
  const tokens = [...tokenize(entry.title), ...tokenize(entry.title), ...entry.tags.flatMap((t) => [...tokenize(t), ...tokenize(t), ...tokenize(t)]), ...tokenize(entry.body)];
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return { entry, tf, length: tokens.length };
});
const avgLength = docs.reduce((a, d) => a + d.length, 0) / docs.length;
const df = new Map<string, number>();
for (const d of docs) for (const term of d.tf.keys()) df.set(term, (df.get(term) ?? 0) + 1);

function idf(term: string) {
  const n = df.get(term) ?? 0;
  return Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
}

export function retrieve(query: string, k = 3): KnowledgeEntry[] {
  const terms = [...new Set(tokenize(query))];
  if (terms.length === 0) return [];
  const scored = docs
    .map((d) => {
      let score = 0;
      for (const term of terms) {
        const f = d.tf.get(term);
        if (!f) continue;
        score += idf(term) * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.length) / avgLength)));
      }
      return { entry: d.entry, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  const top = scored[0]?.score ?? 0;
  if (top < 1.5) return [];
  return scored.filter((s) => s.score >= top * 0.4).slice(0, k).map((s) => s.entry);
}
