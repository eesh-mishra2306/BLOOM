"use client";
import { useState, useTransition } from "react";
import { saveProfileSettings } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { COUNTRIES } from "@/lib/safety/emergency-numbers";

const ZONES = [
  "Asia/Kolkata",
  "Asia/Kathmandu",
  "Asia/Dhaka",
  "Asia/Colombo",
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Berlin",
  "Africa/Lagos",
  "Africa/Nairobi",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Australia/Sydney",
  "Pacific/Auckland",
];

type Props = { displayName: string; country: string; timeZone: string; cycleLength: number | null; periodLength: number | null };

export function ProfileSettings(initial: Props) {
  const [name, setName] = useState(initial.displayName);
  const [country, setCountry] = useState(initial.country);
  const [timeZone, setTimeZone] = useState(initial.timeZone);
  const [cycle, setCycle] = useState(initial.cycleLength ? String(initial.cycleLength) : "");
  const [period, setPeriod] = useState(initial.periodLength ? String(initial.periodLength) : "");
  const [pending, start] = useTransition();
  const zones = ZONES.includes(timeZone) ? ZONES : [timeZone, ...ZONES];

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveProfileSettings({
            displayName: name,
            country,
            timeZone,
            typicalCycleLength: cycle ? Number(cycle) : null,
            typicalPeriodLength: period ? Number(period) : null,
          });
          toast(res.ok ? "Saved" : res.error, res.ok ? "success" : "error");
        });
      }}
    >
      <InputField label="What should BLOOM call you?" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
      <SelectField label="Country" hint="Sets the emergency numbers SOS shows." value={country} onChange={(e) => setCountry(e.target.value)}>
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name} ({c.emergency})
          </option>
        ))}
        <option value="OTHER">Somewhere else (112)</option>
      </SelectField>
      <div className="space-y-1">
        <SelectField label="Time zone" value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z.replace("_", " ")}
            </option>
          ))}
        </SelectField>
        <button type="button" className="min-h-10 text-sm font-semibold text-pink-ink underline-offset-4 hover:underline" onClick={() => setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)}>
          Use this device&apos;s time zone
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InputField label="Usual cycle (days)" type="number" inputMode="numeric" min={15} max={90} value={cycle} onChange={(e) => setCycle(e.target.value)} hint="Leave blank to let BLOOM learn it" />
        <InputField label="Usual period (days)" type="number" inputMode="numeric" min={1} max={15} value={period} onChange={(e) => setPeriod(e.target.value)} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
