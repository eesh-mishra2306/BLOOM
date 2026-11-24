"use client";
import { useState } from "react";
import type { Expression } from "@/components/mochi/behaviour";
import { MochiCanvas } from "@/components/mochi/mochi-canvas";
import type { Species } from "@/components/mochi/palette";

const SPECIES: Species[] = ["kitten", "puppy", "bunny", "bear"];
const EXPRESSIONS: Expression[] = ["idle", "happy", "curious", "sleepy", "asleep", "comforting", "thinking", "talking"];
const COLORS = ["cream", "peach", "lilac", "cocoa"];

export function MochiLab() {
  const [bounce, setBounce] = useState(0);
  const [wave, setWave] = useState(0);
  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <div className="flex gap-2">
        <button className="rounded-full bg-accent px-4 py-2 font-semibold text-accent-fg" onClick={() => setBounce((b) => b + 1)}>
          Hop
        </button>
        <button className="rounded-full bg-accent px-4 py-2 font-semibold text-accent-fg" onClick={() => setWave((w) => w + 1)}>
          Wave
        </button>
      </div>
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {SPECIES.map((s, i) => (
          <figure key={s} className="glass petal p-2 text-center">
            <MochiCanvas species={s} color={COLORS[i]} accessory={i === 0 ? "flower" : i === 2 ? "bow" : "none"} expression="idle" bounce={bounce} wave={wave} fps={30} className="mx-auto size-48" label={s} />
            <figcaption className="font-semibold text-heading">{s}</figcaption>
          </figure>
        ))}
      </section>
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {EXPRESSIONS.map((e) => (
          <figure key={e} className="glass-lite rounded-3xl p-2 text-center">
            <MochiCanvas species="kitten" color="cream" expression={e} bounce={0} fps={30} className="mx-auto size-40" label={e} />
            <figcaption className="text-sm font-semibold text-heading">{e}</figcaption>
          </figure>
        ))}
      </section>
    </main>
  );
}
