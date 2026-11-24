"use client";
import { CalendarPlus } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { setFertileWindowVisible } from "@/app/(app)/cycle/actions";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/ui/glass";
import { SwitchRow } from "@/components/ui/switch";
import type { DayLog, Prediction } from "@/lib/cycle/types";
import { CycleCalendar } from "./calendar";
import { DaySheet } from "./day-sheet";

export function CycleView({ logs, prediction, today, showFertile }: { logs: DayLog[]; prediction: Prediction; today: string; showFertile: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [fertile, setFertile] = useOptimistic(showFertile);
  const [, start] = useTransition();
  const existing = selected ? logs.find((l) => l.date === selected) : undefined;

  return (
    <>
      <Glass tier={2} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted">Tap a day to log or change it.</p>
          <Button onClick={() => setSelected(today)}>
            <CalendarPlus aria-hidden /> Log today
          </Button>
        </div>
        <CycleCalendar logs={logs} prediction={prediction} today={today} showFertile={fertile} onSelect={setSelected} />
        <SwitchRow
          className="border-t border-line pt-4"
          label="Show estimated fertile window"
          description="An estimate from your cycle history. It is not a method of contraception."
          checked={fertile}
          onCheckedChange={(v) =>
            start(async () => {
              setFertile(v);
              await setFertileWindowVisible(v);
            })
          }
        />
      </Glass>
      <DaySheet key={selected ?? "closed"} date={selected} existing={existing} onClose={() => setSelected(null)} />
    </>
  );
}
