import { Info } from "lucide-react";
import { Glass } from "@/components/ui/glass";
import { ProgressRing } from "@/components/ui/progress-ring";
import { formatDay } from "@/lib/dates";
import { PHASE_LABEL, type Prediction } from "@/lib/cycle/types";

const CONFIDENCE: Record<NonNullable<Prediction["confidence"]>, string> = {
  low: "Rough estimate",
  medium: "Fairly reliable",
  high: "Reliable for you",
};

export function PredictionCard({ prediction, showFertile }: { prediction: Prediction; showFertile: boolean }) {
  const p = prediction;
  if (p.status === "none") {
    return (
      <Glass tier={1} petal>
        <p className="text-sm font-semibold text-muted">Next period</p>
        <h2 className="mt-1 text-3xl">Not enough to go on yet</h2>
        <p className="mt-2 max-w-prose text-muted">{p.message}</p>
        {p.cycleDay ? <p className="mt-3 font-semibold text-heading">Cycle day {p.cycleDay}</p> : null}
      </Glass>
    );
  }

  const length = p.medianCycle ?? (p.nextStart && p.lastPeriod ? Math.round((Date.parse(p.nextStart) - Date.parse(p.lastPeriod.start)) / 86_400_000) : 28);
  const basis =
    p.basis === "typical"
      ? "Based on the usual cycle length you gave. It gets more personal as you log periods."
      : `Based on your last ${p.cyclesUsed} ${p.cyclesUsed === 1 ? "cycle" : "cycles"}.`;

  return (
    <Glass tier={1} petal className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
      {p.cycleDay ? (
        <ProgressRing value={Math.min(1, p.cycleDay / length)} size={132} label={`Cycle day ${p.cycleDay} of about ${length}`}>
          <span className="font-display text-4xl text-heading">{p.cycleDay}</span>
          <span className="mt-1 text-xs font-semibold text-muted">cycle day</span>
        </ProgressRing>
      ) : null}
      <div>
        <p className="text-sm font-semibold text-muted">{p.late ? "Period expected" : "Next period, probably"}</p>
        <h2 className="mt-1 text-3xl sm:text-4xl">
          {p.late ? `${p.daysLate} ${p.daysLate === 1 ? "day" : "days"} later than expected` : `${formatDay(p.windowStart!)} – ${formatDay(p.windowEnd!)}`}
        </h2>
        <p className="mt-2 max-w-prose text-muted">{p.message}</p>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="rounded-full bg-accent-soft px-3 py-1 font-semibold text-heading">{CONFIDENCE[p.confidence!]}</span>
          <span className="text-muted">{basis}</span>
        </p>
        {p.phase ? (
          <p className="mt-3 text-sm text-muted">
            Today: <span className="font-semibold text-heading">{PHASE_LABEL[p.phase]}</span> (estimated)
          </p>
        ) : null}
        {showFertile && p.fertileWindow ? (
          <p className="mt-2 text-sm text-muted">
            Estimated fertile window: <span className="font-semibold text-heading">{formatDay(p.fertileWindow.start)} – {formatDay(p.fertileWindow.end)}</span>.{" "}
            <strong className="font-semibold text-heading">Not a method of contraception.</strong>
          </p>
        ) : null}
        {p.late ? (
          <p className="mt-2 text-sm text-muted">Cycles shift with stress, travel, illness and more. If there&apos;s any chance you could be pregnant, a home test can help you know for sure.</p>
        ) : null}
      </div>
      {p.irregular ? (
        <div className="flex gap-3 rounded-2xl bg-calm p-4 text-sm sm:col-span-2">
          <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-heading" />
          <div>
            <p className="font-semibold text-heading">Your cycles vary, so predictions are less certain</p>
            <p className="mt-1 text-muted">{p.irregularReasons.join(" ")} This is common and has many causes. If it keeps happening or worries you, it&apos;s worth mentioning to a doctor.</p>
          </div>
        </div>
      ) : null}
    </Glass>
  );
}
