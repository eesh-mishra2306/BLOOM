"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { allowJourneyLocation, beginJourney } from "@/app/(app)/journey/actions";
import { Button } from "@/components/ui/button";
import { ChipToggle } from "@/components/ui/chip";
import { Glass } from "@/components/ui/glass";
import { SwitchRow } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { CONSENT_COPY } from "@/lib/consent-copy";
import { clock, reach, type CircleMember } from "@/lib/safety/journey-client";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

const DURATIONS = [10, 15, 20, 30, 45, 60, 90];
const CHECK_INS = { arrival: null, "10": 10, "15": 15, "30": 30 } as const;
type CheckIns = keyof typeof CHECK_INS;

const REACH_TEXT = {
  alerts: "Gets alerts on their phone",
  send_link: "Accepted, but alerts are off. Send them the link after you start.",
  pending: "Hasn't accepted your invite yet. Send them the link after you start.",
};

const names = (list: string[]) => (list.length <= 1 ? list.join("") : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`);

export function JourneyPlanner({ circle, locationConsent, timeZone }: { circle: CircleMember[]; locationConsent: boolean; timeZone: string }) {
  const router = useRouter();
  const now = useNow();
  const [destination, setDestination] = useState("");
  const [minutes, setMinutes] = useState(20);
  const [custom, setCustom] = useState(false);
  const [checkIns, setCheckIns] = useState<CheckIns>("arrival");
  const [chosen, setChosen] = useState<string[]>(() => {
    const accepted = circle.filter((c) => c.status === "accepted");
    return (accepted.length ? accepted : circle).map((c) => c.id);
  });
  const [shareLocation, setShareLocation] = useState(locationConsent);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    if (!destination.trim()) return setError("Say where you're going, so your people know what to expect.");
    if (!chosen.length) return setError("Choose at least one person to follow along.");
    start(async () => {
      const res = await beginJourney({ destination, minutes, checkInEveryMin: CHECK_INS[checkIns], contactIds: chosen, shareLocation });
      if (!res.ok) return setError(res.error);
      const parts = [];
      if (res.alerted.length) parts.push(`${names(res.alerted)} got an alert.`);
      if (res.notAlerted.length) parts.push(`Send ${names(res.notAlerted)} the link.`);
      toast(`Journey started. ${parts.join(" ")}`, "success");
      router.refresh();
    });
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Glass tier={1} petal className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="destination" className="font-display text-xl text-heading">
            Where are you going?
          </label>
          <input
            id="destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            maxLength={80}
            autoComplete="off"
            placeholder="e.g. Home from college"
            className="h-12 w-full rounded-[var(--radius-field)] border border-line bg-surface-strong px-4 text-fg placeholder:text-muted"
          />
          <p className="text-sm text-muted">Only the people you choose can see this.</p>
        </div>

        <fieldset className="space-y-2">
          <legend className="font-display text-xl text-heading">How long will it take?</legend>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((m) => (
              <ChipToggle
                key={m}
                pressed={!custom && minutes === m}
                onPressedChange={() => {
                  setCustom(false);
                  setMinutes(m);
                }}
              >
                {m < 60 ? `${m} min` : `${m / 60 === 1 ? "1 hour" : "1½ hours"}`}
              </ChipToggle>
            ))}
            <ChipToggle pressed={custom} onPressedChange={() => setCustom(true)}>
              Other
            </ChipToggle>
          </div>
          {custom ? (
            <label className="flex items-center gap-2 text-fg">
              <input
                type="number"
                inputMode="numeric"
                min={5}
                max={720}
                value={minutes}
                onChange={(e) => setMinutes(Math.min(720, Math.max(5, Number(e.target.value) || 5)))}
                className="h-11 w-24 rounded-[var(--radius-field)] border border-line bg-surface-strong px-3 text-fg"
              />
              minutes
            </label>
          ) : null}
          <p className="text-sm font-semibold text-heading" aria-live="polite">
            {now ? `You should get there by ${clock(now + minutes * 60_000, timeZone)}.` : " "}
          </p>
        </fieldset>

        <div className="space-y-2">
          <p id="checkins-label" className="font-display text-xl text-heading">
            Check in along the way
          </p>
          <div role="radiogroup" aria-labelledby="checkins-label" className="flex flex-wrap gap-2">
            {(
              [
                ["arrival", "Only on arrival"],
                ["10", "Every 10 min"],
                ["15", "Every 15 min"],
                ["30", "Every 30 min"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={checkIns === value}
                onClick={() => setCheckIns(value)}
                className={cn(
                  "min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors",
                  checkIns === value ? "border-transparent bg-accent text-accent-fg" : "border-line bg-surface-strong text-heading hover:border-accent/40",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted">
            {checkIns === "arrival"
              ? "BLOOM asks if you're okay when you're due to arrive."
              : `BLOOM asks if you're okay every ${CHECK_INS[checkIns]} minutes, and when you're due to arrive.`}
          </p>
        </div>
      </Glass>

      <Glass tier={2} className="space-y-3">
        <fieldset className="space-y-2">
          <legend className="font-display text-xl text-heading">Who should follow along?</legend>
          {circle.map((c) => {
            const on = chosen.includes(c.id);
            return (
              <label
                key={c.id}
                className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border p-3", on ? "border-accent/50 bg-accent-soft" : "border-line bg-surface-strong")}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => setChosen((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))}
                  className="mt-1 size-5 accent-[var(--accent)]"
                />
                <span>
                  <span className="font-semibold text-heading">{c.name}</span>
                  {c.relationship ? <span className="text-muted"> · {c.relationship}</span> : null}
                  <span className="block text-sm text-muted">{REACH_TEXT[reach(c)]}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
        <SwitchRow
          label={CONSENT_COPY.location_journey.title}
          description={CONSENT_COPY.location_journey.body}
          checked={shareLocation}
          onCheckedChange={(on) => {
            setShareLocation(on);
            if (on !== locationConsent) void allowJourneyLocation(on);
          }}
        />
      </Glass>

      <section aria-labelledby="how-heading" className="rounded-[var(--radius-card)] border border-line p-5">
        <h2 id="how-heading" className="mb-2 text-xl">
          What happens next
        </h2>
        <ol className="list-decimal space-y-1 pl-5 text-fg">
          <li>The people you chose get a link to follow your journey.</li>
          <li>When a check-in is due, BLOOM asks if you&apos;re okay.</li>
          <li>If you don&apos;t answer within 5 minutes, BLOOM alerts them.</li>
          <li>Tap &ldquo;I&apos;ve arrived&rdquo; when you get there, and they&apos;re told.</li>
        </ol>
        <p className="mt-2 text-sm text-muted">BLOOM doesn&apos;t contact the police. In an emergency, use SOS or call 112.</p>
      </section>

      {error ? (
        <p role="alert" className="font-semibold text-sos-bg">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
        {pending ? "Starting…" : "Start journey"}
      </Button>
    </form>
  );
}
