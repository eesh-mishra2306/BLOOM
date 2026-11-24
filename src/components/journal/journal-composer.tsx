"use client";
import { Lock, Shuffle } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { saveEntry } from "@/app/(app)/journal/actions";
import { SafetyCard } from "@/components/mochi/safety-card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { MOOD_SCALE } from "@/components/wellness/mood-faces";
import { resourcesFor, triage, TRIAGE_HEADLINE } from "@/lib/ai/triage";
import { emitBloom } from "@/lib/events";
import { cn } from "@/lib/utils";
import { PROMPTS } from "@/lib/wellness/prompts";

export type EditableEntry = { id: string; title?: string; body: string; mood?: number };

export function JournalComposer({ country, prompt, entry, onDone }: { country: string; prompt?: string; entry?: EditableEntry; onDone?: () => void }) {
  const [title, setTitle] = useState(entry?.title ?? "");
  const [body, setBody] = useState(entry?.body ?? "");
  const [mood, setMood] = useState<number | undefined>(entry?.mood);
  const [cue, setCue] = useState(prompt);
  const [flagged, setFlagged] = useState(false);
  const [pending, start] = useTransition();
  const safety = useMemo(() => (flagged ? triage(`${title} ${body}`) : { level: "none" as const }), [flagged, title, body]);

  function save() {
    start(async () => {
      const res = await saveEntry({ id: entry?.id, title: title.trim() || undefined, body, mood });
      if (!res.ok) return toast(res.error, "error");
      const level = triage(`${title} ${body}`).level;
      if (!entry) emitBloom({ type: "activity", kind: "journal" });
      toast(entry ? "Entry updated" : "Saved to your journal", "success");
      if (level !== "none") {
        setFlagged(true);
        return;
      }
      if (!entry) {
        setTitle("");
        setBody("");
        setMood(undefined);
        setCue(undefined);
      }
      onDone?.();
    });
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      {!entry ? (
        <div className="flex flex-wrap items-center gap-2">
          {cue ? <p className="font-display text-lg text-heading">{cue}</p> : <p className="text-muted">Write about anything. No one is grading this.</p>}
          <button
            type="button"
            onClick={() => setCue(PROMPTS[(PROMPTS.indexOf(cue ?? "") + 1 + Math.floor(Math.random() * (PROMPTS.length - 1))) % PROMPTS.length])}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-pink-ink hover:bg-accent-soft"
          >
            <Shuffle aria-hidden className="size-4" /> {cue ? "Another prompt" : "Give me a prompt"}
          </button>
        </div>
      ) : null}
      <label className="sr-only" htmlFor={`title-${entry?.id ?? "new"}`}>
        Title (optional)
      </label>
      <input
        id={`title-${entry?.id ?? "new"}`}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        placeholder="Title (optional)"
        className="h-11 w-full rounded-2xl border border-line bg-surface-strong px-4 font-display text-lg text-heading placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-muted"
      />
      <label className="sr-only" htmlFor={`body-${entry?.id ?? "new"}`}>
        Your entry
      </label>
      <textarea
        id={`body-${entry?.id ?? "new"}`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={10_000}
        rows={entry ? 6 : 8}
        placeholder={cue ? "Start writing…" : "What's on your mind?"}
        className="field-sizing-content min-h-40 w-full rounded-2xl border border-line bg-surface-strong p-4 leading-relaxed text-fg placeholder:text-muted"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Mood for this entry (optional)" className="flex gap-1">
          {MOOD_SCALE.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mood === value}
              aria-label={label}
              title={label}
              onClick={() => setMood(mood === value ? undefined : value)}
              className={cn("grid size-10 place-items-center rounded-full", mood === value ? "bg-accent text-accent-fg" : "text-muted hover:bg-accent-soft")}
            >
              <Icon aria-hidden className="size-5" />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {onDone ? (
            <Button type="button" variant="ghost" onClick={onDone}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={pending || !body.trim()}>
            {pending ? "Saving…" : entry ? "Save changes" : "Save entry"}
          </Button>
        </div>
      </div>
      {!entry ? (
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Lock aria-hidden className="size-3.5" /> Encrypted before it&apos;s saved. Mochi doesn&apos;t read your journal.
        </p>
      ) : null}
      {flagged && safety.level !== "none" ? <SafetyCard headline={TRIAGE_HEADLINE[safety.level]} resources={resourcesFor(safety.level, country)} /> : null}
    </form>
  );
}
