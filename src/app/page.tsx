import { Check, Flower2, Lock, MapPin, MessageCircleHeart, Phone, Shield, Siren } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GardenFlat } from "@/components/bloomverse/garden-flat";
import { HeroMochi } from "@/components/landing/hero-mochi";
import { Wordmark } from "@/components/shell/wordmark";
import { getSessionUser } from "@/lib/auth/session";
import { placeFlowers, type GrowthActivity } from "@/lib/garden/growth";
import { telLink } from "@/lib/safety/links";

export const metadata: Metadata = {
  title: "BLOOM — your cycle, your calm, your way home",
  description: "Cycle tracking that's honest about uncertainty, Mochi the AI companion, and Bloom Shield: SOS, trusted contacts and shared journeys. Made for women in India.",
};

const KINDS = ["breathing", "mood", "journal", "cycle_log", "goal"] as const;
const SAMPLE: GrowthActivity[] = Array.from({ length: 70 }, (_, i) => ({ id: `sample-${i * 7919}`, kind: KINDS[i % 5], at: new Date(Date.UTC(2026, 9, 1) + i * 86_400_000).toISOString() }));
const POND = { x: 2.15, z: 1.55, r: 0.78 };
const sampleGarden = placeFlowers(SAMPLE, { radius: 4.55, minSpacing: 0.3, keepClear: [{ x: 0, z: 0, r: 0.95 }, { ...POND, r: 1 }] });

const LIMITS = [
  "BLOOM doesn't call the police or an ambulance for you. SOS puts 112 one tap away and alerts the people you chose.",
  "Automatic alerts reach contacts who accepted your invite and turned on notifications. Calling and texting from the SOS screen always work.",
  "Cycle predictions are estimates from your own history, shown as a range. They aren't medical advice or contraception.",
  "Mochi is an AI. It can be wrong, and it isn't a doctor or a therapist. It points you to real help when something sounds serious.",
];

export default async function Landing({ searchParams }: PageProps<"/">) {
  if (await getSessionUser()) redirect("/dashboard");
  const deleted = (await searchParams).deleted === "1";

  return (
    <div className="min-h-dvh">
      <div className="bg-berry text-cream">
        <p className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-5 py-2 text-sm">
          <span>Need help right now?</span>
          <a href={telLink("112")} className="font-semibold underline underline-offset-4">
            Call 112
          </a>
          <a href={telLink("181")} className="font-semibold underline underline-offset-4">
            Women Helpline 181
          </a>
          <Link href="/sos" className="font-semibold underline underline-offset-4">
            Open SOS
          </Link>
        </p>
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 lg:px-10">
        <Wordmark />
        <Link href="/auth" className="min-h-11 rounded-full px-4 py-2.5 font-semibold text-heading hover:bg-accent-soft">
          Sign in
        </Link>
      </header>

      <main>
        {deleted ? (
          <p role="status" className="mx-auto mb-4 max-w-6xl px-5 font-semibold text-heading lg:px-10">
            Your account and everything in it have been deleted.
          </p>
        ) : null}

        <section className="mx-auto grid max-w-6xl items-center gap-6 px-5 pb-14 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:pb-24">
          <div className="space-y-6">
            <h1 className="text-[clamp(2.6rem,8vw,4.6rem)] leading-[0.98]">
              A soft place to land.
              <span className="block">A quick way to get help.</span>
            </h1>
            <p className="max-w-xl text-lg text-fg">
              BLOOM keeps track of your cycle without pretending to be certain, gives you Mochi to talk to any time, and puts the people you trust one tap away when something feels wrong.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/auth?mode=create" className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-semibold text-accent-fg shadow-[0_14px_30px_-14px_var(--glow)]">
                Create your account
              </Link>
              <Link href="/auth" className="inline-flex min-h-12 items-center rounded-full border border-line bg-surface-strong px-6 font-semibold text-heading">
                Sign in
              </Link>
            </div>
            <p className="text-sm text-muted">Made for women in India, 18 and over. In early testing, and free while it is.</p>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-[26rem]">
            <div aria-hidden className="absolute inset-[8%] rounded-full bg-gradient-to-br from-petal/70 via-blush to-lavender/80 blur-2xl" />
            <div className="relative size-full">
              <HeroMochi />
            </div>
          </div>
        </section>

        <section aria-labelledby="mochi-heading" className="mx-auto grid max-w-6xl gap-8 px-5 py-12 lg:grid-cols-2 lg:px-10">
          <div className="space-y-3">
            <MessageCircleHeart aria-hidden className="size-8 text-pink-ink" />
            <h2 id="mochi-heading" className="text-4xl">
              Someone to talk to at 2 a.m.
            </h2>
            <p className="text-lg text-fg">
              Mochi listens without judging, answers questions about periods and wellbeing with sources you can check, and switches to real helplines the moment something sounds serious. Mochi speaks English or Hinglish, and only
              remembers what you ask it to.
            </p>
          </div>
          <figure className="glass petal space-y-3 p-5" aria-label="Example conversation">
            <figcaption className="text-sm font-semibold text-muted">Example conversation</figcaption>
            <p className="ml-auto w-fit max-w-[85%] rounded-3xl rounded-br-md bg-accent px-4 py-2.5 text-accent-fg">My cramps are really bad today</p>
            <p className="w-fit max-w-[90%] rounded-3xl rounded-bl-md bg-surface-strong px-4 py-2.5 text-fg">
              Oh no, that sounds really uncomfortable. Heat on your tummy and some gentle stretching help a lot of people. If the pain stops you doing everyday things, it&apos;s worth seeing a doctor.
              <span className="mt-1 block text-xs text-muted">Source: NHS, Period pain</span>
            </p>
          </figure>
        </section>

        <section aria-labelledby="shield-heading" className="bg-berry py-14 text-cream lg:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
            <div className="space-y-4">
              <Shield aria-hidden className="size-8 text-petal" />
              <h2 id="shield-heading" className="text-4xl text-cream">
                Bloom Shield works when nothing else does.
              </h2>
              <p className="text-lg text-cream/90">One tap starts a short countdown, then alerts your trusted circle with your location. The same screen calls 112 and opens a text to them, even with no internet and no AI.</p>
              <span className="inline-flex items-center gap-2 rounded-full bg-sos px-6 py-3 font-display text-xl font-semibold text-white">
                <Siren aria-hidden /> SOS
              </span>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Phone, title: "Trusted circle", body: "Up to eight people. Each one accepts first, so they know what an alert from you means." },
                { icon: MapPin, title: "Journeys", body: "Share a walk or cab ride home. If you miss a check-in, they're told. When you arrive, they're told that too." },
                { icon: Lock, title: "Discreet mode", body: "BLOOM can look like a plain planner, with a quick-exit button and a PIN for shared phones." },
                { icon: Check, title: "Honest status", body: "BLOOM shows who actually got your alert. It never says help is coming when it can't know." },
              ].map(({ icon: Icon, title, body }) => (
                <li key={title} className="rounded-3xl border border-cream/15 bg-cream/5 p-5">
                  <Icon aria-hidden className="mb-2 size-6 text-petal" />
                  <h3 className="text-xl text-cream">{title}</h3>
                  <p className="text-cream/85">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="cycle-heading" className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 lg:grid-cols-2 lg:px-10 lg:py-20">
          <div className="aspect-square w-full max-w-md overflow-hidden rounded-[2rem] border border-line shadow-[0_24px_60px_-30px_var(--glow)]">
            <GardenFlat flowers={sampleGarden} scene="dawn" companion={{ species: "kitten", color: "cream" }} pond={POND} />
          </div>
          <div className="space-y-8">
            <div className="space-y-3">
              <h2 id="cycle-heading" className="text-4xl">
                Your cycle, without false certainty
              </h2>
              <p className="text-lg text-fg">
                Predictions come from your own history and show a range with how sure BLOOM is. Irregular cycles are pointed out gently, with when it&apos;s worth seeing a doctor. Log flow, cramps, moods and symptoms in a few taps.
              </p>
            </div>
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-4xl">
                <Flower2 aria-hidden className="size-8 text-pink-ink" /> A garden that grows with you
              </h2>
              <p className="text-lg text-fg">
                Every check-in, breathing session and journal entry plants a flower on your own floating island in Bloomverse. Rain, ocean and forest sounds are made right on your phone. There are no streaks to break.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="privacy-heading" className="mx-auto max-w-6xl px-5 pb-14 lg:px-10">
          <div className="glass grid gap-8 p-6 sm:p-8 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 id="privacy-heading" className="text-3xl">
                Private by design, honest about limits
              </h2>
              <p className="text-fg">
                Your cycle logs, journal, moods and contacts are encrypted with a key that belongs to your account. Download everything or delete your account whenever you like. Deleting destroys the key first. No ads, no trackers,
                nothing sold.
              </p>
            </div>
            <ul className="space-y-3">
              {LIMITS.map((l) => (
                <li key={l} className="flex gap-3 text-fg">
                  <Check aria-hidden className="mt-1 size-4 shrink-0 text-pink-ink" />
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-sm text-muted lg:px-10">
          <ul aria-label="Helplines in India" className="flex flex-wrap gap-x-5 gap-y-1">
            {[
              ["Emergency", "112"],
              ["Women Helpline", "181"],
              ["Tele-MANAS mental health", "14416"],
            ].map(([label, n]) => (
              <li key={n}>
                {label}{" "}
                <a href={telLink(n)} className="font-semibold text-heading underline underline-offset-4">
                  {n}
                </a>
              </li>
            ))}
          </ul>
          <p>BLOOM is in early testing.</p>
        </div>
      </footer>
    </div>
  );
}
