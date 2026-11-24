"use client";
import { Check, Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { addWellnessGoal, markGoalDone, removeGoal } from "@/app/(app)/wellness/actions";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { emitBloom } from "@/lib/events";
import { cn } from "@/lib/utils";

type Goal = { id: string; label: string; icon: string; timesDone: number; doneToday: boolean };
const IDEAS = ["Drink a glass of water", "Stretch for five minutes", "Step outside", "Message a friend", "In bed by 11", "Eat something warm"];

export function Goals({ goals }: { goals: Goal[] }) {
  const [label, setLabel] = useState("");
  const [pending, start] = useTransition();

  const add = (text: string) =>
    start(async () => {
      const res = await addWellnessGoal(text, "sprout");
      if (!res.ok) toast(res.error, "error");
      else setLabel("");
    });

  return (
    <div className="space-y-4">
      {goals.length ? (
        <ul className="space-y-2">
          {goals.map((g) => (
            <li key={g.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface-strong p-2 pl-3">
              <button
                type="button"
                aria-pressed={g.doneToday}
                disabled={g.doneToday || pending}
                onClick={() =>
                  start(async () => {
                    const res = await markGoalDone(g.id);
                    if (!res.ok) return toast(res.error, "error");
                    emitBloom({ type: "activity", kind: "goal" });
                  })
                }
                className={cn("grid size-10 shrink-0 place-items-center rounded-full border-2", g.doneToday ? "border-transparent bg-accent text-accent-fg" : "border-line text-transparent hover:border-accent")}
                aria-label={g.doneToday ? `${g.label}: done today` : `Mark ${g.label} done today`}
              >
                <Check aria-hidden className="size-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-heading">{g.label}</p>
                <p className="text-xs text-muted">{g.timesDone ? `Done ${g.timesDone} ${g.timesDone === 1 ? "time" : "times"} so far` : "Not done yet — no rush"}</p>
              </div>
              <button type="button" onClick={() => start(async () => void (await removeGoal(g.id)))} className="grid size-10 place-items-center rounded-full text-muted hover:bg-accent-soft" aria-label={`Remove ${g.label}`}>
                <X aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">Pick small things you&apos;d like to do for yourself. There are no streaks to keep, and nothing bad happens if you skip a day.</p>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (label.trim()) add(label.trim());
        }}
      >
        <label htmlFor="goal-input" className="sr-only">
          New goal
        </label>
        <input
          id="goal-input"
          value={label}
          maxLength={60}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Add your own"
          className="h-11 min-w-0 flex-1 rounded-full border border-line bg-surface-strong px-4 text-fg"
        />
        <Button type="submit" size="icon" aria-label="Add goal" disabled={!label.trim() || pending}>
          <Plus aria-hidden />
        </Button>
      </form>
      {goals.length < 3 ? (
        <div className="flex flex-wrap gap-2">
          {IDEAS.filter((i) => !goals.some((g) => g.label === i))
            .slice(0, 4)
            .map((i) => (
              <button key={i} type="button" onClick={() => add(i)} className="min-h-10 rounded-full border border-dashed border-line px-4 text-sm font-semibold text-heading hover:border-accent/50">
                {i}
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}
