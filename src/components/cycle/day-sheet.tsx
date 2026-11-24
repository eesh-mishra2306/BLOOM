"use client";
import { CircleAlert } from "lucide-react";
import { useState, useTransition } from "react";
import { removeDayLog, saveDayLog } from "@/app/(app)/cycle/actions";
import { Button } from "@/components/ui/button";
import { ChipToggle } from "@/components/ui/chip";
import { InputField, TextareaField } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { emitBloom } from "@/lib/events";
import { formatDay } from "@/lib/dates";
import { MOOD_LABEL, MOODS, SYMPTOM_LABEL, SYMPTOMS, type DayLog, type Flow } from "@/lib/cycle/types";

const FLOW_OPTIONS: { value: Flow; label: string }[] = [
  { value: "none", label: "None" },
  { value: "spotting", label: "Spotting" },
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "heavy", label: "Heavy" },
];
const CRAMP_OPTIONS = [
  { value: "0", label: "None" },
  { value: "1", label: "Mild" },
  { value: "2", label: "Moderate" },
  { value: "3", label: "Severe" },
] as const;

const empty = (date: string): DayLog => ({ date, flow: "none", cramps: 0, moods: [], symptoms: [] });

type DaySheetProps = { date: string | null; existing?: DayLog; onClose: () => void };

export function DaySheet({ date, existing, onClose }: DaySheetProps) {
  const [log, setLog] = useState<DayLog>(existing ?? empty(date ?? "2000-01-01"));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!date) return null;
  const toggle = <T extends string>(list: T[], item: T, on: boolean) => (on ? [...list, item] : list.filter((x) => x !== item));
  const redFlag = log.flow === "heavy" && (log.symptoms.includes("dizziness") || log.cramps === 3);

  function save() {
    setError(null);
    start(async () => {
      const payload: DayLog = { ...log, note: log.note?.trim() || undefined, sleepHours: Number.isFinite(log.sleepHours) ? log.sleepHours : undefined };
      const res = await saveDayLog(payload);
      if (!res.ok) return setError(res.error);
      toast(`Saved for ${formatDay(date!)}`, "success");
      emitBloom({ type: "mochi", event: "log-saved" });
      emitBloom({ type: "activity", kind: "cycle_log" });
      onClose();
    });
  }

  function remove() {
    start(async () => {
      const res = await removeDayLog(date!);
      if (!res.ok) return setError(res.error);
      toast(`Cleared ${formatDay(date!)}`);
      onClose();
    });
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={formatDay(date, { weekday: "long", day: "numeric", month: "long" })} description="Tap what fits. Everything is optional.">
      <div className="flex flex-col gap-6">
        <fieldset>
          <legend className="mb-2 font-semibold text-heading">Bleeding</legend>
          <Segmented
            size="sm"
            label="Bleeding"
            value={log.flow === "unspecified" ? "medium" : log.flow}
            onChange={(flow) => setLog((l) => ({ ...l, flow }))}
            options={FLOW_OPTIONS}
            className="flex w-full flex-wrap [&>button]:flex-1"
          />
          {log.flow === "unspecified" ? <p className="mt-2 text-sm text-muted">Marked as a period day during setup. Pick a flow if you remember it.</p> : null}
        </fieldset>

        <fieldset>
          <legend className="mb-2 font-semibold text-heading">Cramps</legend>
          <Segmented
            size="sm"
            label="Cramps"
            value={String(log.cramps) as "0" | "1" | "2" | "3"}
            onChange={(v) => setLog((l) => ({ ...l, cramps: Number(v) as DayLog["cramps"] }))}
            options={[...CRAMP_OPTIONS]}
            className="flex w-full [&>button]:flex-1"
          />
        </fieldset>

        <fieldset>
          <legend className="mb-2 font-semibold text-heading">Mood</legend>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <ChipToggle key={m} pressed={log.moods.includes(m)} onPressedChange={(on) => setLog((l) => ({ ...l, moods: toggle(l.moods, m, on) }))}>
                {MOOD_LABEL[m]}
              </ChipToggle>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 font-semibold text-heading">Symptoms</legend>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map((s) => (
              <ChipToggle key={s} pressed={log.symptoms.includes(s)} onPressedChange={(on) => setLog((l) => ({ ...l, symptoms: toggle(l.symptoms, s, on) }))}>
                {SYMPTOM_LABEL[s]}
              </ChipToggle>
            ))}
          </div>
        </fieldset>

        {redFlag ? (
          <div role="note" className="flex gap-3 rounded-2xl bg-sos-bg/10 p-4 text-sm text-fg">
            <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-sos-bg" />
            <p>
              If you&apos;re soaking through a pad or tampon every hour for two hours or more, feel faint, or the pain is severe, get medical help now. In India, call <a className="font-bold underline" href="tel:112">112</a>.
            </p>
          </div>
        ) : null}

        <InputField
          label="Hours of sleep last night"
          type="number"
          inputMode="decimal"
          min={0}
          max={24}
          step={0.5}
          value={log.sleepHours ?? ""}
          onChange={(e) => setLog((l) => ({ ...l, sleepHours: e.target.value === "" ? undefined : Number(e.target.value) }))}
        />
        <TextareaField label="Note" maxLength={1000} placeholder="Anything you want to remember about today" value={log.note ?? ""} onChange={(e) => setLog((l) => ({ ...l, note: e.target.value }))} />

        {error ? (
          <p role="alert" className="rounded-2xl bg-sos-bg/10 px-4 py-3 text-sm font-semibold text-sos-bg">
            {error}
          </p>
        ) : null}

        <div className="flex gap-3">
          {existing ? (
            <Button variant="ghost" onClick={remove} disabled={pending}>
              Clear day
            </Button>
          ) : null}
          <Button size="lg" className="flex-1" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
