"use client";
import { Hand } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { updateCompanion } from "@/app/(app)/companion/actions";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { Glass } from "@/components/ui/glass";
import { Segmented } from "@/components/ui/segmented";
import { SwitchRow } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { usePrefs } from "@/lib/prefs/store";
import { cn } from "@/lib/utils";
import { ChatPanel } from "./chat-panel";
import { MochiCanvas } from "./mochi-canvas";
import { MochiFlat } from "./mochi-flat";
import { COMPANION_COLORS, SPECIES, type CompanionColor, type Species } from "./palette";
import type { Accessory } from "./rig";
import { useMochi } from "./store";
import { useMochiBus } from "./use-mochi-bus";

type Companion = {
  name: string;
  species: Species;
  color: string;
  accessory: Accessory;
  personality: "gentle" | "playful" | "calm";
  language: "en" | "hinglish";
};

type StudioProps = { userName: string; country: string; chatAllowed: boolean; memoryAllowed: boolean; initial: Companion };

export function CompanionStudio({ userName, country, chatAllowed, memoryAllowed, initial }: StudioProps) {
  useMochiBus();
  const [c, setC] = useState<Companion>(initial);
  const [, start] = useTransition();
  const { expression, bounce, wave, dispatch, greet } = useMochi();
  const showInCorner = usePrefs((s) => s.mochi);
  const updatePrefs = usePrefs((s) => s.update);

  function save(patch: Partial<Companion>) {
    const next = { ...c, ...patch };
    setC(next);
    start(async () => {
      const res = await updateCompanion({
        companionName: next.name.trim() || "Mochi",
        companionSpecies: next.species,
        companionColor: next.color as CompanionColor,
        companionAccessory: next.accessory,
        companionPersonality: next.personality,
        companionLanguage: next.language,
      });
      if (!res.ok) toast(res.error, "error");
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <div className="space-y-5">
        <Glass tier={1} petal className="relative overflow-hidden p-0">
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-accent-soft/70 to-transparent" aria-hidden />
          <button type="button" onClick={() => dispatch("pet")} className="relative block w-full" aria-label={`Pet ${c.name}`}>
            <MochiCanvas
              species={c.species}
              color={c.color}
              accessory={c.accessory}
              expression={expression}
              bounce={bounce}
              wave={wave}
              fps={30}
              className="mx-auto h-72 w-full max-w-md sm:h-96"
              label={`${c.name}, your companion`}
            />
          </button>
          <div className="relative flex flex-wrap items-center justify-between gap-3 px-6 pb-6">
            <div>
              <h1 className="text-4xl">{c.name}</h1>
              <p className="text-muted">Tap {c.name} to say hello.</p>
            </div>
            <Button variant="secondary" onClick={greet}>
              <Hand aria-hidden /> Wave
            </Button>
          </div>
        </Glass>

        <Glass tier={2} className="space-y-6">
          <h2 className="text-2xl">Make {c.name} yours</h2>
          <InputField label="Name" value={c.name} maxLength={20} onChange={(e) => setC({ ...c, name: e.target.value })} onBlur={() => save({})} />
          <fieldset>
            <legend className="mb-2 font-semibold text-heading">Companion</legend>
            <div role="radiogroup" aria-label="Companion" className="grid grid-cols-4 gap-2">
              {SPECIES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  role="radio"
                  aria-checked={c.species === s.value}
                  onClick={() => save({ species: s.value })}
                  className={cn("flex flex-col items-center rounded-2xl border p-2 text-sm font-semibold text-heading", c.species === s.value ? "border-accent bg-accent-soft" : "border-line bg-surface-strong")}
                >
                  <MochiFlat species={s.value} color={c.color} className="size-14" />
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 font-semibold text-heading">Colour</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(COMPANION_COLORS) as CompanionColor[]).map((col) => (
                <button
                  key={col}
                  type="button"
                  aria-pressed={c.color === col}
                  aria-label={COMPANION_COLORS[col].label}
                  onClick={() => save({ color: col })}
                  className={cn("size-11 rounded-full border-2", c.color === col ? "scale-110 border-accent" : "border-line")}
                  style={{ background: COMPANION_COLORS[col].fur }}
                />
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 font-semibold text-heading">Accessory</p>
              <Segmented size="sm" label="Accessory" value={c.accessory} onChange={(accessory) => save({ accessory })} options={[{ value: "flower", label: "Flower" }, { value: "bow", label: "Bow" }, { value: "none", label: "None" }]} />
            </div>
            <div>
              <p className="mb-2 font-semibold text-heading">Personality</p>
              <Segmented size="sm" label="Personality" value={c.personality} onChange={(personality) => save({ personality })} options={[{ value: "gentle", label: "Gentle" }, { value: "playful", label: "Playful" }, { value: "calm", label: "Calm" }]} />
            </div>
          </div>
          <div>
            <p className="mb-2 font-semibold text-heading">How {c.name} talks</p>
            <Segmented label="Language" value={c.language} onChange={(language) => save({ language })} options={[{ value: "en", label: "English" }, { value: "hinglish", label: "Hinglish" }]} />
          </div>
          <SwitchRow
            className="border-t border-line pt-4"
            label={`Show ${c.name} in the corner of every screen`}
            description="Turn this off and you can still chat here. Animation follows your motion setting."
            checked={showInCorner}
            onCheckedChange={(v) => updatePrefs({ mochi: v })}
          />
          <p className="text-sm text-muted">
            {c.name} only remembers things you choose to save. See and delete them in{" "}
            <Link href="/privacy" className="font-semibold underline underline-offset-4">
              Privacy
            </Link>
            .
          </p>
        </Glass>
      </div>

      <Glass tier={1} className="flex h-[min(46rem,calc(100dvh-12rem))] flex-col overflow-hidden p-0 lg:sticky lg:top-24">
        <ChatPanel companionName={c.name} userName={userName} country={country} chatAllowed={chatAllowed} memoryAllowed={memoryAllowed} />
      </Glass>
    </div>
  );
}
