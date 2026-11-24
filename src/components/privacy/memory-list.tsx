"use client";
import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { forgetAllMemories, forgetMemory } from "@/app/(app)/privacy/actions";
import { Button } from "@/components/ui/button";

export function MemoryList({ memories, companionName }: { memories: { id: string; text: string; when: string }[]; companionName: string }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  if (!memories.length) return <p className="text-muted">{companionName} hasn&apos;t saved anything. In a chat, tap &ldquo;Remember this&rdquo; under a reply to keep a note.</p>;
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {memories.map((m) => (
          <li key={m.id} className="flex items-start justify-between gap-3 rounded-2xl bg-surface-strong p-3">
            <span>
              <span className="text-fg">{m.text}</span>
              <span className="block text-xs text-muted">Saved {m.when}</span>
            </span>
            <button type="button" disabled={pending} onClick={() => start(() => forgetMemory(m.id))} aria-label={`Forget: ${m.text}`} className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-accent-soft">
              <Trash2 aria-hidden className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      {confirm ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-auto font-semibold text-heading">Forget all {memories.length}?</span>
          <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
            Keep them
          </Button>
          <Button size="sm" variant="danger" disabled={pending} onClick={() => start(() => forgetAllMemories())}>
            Forget all
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
          Forget everything
        </Button>
      )}
    </div>
  );
}
