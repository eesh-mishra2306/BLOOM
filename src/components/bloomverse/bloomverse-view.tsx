"use client";
import { Minus, Plus, RotateCcw, RotateCw, Undo2 } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { setMoodGarden } from "@/app/(app)/bloomverse/actions";
import { AmbientPlayer } from "@/components/audio/ambient-player";
import type { Expression } from "@/components/mochi/behaviour";
import type { Species as CompanionSpecies } from "@/components/mochi/palette";
import type { Accessory } from "@/components/mochi/rig";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/ui/glass";
import { CONSENT_COPY } from "@/lib/consent-copy";
import { deviceTier, webglAvailable } from "@/lib/device";
import { placeFlowers, sceneForHour, SPECIES, type FlowerSpec, type GrowthActivity, type GrowthKind, type Scene } from "@/lib/garden/growth";
import type { GardenSky } from "@/lib/prefs/model";
import { usePrefs } from "@/lib/prefs/store";
import { useReducedMotion } from "@/lib/prefs/use-reduced-motion";
import { useClientValue } from "@/lib/use-client-value";
import { cn } from "@/lib/utils";
import type { GardenControls } from "./garden-canvas";
import { GardenFlat } from "./garden-flat";
import { backdrop, SCENES } from "./shapes";

const GardenCanvas = dynamic(() => import("./garden-canvas"), {
  ssr: false,
  loading: () => <div className="grid size-full place-items-center text-muted">Growing your garden…</div>,
});

const POND = { x: 2.15, z: 1.55, r: 0.78 };
const PLACE = { radius: 4.55, minSpacing: 0.3, keepClear: [{ x: 0, z: 0, r: 0.95 }, { ...POND, r: POND.r + 0.22 }, { x: 0, z: 2.2, r: 0.45 }] };
const SKIES: { id: GardenSky; label: string }[] = [
  { id: "time", label: "Time of day" },
  { id: "mood", label: "My mood" },
  { id: "dawn", label: "Dawn" },
  { id: "golden", label: "Golden" },
  { id: "dusk", label: "Dusk" },
  { id: "moon", label: "Moonlight" },
];
const KINDS: GrowthKind[] = ["breathing", "mood", "journal", "cycle_log", "goal"];
const HOW: Record<GrowthKind, { href: string; action: string }> = {
  breathing: { href: "/wellness#breathe", action: "Breathe for a minute" },
  mood: { href: "/wellness#mood", action: "Check in" },
  journal: { href: "/journal", action: "Write" },
  cycle_log: { href: "/cycle", action: "Log today" },
  goal: { href: "/wellness", action: "See goals" },
};

type ViewOp = "left" | "right" | "in" | "out" | "reset";
const VIEW_BUTTONS: { op: ViewOp; label: string; icon: typeof Plus }[] = [
  { op: "left", label: "Turn left", icon: RotateCcw },
  { op: "right", label: "Turn right", icon: RotateCw },
  { op: "in", label: "Zoom in", icon: Plus },
  { op: "out", label: "Zoom out", icon: Minus },
  { op: "reset", label: "Reset view", icon: Undo2 },
];

type Props = {
  activities: GrowthActivity[];
  moodScene: Scene | null;
  moodConsent: boolean;
  companion: { species: CompanionSpecies; color: string; accessory: Accessory; name: string };
};

export function BloomverseView({ activities, moodScene, moodConsent, companion }: Props) {
  const router = useRouter();
  const sky = usePrefs((s) => s.gardenSky);
  const update = usePrefs((s) => s.update);
  const reduced = useReducedMotion();
  const hour = useClientValue(() => new Date().getHours(), 9);
  const webgl = useClientValue(webglAvailable, true);
  const quality = useClientValue(deviceTier, "high");
  const [lost, setLost] = useState(false);
  const [visible, setVisible] = useState(true);
  const [selected, setSelected] = useState<FlowerSpec | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const [wave, setWave] = useState(0);
  const [expression, setExpression] = useState<Expression>("idle");
  const [taps, setTaps] = useState(0);
  const [pending, start] = useTransition();
  const wrap = useRef<HTMLDivElement>(null);
  const controls = useRef<GardenControls>(null);

  const flowers = useMemo(() => placeFlowers(activities, PLACE), [activities]);

  function steer(op: ViewOp) {
    const c = controls.current;
    if (!c) return;
    if (op === "left") c.rotate(-0.5);
    else if (op === "right") c.rotate(0.5);
    else if (op === "in") c.zoom(0.85);
    else if (op === "out") c.zoom(1.18);
    else c.reset();
  }
  const counts = useMemo(() => Object.fromEntries(KINDS.map((k) => [k, flowers.filter((f) => f.kind === k).length])) as Record<GrowthKind, number>, [flowers]);
  const timeScene = sceneForHour(hour);
  const scene: Scene = sky === "time" ? timeScene : sky === "mood" ? (moodConsent && moodScene ? moodScene : timeScene) : sky;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!line) return;
    const id = window.setTimeout(() => {
      setLine(null);
      setExpression("idle");
    }, 4500);
    return () => window.clearTimeout(id);
  }, [line]);

  const lines =
    flowers.length === 0
      ? ["Our garden is waiting. A mood check-in plants the first daisy."]
      : [
          `${flowers.length} ${flowers.length === 1 ? "flower" : "flowers"} so far. Each one is something you did for yourself.`,
          "I like sitting here with you.",
          "Want to breathe together? Lavender grows when we do.",
        ];

  const summary = flowers.length
    ? `Your garden has ${flowers.length} flowers: ${KINDS.filter((k) => counts[k])
        .map((k) => `${counts[k]} ${SPECIES[k].name.toLowerCase()}`)
        .join(", ")}. ${companion.name} is sitting in the middle. Sky: ${SCENES[scene].label}.`
    : `Your garden is empty for now. ${companion.name} is sitting in the middle. Sky: ${SCENES[scene].label}.`;

  const three = webgl && !lost;
  const recent = [...flowers].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 6);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-4xl">Bloomverse</h1>
        <p className="font-semibold text-muted">
          {flowers.length} {flowers.length === 1 ? "flower" : "flowers"}
        </p>
      </div>

      <div
        ref={wrap}
        style={{ background: backdrop(scene) }}
        className="garden relative h-[64svh] max-h-[680px] min-h-[360px] overflow-hidden rounded-[var(--radius-card)] border border-line shadow-[0_24px_60px_-30px_var(--glow)]"
      >
        <p className="sr-only">{summary}</p>
        {three ? (
          <GardenCanvas
            flowers={flowers}
            scene={scene}
            companion={companion}
            expression={expression}
            wave={wave}
            animate={visible && !reduced}
            quality={quality}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            onMochiTap={() => {
              setWave((w) => w + 1);
              setExpression("happy");
              setLine(lines[taps % lines.length]);
              setTaps((t) => t + 1);
            }}
            mochiLine={line}
            onContextLost={() => setLost(true)}
            controlsRef={controls}
          />
        ) : (
          <GardenFlat flowers={flowers} scene={scene} companion={companion} pond={POND} />
        )}
        <span className="glass-lite pointer-events-none absolute top-3 left-3 rounded-full px-3 py-1 text-sm font-semibold text-heading">{SCENES[scene].label}</span>
        {three ? (
          <div className="absolute right-3 bottom-3 flex gap-1.5" aria-label="Garden view controls" role="group">
            {VIEW_BUTTONS.map(({ op, label, icon: Icon }) => (
              <button key={op} type="button" onClick={() => steer(op)} aria-label={label} title={label} className="glass-lite grid size-10 place-items-center rounded-full text-heading hover:text-pink-ink">
                <Icon aria-hidden className="size-4" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <p className="text-sm text-muted">
        {three ? `Drag to look around. Tap a flower to see where it came from, or tap ${companion.name}.` : "Your device can't show the 3D garden, so here it is from above."}
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <Glass tier={2} className="space-y-3">
          <h2 className="text-2xl">Sky</h2>
          <div role="radiogroup" aria-label="Sky" className="flex flex-wrap gap-2">
            {SKIES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={sky === s.id}
                onClick={() => update({ gardenSky: s.id })}
                className={cn(
                  "min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors",
                  sky === s.id ? "border-transparent bg-accent text-accent-fg" : "border-line bg-surface-strong text-heading hover:border-accent/40",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          {sky === "mood" && !moodConsent ? (
            <div className="space-y-2 rounded-2xl bg-accent-soft p-4">
              <p className="font-semibold text-heading">{CONSENT_COPY.mood_bloomverse.title}</p>
              <p className="text-sm text-fg">{CONSENT_COPY.mood_bloomverse.body}</p>
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await setMoodGarden(true);
                    router.refresh();
                  })
                }
              >
                Allow
              </Button>
            </div>
          ) : sky === "mood" && !moodScene ? (
            <p className="text-sm text-muted">Check in a few times this week and the sky will follow how you&apos;ve been feeling. Until then it follows the time of day.</p>
          ) : sky === "mood" ? (
            <p className="text-sm text-muted">The sky follows your check-ins from the last two weeks.</p>
          ) : (
            <p className="text-sm text-muted">{sky === "time" ? "The sky changes with the time where you are." : "The sky stays like this until you change it."}</p>
          )}
        </Glass>

        <Glass tier={2} id="sound" className="scroll-mt-24 space-y-3">
          <h2 className="text-2xl">Sound</h2>
          <AmbientPlayer />
        </Glass>
      </div>

      <Glass tier={2} className="space-y-3">
        <h2 className="text-2xl">How your garden grows</h2>
        <p className="text-fg">Each thing you choose to do for yourself plants a flower. Flowers never wilt, and nothing happens if you skip a day.</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {KINDS.map((k) => (
            <li key={k} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-strong p-3">
              <span>
                <span className="font-semibold text-heading">{SPECIES[k].name}</span>
                <span className="block text-sm text-muted">
                  From {SPECIES[k].from} · {counts[k]} so far
                </span>
              </span>
              <Link href={HOW[k].href} className="shrink-0 text-sm font-semibold text-pink-ink underline-offset-4 hover:underline">
                {HOW[k].action}
              </Link>
            </li>
          ))}
        </ul>
      </Glass>

      {recent.length ? (
        <Glass tier={3} className="space-y-2">
          <h2 className="text-xl">Recently grown</h2>
          <ul className="divide-y divide-line">
            {recent.map((f) => (
              <li key={f.id} className="flex justify-between gap-3 py-2 text-fg">
                <span>
                  {SPECIES[f.kind].name} <span className="text-muted">from {SPECIES[f.kind].from}</span>
                </span>
                <span className="shrink-0 text-sm text-muted">{new Date(f.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              </li>
            ))}
          </ul>
        </Glass>
      ) : null}
    </div>
  );
}
