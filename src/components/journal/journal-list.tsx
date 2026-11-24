"use client";
import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteEntry } from "@/app/(app)/journal/actions";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { MoodIcon, moodLabel } from "@/components/wellness/mood-faces";
import { JournalComposer } from "./journal-composer";

export type ListedEntry = { id: string; title?: string; body: string; mood?: number; when: string; edited: boolean };

export function JournalList({ entries, country }: { entries: ListedEntry[]; country: string }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <ol className="space-y-3">
      {entries.map((e) => (
        <li key={e.id} className="glass-lite rounded-3xl p-4 sm:p-5">
          <article aria-labelledby={`entry-${e.id}`}>
            <header className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 id={`entry-${e.id}`} className="truncate text-xl">
                  {e.title || e.when}
                </h3>
                <p className="text-sm text-muted">
                  {e.title ? e.when : null}
                  {e.title && e.edited ? " · " : null}
                  {e.edited ? "edited" : null}
                </p>
              </div>
              {e.mood ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-sm font-semibold text-heading">
                  <MoodIcon value={e.mood} className="size-4" /> {moodLabel(e.mood)}
                </span>
              ) : null}
            </header>
            {editing === e.id ? (
              <JournalComposer country={country} entry={e} onDone={() => setEditing(null)} />
            ) : (
              <>
                <p className="whitespace-pre-wrap leading-relaxed text-fg">{e.body}</p>
                {confirming === e.id ? (
                  <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-accent-soft p-3">
                    <p className="mr-auto font-semibold text-heading">Delete this entry? This can&apos;t be undone.</p>
                    <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                      Keep it
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          await deleteEntry(e.id);
                          setConfirming(null);
                          toast("Entry deleted");
                        })
                      }
                    >
                      Delete
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2 flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(e.id)}>
                      <Pencil aria-hidden /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirming(e.id)}>
                      <Trash2 aria-hidden /> Delete
                    </Button>
                  </div>
                )}
              </>
            )}
          </article>
        </li>
      ))}
    </ol>
  );
}
