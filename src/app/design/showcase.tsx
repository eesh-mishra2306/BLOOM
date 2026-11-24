"use client";
import { CalendarHeart, Plus } from "lucide-react";
import { useState } from "react";
import { PetalField } from "@/components/background/petal-field";
import { Wordmark } from "@/components/shell/wordmark";
import { Button } from "@/components/ui/button";
import { ChipToggle } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { InputField, SelectField, TextareaField } from "@/components/ui/field";
import { Glass } from "@/components/ui/glass";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { SwitchRow } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { usePrefs } from "@/lib/prefs/store";

export function DesignShowcase() {
  const prefs = usePrefs();
  const [sheet, setSheet] = useState(false);
  const [chips, setChips] = useState<string[]>(["Cramps"]);
  const [sw, setSw] = useState(true);
  const [seg, setSeg] = useState<"day" | "week" | "month">("week");

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <PetalField />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Wordmark />
        <div className="flex flex-wrap gap-2">
          <Segmented
            size="sm"
            label="Theme"
            value={prefs.discreet ? "discreet" : prefs.theme === "dark" ? "dark" : "light"}
            onChange={(v) => prefs.update({ theme: v === "dark" ? "dark" : "light", discreet: v === "discreet" })}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
              { value: "discreet", label: "Discreet" },
            ]}
          />
          <Segmented
            size="sm"
            label="Contrast"
            value={prefs.contrast}
            onChange={(v) => prefs.update({ contrast: v })}
            options={[
              { value: "normal", label: "Normal" },
              { value: "high", label: "High contrast" },
            ]}
          />
        </div>
      </div>

      <section className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
        <Glass tier={1} petal className="space-y-3">
          <p className="text-sm font-semibold text-muted">Next period</p>
          <h1 className="text-4xl">Probably 27 Nov – 1 Dec</h1>
          <p className="max-w-prose text-muted">Based on your last 4 cycles. Estimates only — your body doesn&apos;t read calendars.</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button>
              <CalendarHeart aria-hidden /> Log today
            </Button>
            <Button variant="secondary">See history</Button>
          </div>
        </Glass>
        <Glass tier={2} className="flex items-center gap-5">
          <ProgressRing value={0.62} label="Cycle day 17 of about 28">
            <span className="font-display text-3xl text-heading">17</span>
            <span className="-mt-1 block text-xs text-muted">cycle day</span>
          </ProgressRing>
          <p className="text-muted">Luteal phase, probably. Energy often dips this week.</p>
        </Glass>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <Glass tier={2} className="space-y-4">
          <InputField label="Your name" placeholder="Asha" hint="Mochi will use this." />
          <InputField label="Email" defaultValue="not-an-email" error="Enter an email like asha@example.com" />
          <SelectField label="Country" defaultValue="IN">
            <option value="IN">India</option>
            <option value="GB">United Kingdom</option>
          </SelectField>
          <TextareaField label="Note" placeholder="Anything you want to remember about today" />
        </Glass>
        <Glass tier={2} className="space-y-2">
          <Segmented label="Range" value={seg} onChange={setSeg} options={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }]} />
          <SwitchRow label="Show estimated fertile window" description="Not a method of contraception." checked={sw} onCheckedChange={setSw} />
          <div className="flex flex-wrap gap-2 pt-2">
            {["Cramps", "Headache", "Bloating", "Acne", "Tender breasts"].map((c) => (
              <ChipToggle key={c} pressed={chips.includes(c)} onPressedChange={(p) => setChips((s) => (p ? [...s, c] : s.filter((x) => x !== c)))}>
                {c}
              </ChipToggle>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-4">
            <Button variant="soft" onClick={() => toast("Saved for today", "success")}>
              Success toast
            </Button>
            <Button variant="ghost" onClick={() => toast("Couldn't save. Check your connection and try again.", "error")}>
              Error toast
            </Button>
            <Button variant="secondary" onClick={() => setSheet(true)}>
              Open sheet
            </Button>
            <Button variant="danger" size="lg">
              Send SOS
            </Button>
            <Button size="icon" aria-label="Add">
              <Plus aria-hidden />
            </Button>
          </div>
        </Glass>
      </section>

      <EmptyState title="No journal entries yet" body="Write a few lines about today. Only you can read them." action={<Button>Write an entry</Button>} />

      <Sheet open={sheet} onOpenChange={setSheet} title="Log 24 November" description="Tap what fits. Everything is optional.">
        <p className="text-muted">Sheet content.</p>
      </Sheet>
    </main>
  );
}
