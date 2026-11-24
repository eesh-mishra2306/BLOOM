import type { Metadata } from "next";
import { CycleInsights } from "@/components/cycle/insights";
import { PredictionCard } from "@/components/cycle/prediction-card";
import { CycleView } from "@/components/cycle/cycle-view";
import { requireOnboardedUser } from "@/lib/auth/session";
import { computeInsights } from "@/lib/cycle/insights";
import { predict } from "@/lib/cycle/predict";
import { getAllDayLogs } from "@/lib/cycle/repo";
import { isoToday } from "@/lib/dates";

export const metadata: Metadata = { title: "Cycle" };

export default async function CyclePage() {
  const { user, profile } = await requireOnboardedUser("/cycle");
  const logs = await getAllDayLogs(user.id);
  const today = isoToday(profile.timeZone);
  const prediction = predict(logs, today, { typicalCycleLength: profile.typicalCycleLength, typicalPeriodLength: profile.typicalPeriodLength });
  const insights = computeInsights(logs, today);

  return (
    <div className="space-y-5">
      <h1 className="sr-only">Cycle</h1>
      <PredictionCard prediction={prediction} showFertile={profile.showFertileWindow} />
      <CycleView logs={logs} prediction={prediction} today={today} showFertile={profile.showFertileWindow} />
      <CycleInsights insights={insights} />
      <details className="group rounded-[var(--radius-card)] px-1 text-sm text-muted">
        <summary className="cursor-pointer font-semibold text-heading">How BLOOM makes these predictions</summary>
        <div className="mt-2 max-w-prose space-y-2">
          <p>
            BLOOM takes the gaps between your period start dates, uses the middle value of your recent cycles, and shows a window around it that widens when your cycles vary.
            Gaps over 90 days are left out because they usually mean a missed log.
          </p>
          <p>
            Cycles of 24–38 days, varying by up to 7–9 days, are within the range doctors consider typical (FIGO, 2018). Predictions are estimates for planning, not medical advice,
            and never a way to prevent pregnancy.
          </p>
        </div>
      </details>
    </div>
  );
}
