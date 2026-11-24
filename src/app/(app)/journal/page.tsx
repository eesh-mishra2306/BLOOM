import { Download, Search } from "lucide-react";
import type { Metadata } from "next";
import { JournalComposer } from "@/components/journal/journal-composer";
import { JournalList } from "@/components/journal/journal-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Glass } from "@/components/ui/glass";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listJournal } from "@/lib/wellness/repo";

export const metadata: Metadata = { title: "Journal" };

export default async function JournalPage({ searchParams }: PageProps<"/journal">) {
  const { user, profile } = await requireOnboardedUser("/journal");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const prompt = typeof sp.prompt === "string" ? sp.prompt.slice(0, 200) : undefined;
  const entries = await listJournal(user.id, q || undefined);
  const fmt = (d: Date) => d.toLocaleString("en-IN", { timeZone: profile.timeZone, weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-4xl">Journal</h1>
        <a href="/api/journal/export" className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-pink-ink hover:bg-accent-soft">
          <Download aria-hidden className="size-4" /> Download all entries
        </a>
      </div>

      <Glass tier={1} petal>
        <h2 className="sr-only">New entry</h2>
        <JournalComposer country={profile.country} prompt={prompt} />
      </Glass>

      <section aria-labelledby="entries-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="entries-heading" className="text-2xl">
            {q ? `Entries mentioning “${q}”` : "Past entries"}
          </h2>
          <form role="search" className="relative w-full sm:w-72">
            <label htmlFor="journal-search" className="sr-only">
              Search your journal
            </label>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
            <input
              id="journal-search"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Search your journal"
              className="h-11 w-full rounded-full border border-line bg-surface-strong pr-4 pl-10 text-fg placeholder:text-muted"
            />
          </form>
        </div>
        {entries.length ? (
          <JournalList
            country={profile.country}
            entries={entries.map((e) => ({ id: e.id, title: e.title, body: e.body, mood: e.mood, when: fmt(e.createdAt), edited: e.updatedAt.getTime() - e.createdAt.getTime() > 60_000 }))}
          />
        ) : q ? (
          <EmptyState title="Nothing matches that" body="Try a different word, or clear the search to see everything." />
        ) : (
          <EmptyState title="Your first entry will show up here" body="Short is fine. A sentence about today is a good start." />
        )}
      </section>
    </div>
  );
}
