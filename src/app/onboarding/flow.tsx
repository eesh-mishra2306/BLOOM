"use client";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { MochiFlat } from "@/components/mochi/mochi-flat";
import { COMPANION_COLORS, SPECIES, type CompanionColor, type Species } from "@/components/mochi/palette";
import { Wordmark } from "@/components/shell/wordmark";
import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/ui/field";
import { Glass } from "@/components/ui/glass";
import { SwitchRow } from "@/components/ui/switch";
import { CONSENT_COPY, CONSENT_PURPOSES, type ConsentPurpose } from "@/lib/consent-copy";
import { COUNTRIES, emergencyFor } from "@/lib/safety/emergency-numbers";
import { cn } from "@/lib/utils";
import { completeOnboarding } from "./actions";

const DEFAULT_NAMES: Record<Species, string> = { kitten: "Mochi", puppy: "Coco", bunny: "Bubbles", bear: "Peaches" };
const STEPS = ["You", "Companion", "Country", "Privacy", "Cycle"] as const;

export function OnboardingFlow({ defaultName }: { defaultName: string }) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(defaultName);
  const [species, setSpecies] = useState<Species>("kitten");
  const [companionName, setCompanionName] = useState("Mochi");
  const [color, setColor] = useState<CompanionColor>("cream");
  const [country, setCountry] = useState("IN");
  const [consents, setConsents] = useState<Record<ConsentPurpose, boolean>>(
    Object.fromEntries(CONSENT_PURPOSES.map((p) => [p, false])) as Record<ConsentPurpose, boolean>,
  );
  const [lastPeriodStart, setLastPeriodStart] = useState("");
  const [cycleLength, setCycleLength] = useState("");
  const [periodLength, setPeriodLength] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const today = new Date().toLocaleDateString("en-CA");

  function chooseSpecies(next: Species) {
    if (companionName === DEFAULT_NAMES[species]) setCompanionName(DEFAULT_NAMES[next]);
    setSpecies(next);
  }

  function finish(withCycle: boolean) {
    setError(null);
    const num = (v: string) => (v.trim() ? Number(v) : undefined);
    startTransition(async () => {
      const res = await completeOnboarding({
        displayName: displayName.trim(),
        companionSpecies: species,
        companionName: companionName.trim() || DEFAULT_NAMES[species],
        companionColor: color,
        country,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        consents,
        cycle: withCycle
          ? { lastPeriodStart: lastPeriodStart || undefined, typicalCycleLength: num(cycleLength), typicalPeriodLength: num(periodLength) }
          : {},
      });
      if (res?.error) setError(res.error);
    });
  }

  const canContinue = step !== 0 || displayName.trim().length > 0;
  const emergency = emergencyFor(country);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 py-6">
      <div className="flex items-center justify-between">
        <Wordmark />
        <p className="text-sm font-semibold text-muted" aria-live="polite">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
      <ol className="mt-4 flex gap-1.5" aria-hidden>
        {STEPS.map((s, i) => (
          <li key={s} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-accent" : "bg-line")} />
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.section
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
          className="mt-8 flex-1"
        >
          {step === 0 && (
            <div className="space-y-6">
              <h1 className="text-4xl">What should Mochi call you?</h1>
              <InputField
                label="Your name or nickname"
                autoFocus
                autoComplete="given-name"
                value={displayName}
                maxLength={40}
                onChange={(e) => setDisplayName(e.target.value)}
                hint="Only shown inside BLOOM."
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h1 className="text-4xl">Pick your companion</h1>
              <p className="text-muted">They live in the corner of every screen, nap when you&apos;re busy, and listen when you want to talk. You can hide them any time.</p>
              <div role="radiogroup" aria-label="Companion" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {SPECIES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={species === s.value}
                    onClick={() => chooseSpecies(s.value)}
                    className={cn(
                      "flex flex-col items-center rounded-[var(--radius-card)] border p-3 transition-colors",
                      species === s.value ? "border-accent bg-accent-soft" : "border-line bg-surface-strong hover:border-accent/40",
                    )}
                  >
                    <MochiFlat species={s.value} color={color} mood={species === s.value ? "happy" : "idle"} className="size-20" />
                    <span className="font-semibold text-heading">{s.label}</span>
                    <span className="text-xs text-muted">{s.blurb}</span>
                  </button>
                ))}
              </div>
              <fieldset>
                <legend className="font-semibold text-heading">Colour</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(Object.keys(COMPANION_COLORS) as CompanionColor[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={color === c}
                      aria-label={COMPANION_COLORS[c].label}
                      onClick={() => setColor(c)}
                      className={cn("size-11 rounded-full border-2 transition-transform", color === c ? "scale-110 border-accent" : "border-line")}
                      style={{ background: COMPANION_COLORS[c].fur }}
                    />
                  ))}
                </div>
              </fieldset>
              <InputField label="Their name" value={companionName} maxLength={20} onChange={(e) => setCompanionName(e.target.value)} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h1 className="text-4xl">Where are you?</h1>
              <SelectField label="Country" value={country} onChange={(e) => setCountry(e.target.value)}>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
                <option value="OTHER">Somewhere else</option>
              </SelectField>
              <Glass tier={3} className="text-heading">
                In an emergency, BLOOM&apos;s SOS screen will offer to call <strong className="font-bold">{emergency.emergency}</strong>.
                {emergency.note ? <span className="mt-1 block text-sm text-muted">{emergency.note}</span> : null}
              </Glass>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h1 className="text-4xl">Your privacy choices</h1>
              <p className="text-muted">Everything here stays off until you turn it on. You can change your mind any time in Privacy.</p>
              <Glass tier={2} className="divide-y divide-line py-1">
                {CONSENT_PURPOSES.map((p) => (
                  <SwitchRow
                    key={p}
                    label={CONSENT_COPY[p].title}
                    description={CONSENT_COPY[p].body}
                    checked={consents[p]}
                    onCheckedChange={(v) => setConsents((s) => ({ ...s, [p]: v }))}
                  />
                ))}
              </Glass>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h1 className="text-4xl">Your cycle, if you like</h1>
              <p className="text-muted">This helps BLOOM estimate your next period sooner. Leave anything you&apos;re not sure about empty.</p>
              <InputField label="When did your last period start?" type="date" max={today} value={lastPeriodStart} onChange={(e) => setLastPeriodStart(e.target.value)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField label="Usual cycle length (days)" type="number" inputMode="numeric" min={15} max={90} placeholder="e.g. 28" value={cycleLength} onChange={(e) => setCycleLength(e.target.value)} />
                <InputField label="Usual period length (days)" type="number" inputMode="numeric" min={1} max={15} placeholder="e.g. 5" value={periodLength} onChange={(e) => setPeriodLength(e.target.value)} />
              </div>
            </div>
          )}
        </motion.section>
      </AnimatePresence>

      {error ? (
        <p role="alert" className="mb-3 rounded-2xl bg-sos-bg/10 px-4 py-3 text-sm font-semibold text-sos-bg">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-0 flex gap-3 bg-gradient-to-t from-bg via-bg/90 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        {step > 0 ? (
          <Button variant="secondary" size="lg" onClick={() => setStep((s) => s - 1)} disabled={pending}>
            Back
          </Button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <Button size="lg" className="flex-1" disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
            Continue
          </Button>
        ) : (
          <>
            <Button variant="ghost" size="lg" onClick={() => finish(false)} disabled={pending}>
              Skip for now
            </Button>
            <Button size="lg" className="flex-1" onClick={() => finish(true)} disabled={pending}>
              {pending ? "Setting up…" : "Finish"}
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
