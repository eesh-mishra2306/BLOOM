import { apiUser } from "@/lib/auth/session";
import { isoToday } from "@/lib/dates";
import { problem } from "@/lib/http";
import { getProfile } from "@/lib/profile";
import { listJournal } from "@/lib/wellness/repo";

const MOODS = ["", "Rough", "Low", "Okay", "Good", "Great"];

export async function GET(req: Request) {
  const user = await apiUser(req);
  if (!user) return problem(401, "unauthorized", "Sign in to download your journal.");
  const profile = await getProfile(user.id);
  const timeZone = profile?.timeZone ?? "Asia/Kolkata";
  const entries = await listJournal(user.id, undefined, 100_000);

  const lines = [`# My BLOOM journal`, ``, `Downloaded ${isoToday(timeZone)} · ${entries.length} ${entries.length === 1 ? "entry" : "entries"}`, ``];
  for (const e of entries) {
    const when = e.createdAt.toLocaleString("en-IN", { timeZone, dateStyle: "full", timeStyle: "short" });
    lines.push(`---`, ``, `## ${e.title || when}`, ``);
    if (e.title) lines.push(`*${when}*`, ``);
    if (e.mood) lines.push(`Mood: ${MOODS[e.mood]}`, ``);
    lines.push(e.body, ``);
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="bloom-journal-${isoToday(timeZone)}.md"`,
      "Cache-Control": "no-store",
    },
  });
}
