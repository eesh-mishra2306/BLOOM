import { Glass } from "@/components/ui/glass";
import type { Insights } from "@/lib/cycle/insights";
import { MOOD_LABEL, SYMPTOM_LABEL } from "@/lib/cycle/types";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd>
        <span className={value === "Not yet" ? "block pt-2 font-semibold text-muted" : "block font-display text-3xl text-heading"}>{value}</span>
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </dd>
    </div>
  );
}

export function CycleInsights({ insights }: { insights: Insights }) {
  const i = insights;
  if (i.daysLogged === 0) return null;
  return (
    <Glass tier={2} className="space-y-6">
      <h2 className="text-2xl">Your patterns</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <Stat label="Average cycle" value={i.averageCycle ? `${i.averageCycle} days` : "Not yet"} hint={i.cyclesTracked ? `${i.cyclesTracked} ${i.cyclesTracked === 1 ? "cycle" : "cycles"} logged` : "Log two period starts"} />
        <Stat label="Shortest to longest" value={i.shortestCycle ? `${i.shortestCycle}–${i.longestCycle}` : "Not yet"} hint="days" />
        <Stat label="Average period" value={i.averagePeriod ? `${i.averagePeriod} days` : "Not yet"} />
        <Stat label="Days logged" value={String(i.daysLogged)} />
      </dl>
      {i.longPeriods > 0 ? (
        <p className="rounded-2xl bg-calm p-4 text-sm text-muted">
          {i.longPeriods === 1 ? "One period" : `${i.longPeriods} periods`} lasted more than 8 days. If that happens often, mention it at your next doctor visit.
        </p>
      ) : null}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="text-lg">Most logged symptoms</h3>
          {i.topSymptoms.length ? (
            <ul className="mt-2 space-y-1">
              {i.topSymptoms.map((s) => (
                <li key={s.symptom} className="flex justify-between text-fg">
                  <span>{SYMPTOM_LABEL[s.symptom]}</span>
                  <span className="text-muted">{s.days} {s.days === 1 ? "day" : "days"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted">None logged yet.</p>
          )}
        </div>
        <div>
          <h3 className="text-lg">Most logged moods</h3>
          {i.topMoods.length ? (
            <ul className="mt-2 space-y-1">
              {i.topMoods.map((m) => (
                <li key={m.mood} className="flex justify-between text-fg">
                  <span>{MOOD_LABEL[m.mood]}</span>
                  <span className="text-muted">{m.days} {m.days === 1 ? "day" : "days"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted">None logged yet.</p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted">Patterns show what you logged, not what caused it.</p>
    </Glass>
  );
}
