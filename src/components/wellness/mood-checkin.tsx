"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { logMood } from "@/app/(app)/wellness/actions";
import { SafetyCard } from "@/components/mochi/safety-card";
import { Button } from "@/components/ui/button";
import { ChipToggle } from "@/components/ui/chip";
import { TextareaField } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { resourcesFor, triage, TRIAGE_HEADLINE } from "@/lib/ai/triage";
import { emitBloom } from "@/lib/events";
import { cn } from "@/lib/utils";
import { MOOD_SCALE } from "./mood-faces";

const TAGS = ["rested", "grateful", "proud", "calm", "stressed", "anxious", "lonely", "overwhelmed", "angry", "tired"];

export function MoodCheckin({ country, compact = false }: { country: string; compact?: boolean }) {
  const [mood, setMood] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const safety = useMemo(() => triage(note), [note]);

  function save() {
    if (!mood) return;
    start(async () => {
      const res = await logMood({ mood, tags, note: note.trim() || undefined });
      if (!res.ok) return toast(res.error, "error");
      emitBloom({ type: "activity", kind: "mood" });
      if (mood <= 2) emitBloom({ type: "mochi", event: "concern" });
      setSaved(mood);
      setMood(null);
      setTags([]);
      setNote("");
    });
  }

  if (saved) {
    return (
      <div role="status" className="space-y-3">
        <p className="font-display text-2xl text-heading">Thanks for checking in.</p>
        {saved <= 2 ? (
          <p className="text-fg">
            Sounds like a hard day. A few slow breaths can take the edge off, or you could tell Mochi what&apos;s going on.{" "}
            <Link href="/wellness#breathe" className="font-semibold underline underline-offset-4">
              Breathe for a minute
            </Link>
          </p>
        ) : (
          <p className="text-fg">A new flower is growing in Bloomverse.</p>
        )}
        <Button variant="ghost" size="sm" onClick={() => setSaved(null)}>
          Check in again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="How are you feeling?" className="grid grid-cols-5 gap-2">
        {MOOD_SCALE.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mood === value}
            onClick={() => setMood(value)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl border py-3 text-sm font-semibold transition-colors",
              mood === value ? "border-transparent bg-accent text-accent-fg" : "border-line bg-surface-strong text-heading hover:border-accent/40",
            )}
          >
            <Icon aria-hidden className="size-7" />
            {label}
          </button>
        ))}
      </div>
      {mood && !compact ? (
        <>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <ChipToggle key={t} pressed={tags.includes(t)} onPressedChange={(on) => setTags((s) => (on ? [...s, t] : s.filter((x) => x !== t)))}>
                {t[0].toUpperCase() + t.slice(1)}
              </ChipToggle>
            ))}
          </div>
          <TextareaField label="Anything on your mind? (optional)" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          {safety.level !== "none" ? <SafetyCard headline={TRIAGE_HEADLINE[safety.level]} resources={resourcesFor(safety.level, country)} /> : null}
        </>
      ) : null}
      {mood ? (
        <Button onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save check-in"}
        </Button>
      ) : null}
    </div>
  );
}
