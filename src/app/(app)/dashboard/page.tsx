import { BookHeart, ExternalLink, Flower2, Footprints, Phone, Siren, Sprout } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AmbientPlayer } from "@/components/audio/ambient-player";
import { PredictionCard } from "@/components/cycle/prediction-card";
import { TalkButton } from "@/components/home/talk-button";
import { MochiFlat } from "@/components/mochi/mochi-flat";
import type { Species } from "@/components/mochi/palette";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/ui/glass";
import { MoodCheckin } from "@/components/wellness/mood-checkin";
import { MoodIcon, moodLabel } from "@/components/wellness/mood-faces";
import { requireOnboardedUser } from "@/lib/auth/session";
import { predict } from "@/lib/cycle/predict";
import { getAllDayLogs } from "@/lib/cycle/repo";
import { diffDays, formatDay, isoFromDate, isoToday } from "@/lib/dates";
import { dailyTip, homeGreeting, hoursSince } from "@/lib/home";
import { listContacts } from "@/lib/safety/contacts";
import { emergencyFor } from "@/lib/safety/emergency-numbers";
import { clock } from "@/lib/safety/journey-client";
import { getActiveJourney } from "@/lib/safety/journeys";
import { telLink } from "@/lib/safety/links";
import { listActivities } from "@/lib/wellness/activity";
import { reflectionPrompt } from "@/lib/wellness/prompts";
import { listMoods } from "@/lib/wellness/repo";

export const metadata: Metadata = { title: "Home" };

export default async function DashboardPage() {
  const { user, profile } = await requireOnboardedUser("/dashboard");
  const tz = profile.timeZone;
  const today = isoToday(tz);
  const [logs, moods, journey, contacts, activities] = await Promise.all([getAllDayLogs(user.id), listMoods(user.id, 1), getActiveJourney(user.id), listContacts(user.id), listActivities(user.id)]);
  const prediction = predict(logs, today, { typicalCycleLength: profile.typicalCycleLength, typicalPeriodLength: profile.typicalPeriodLength });
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(new Date()));
  const last = moods[0] ?? null;
  const checkedInToday = last ? isoFromDate(last.createdAt, tz) === today : false;
  const name = profile.displayName || user.name;
  const greeting = homeGreeting({
    name,
    hour,
    journey: Boolean(journey),
    lastMood: last ? { mood: last.mood, hoursAgo: hoursSince(last.createdAt) } : null,
    phase: prediction.phase ?? null,
    daysToPeriod: prediction.nextStart ? diffDays(today, prediction.nextStart) : null,
  });
  const tip = dailyTip(prediction.phase, today);
  const emergency = emergencyFor(profile.country).emergency;
  const pending = contacts.filter((c) => c.status === "pending");
  const alertsOff = contacts.filter((c) => c.status === "accepted" && c.devices === 0);

  const upcoming: { key: string; text: string; href?: string }[] = [];
  if (journey) upcoming.push({ key: "journey", text: `Journey check-in at ${clock(journey.nextCheckInDueAt.getTime(), tz)}`, href: "/journey" });
  if (prediction.late && prediction.daysLate) upcoming.push({ key: "late", text: `Period is ${prediction.daysLate} ${prediction.daysLate === 1 ? "day" : "days"} later than estimated`, href: "/cycle" });
  else if (prediction.windowStart && prediction.windowEnd && prediction.phase !== "menstrual")
    upcoming.push({ key: "period", text: `Period may start ${formatDay(prediction.windowStart)}–${formatDay(prediction.windowEnd)}`, href: "/cycle" });
  for (const c of pending.slice(0, 2)) upcoming.push({ key: `p-${c.id}`, text: `${c.name} hasn't accepted your invite yet`, href: "/safety" });
  for (const c of alertsOff.slice(0, 2)) upcoming.push({ key: `a-${c.id}`, text: `${c.name} has alerts turned off`, href: "/safety" });

  return (
    <div className="space-y-5">
      <Glass tier={1} petal className="flex items-center gap-4 sm:gap-6">
        <MochiFlat species={profile.companionSpecies as Species} color={profile.companionColor} mood={last && last.mood <= 2 ? "idle" : "happy"} className="size-20 shrink-0 sm:size-28" title={profile.companionName} />
        <div className="min-w-0 space-y-2">
          <h1 className="text-3xl sm:text-4xl">{greeting.title}</h1>
          <p className="text-lg text-fg">
            <span className="font-semibold text-heading">{profile.companionName}:</span> {greeting.line}
          </p>
          <TalkButton name={profile.companionName} />
        </div>
      </Glass>

      {journey ? (
        <Link href="/journey" className="emergency-surface flex items-center gap-3 rounded-3xl p-4">
          <Footprints aria-hidden className="size-6 shrink-0 text-sos-fg" />
          <span className="text-sos-fg">
            <span className="block font-semibold">{journey.status === "escalated" ? "You missed a check-in" : `On the way to ${journey.destination}`}</span>
            <span className="text-sm">Arriving by {clock(journey.expectedArrivalAt.getTime(), tz)}. Tap to check in or say you&apos;ve arrived.</span>
          </span>
        </Link>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <PredictionCard prediction={prediction} showFertile={false} />

          <Glass tier={2} className="space-y-3">
            <h2 className="text-2xl">How are you feeling?</h2>
            {checkedInToday && last ? (
              <div role="status" className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 font-semibold text-heading">
                    <MoodIcon value={last.mood} className="size-5" /> {moodLabel(last.mood)}
                  </span>
                  <span className="text-muted">You checked in today.</span>
                  <Link href="/wellness#mood" className="font-semibold text-pink-ink underline-offset-4 hover:underline">
                    Check in again
                  </Link>
                </div>
                {last.mood <= 2 ? (
                  <p className="text-fg">
                    Sounds like a hard day. A few slow breaths can take the edge off, or tell {profile.companionName} what&apos;s going on.{" "}
                    <Link href="/wellness#breathe" className="font-semibold underline underline-offset-4">
                      Breathe for a minute
                    </Link>
                  </p>
                ) : null}
              </div>
            ) : (
              <MoodCheckin country={profile.country} compact />
            )}
          </Glass>

          <Glass tier={2} className="space-y-3">
            <h2 className="text-2xl">Coming up</h2>
            {upcoming.length ? (
              <ul className="divide-y divide-line">
                {upcoming.map((u) => (
                  <li key={u.key} className="py-2">
                    {u.href ? (
                      <Link href={u.href} className="text-fg hover:text-heading">
                        {u.text}
                      </Link>
                    ) : (
                      u.text
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">Nothing coming up. Enjoy the quiet.</p>
            )}
          </Glass>
        </div>

        <div className="space-y-5">
          <Glass tier={2} className="space-y-3">
            <h2 className="text-2xl">Safety</h2>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="danger" size="lg" className="col-span-2">
                <Link href="/sos?go=1">
                  <Siren aria-hidden /> SOS
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/journey">
                  <Footprints aria-hidden /> {journey ? "Your journey" : "Start a journey"}
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <a href={telLink(emergency)}>
                  <Phone aria-hidden /> Call {emergency}
                </a>
              </Button>
            </div>
            <p className="text-sm text-muted">
              {contacts.filter((c) => c.status === "accepted").length
                ? `${contacts.filter((c) => c.status === "accepted" && c.devices > 0).length} of ${contacts.filter((c) => c.status === "accepted").length} trusted contacts get alerts on their phone.`
                : "Add a trusted contact so SOS can alert someone you know."}{" "}
              <Link href="/safety" className="font-semibold text-pink-ink underline-offset-4 hover:underline">
                Bloom Shield
              </Link>
            </p>
          </Glass>

          <Glass tier={2} className="space-y-2">
            <p className="text-sm font-semibold text-muted">Today&apos;s reading</p>
            <h2 className="text-2xl">{tip.title}</h2>
            <p className="line-clamp-4 text-fg">{tip.body}</p>
            <p className="text-sm text-muted">
              From{" "}
              <a href={tip.sources[0].url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-pink-ink underline-offset-4 hover:underline">
                {tip.sources[0].publisher} <ExternalLink aria-hidden className="size-3" />
              </a>
              . General information, not medical advice.
            </p>
          </Glass>

          <Glass tier={3} className="space-y-3">
            <p className="text-sm font-semibold text-muted">Today&apos;s reflection</p>
            <p className="font-display text-xl text-heading">{reflectionPrompt(today)}</p>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/journal?prompt=${encodeURIComponent(reflectionPrompt(today))}`}>
                <BookHeart aria-hidden /> Write about it
              </Link>
            </Button>
          </Glass>

          <Glass tier={2} className="space-y-3">
            <h2 className="text-2xl">Sound</h2>
            <AmbientPlayer compact />
          </Glass>

          <Link href="/bloomverse" className="glass-lite flex items-center gap-3 rounded-3xl p-4">
            {activities.length ? <Flower2 aria-hidden className="size-6 text-pink-ink" /> : <Sprout aria-hidden className="size-6 text-pink-ink" />}
            <span>
              <span className="block font-semibold text-heading">
                {activities.length ? `${activities.length} ${activities.length === 1 ? "flower" : "flowers"} in Bloomverse` : "Your garden is waiting"}
              </span>
              <span className="text-sm text-muted">Every check-in, breath and journal entry grows one.</span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
