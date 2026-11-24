"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { addDays, addMonths, compareIso, daysInMonth, formatDay, startOfMonth, weekday } from "@/lib/dates";
import { FLOW_LABEL, type DayLog, type Prediction } from "@/lib/cycle/types";
import { cn } from "@/lib/utils";

type CalendarProps = {
  logs: DayLog[];
  prediction: Prediction;
  today: string;
  showFertile: boolean;
  onSelect: (date: string) => void;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const BLEEDING = new Set(["light", "medium", "heavy", "unspecified"]);

function inRange(d: string, a?: string, b?: string) {
  return Boolean(a && b && compareIso(d, a) >= 0 && compareIso(d, b) <= 0);
}

export function CycleCalendar({ logs, prediction, today, showFertile, onSelect }: CalendarProps) {
  const [month, setMonth] = useState(startOfMonth(today));
  const [direction, setDirection] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const byDate = useMemo(() => new Map(logs.map((l) => [l.date, l])), [logs]);

  const first = startOfMonth(month);
  const lead = (weekday(first) + 6) % 7; // Monday-first
  const count = daysInMonth(first);
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => addDays(first, i))];
  while (cells.length % 7) cells.push(null);

  const go = (delta: number) => {
    setDirection(delta);
    setMonth((m) => addMonths(m, delta));
  };

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, date: string) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    const target = addDays(date, step);
    if (target.slice(0, 7) !== month.slice(0, 7)) go(step > 0 ? 1 : -1);
    requestAnimationFrame(() => gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${target}"]`)?.focus());
  }

  const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${first}T00:00:00Z`));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl" aria-live="polite">
          {monthLabel}
        </h2>
        <div className="flex gap-1">
          <button type="button" onClick={() => go(-1)} className="grid size-11 place-items-center rounded-full text-heading hover:bg-accent-soft" aria-label="Previous month">
            <ChevronLeft aria-hidden />
          </button>
          <button type="button" onClick={() => go(1)} className="grid size-11 place-items-center rounded-full text-heading hover:bg-accent-soft" aria-label="Next month">
            <ChevronRight aria-hidden />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted" aria-hidden>
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="relative mt-1 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={month}
            ref={gridRef}
            custom={direction}
            initial={{ x: direction * 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            className="grid grid-cols-7 gap-1"
          >
            {cells.map((date, i) => {
              if (!date) return <span key={`empty-${i}`} />;
              const log = byDate.get(date);
              const period = log ? BLEEDING.has(log.flow) : false;
              const spotting = log?.flow === "spotting";
              const predicted = !log && inRange(date, prediction.windowStart, prediction.windowEnd);
              const fertile = showFertile && inRange(date, prediction.fertileWindow?.start, prediction.fertileWindow?.end);
              const isToday = date === today;
              const future = compareIso(date, today) > 0;
              const extras = log && (log.symptoms.length || log.moods.length || log.note);
              const label = [
                formatDay(date, { weekday: "long", day: "numeric", month: "long" }),
                isToday && "today",
                log && FLOW_LABEL[log.flow],
                predicted && "in your predicted period window",
                fertile && "estimated fertile window",
                extras && "has notes",
              ]
                .filter(Boolean)
                .join(", ");
              return (
                <button
                  key={date}
                  type="button"
                  data-date={date}
                  disabled={future && !predicted && !fertile}
                  onClick={() => onSelect(date)}
                  onKeyDown={(e) => onKeyDown(e, date)}
                  aria-label={label}
                  className={cn(
                    "relative grid aspect-square place-items-center rounded-2xl text-base font-semibold transition-colors disabled:opacity-35",
                    period && "bg-accent text-accent-fg",
                    spotting && "bg-accent-soft text-heading ring-2 ring-accent/60 ring-dashed",
                    predicted && "border-2 border-dashed border-accent/70 bg-accent-soft/50 text-heading",
                    fertile && !period && !predicted && "bg-calm text-heading",
                    !period && !spotting && !predicted && !fertile && "text-fg hover:bg-accent-soft",
                    isToday && "outline outline-2 outline-offset-2 outline-[var(--heading)]",
                  )}
                >
                  {Number(date.slice(8))}
                  {extras ? <span aria-hidden className={cn("absolute bottom-1.5 size-1.5 rounded-full", period ? "bg-white" : "bg-accent")} /> : null}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-4 rounded-md bg-accent" /> Period
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-4 rounded-md border-2 border-dashed border-accent/70 bg-accent-soft/50" /> Predicted
        </li>
        {showFertile ? (
          <li className="flex items-center gap-2">
            <span aria-hidden className="size-4 rounded-md bg-calm" /> Estimated fertile window
          </li>
        ) : null}
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" /> Notes or symptoms
        </li>
      </ul>
    </div>
  );
}
