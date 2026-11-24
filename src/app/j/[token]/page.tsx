import { Clock, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { AutoRefresh, OnItButton } from "@/components/safety/journey-watch";
import { Wordmark } from "@/components/shell/wordmark";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/ui/glass";
import { emergencyFor } from "@/lib/safety/emergency-numbers";
import { checkJourneyByToken, journeyForShareToken } from "@/lib/safety/journeys";
import { mapsLink, telLink } from "@/lib/safety/links";
import { webPushSender } from "@/lib/safety/push";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Journey", robots: { index: false, follow: false }, referrer: "no-referrer" };

function at(d: Date | number, timeZone: string) {
  return new Date(d).toLocaleTimeString("en-IN", { timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}

const STATUS = {
  active: { label: "On the way", tone: "bg-accent-soft text-heading" },
  escalated: { label: "Missed a check-in", tone: "bg-sos-bg text-sos-fg" },
  arrived: { label: "Arrived", tone: "bg-leaf/20 text-heading" },
  ended: { label: "Journey ended", tone: "bg-line text-heading" },
} as const;

export default async function JourneyLinkPage({ params, searchParams }: PageProps<"/j/[token]">) {
  const { token } = await params;
  const q = await searchParams;
  // A contact refreshing this page also keeps the journey's checks moving.
  await checkJourneyByToken(token, new Date(), webPushSender());
  const j = await journeyForShareToken(token);
  const d = typeof q.d === "string" ? q.d : null;
  const r = typeof q.r === "string" ? q.r : null;

  if (!j || j.expired) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-5 py-8">
        <Wordmark />
        <Glass tier={1} petal>
          <h1 className="text-3xl">{j ? "This journey link has expired" : "This link doesn't work"}</h1>
          <p className="mt-2 text-muted">
            Journey links stop working an hour after the journey ends. If you&apos;re worried about someone, call them, or call 112 if they may be in danger.
          </p>
        </Glass>
      </main>
    );
  }

  const first = j.name.split(" ")[0];
  const emergency = emergencyFor(j.country).emergency;
  const live = j.status === "active" || j.status === "escalated";
  const missedAt = j.nextCheckInDueAt.getTime() + j.graceMinutes * 60_000;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-5 px-5 py-8">
      <Wordmark />
      {live ? <AutoRefresh seconds={20} /> : null}
      <Glass tier={1} petal className="space-y-4">
        <span className={cn("inline-flex rounded-full px-3 py-1 text-sm font-semibold", STATUS[j.status].tone)}>{STATUS[j.status].label}</span>
        <div>
          <h1 className="text-3xl">{first}&apos;s journey</h1>
          <p className="text-lg text-fg">
            Going to <span className="font-semibold text-heading">{j.destination}</span>
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-fg">
          <div>
            <dt className="text-sm text-muted">Started</dt>
            <dd className="font-semibold text-heading">{at(j.startedAt, j.timeZone)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{j.status === "arrived" ? "Arrived" : "Expected by"}</dt>
            <dd className="font-semibold text-heading">{at(j.status === "arrived" && j.endedAt ? j.endedAt : j.expectedArrivalAt, j.timeZone)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-sm text-muted">Last check-in</dt>
            <dd className="flex items-center gap-1.5 font-semibold text-heading">
              <Clock aria-hidden className="size-4" />
              {j.lastCheckInAt ? at(j.lastCheckInAt, j.timeZone) : "None yet"}
            </dd>
          </div>
        </dl>

        {j.status === "escalated" ? (
          <div role="alert" className="emergency-surface space-y-3 rounded-2xl p-4">
            <p className="font-semibold text-sos-fg">
              {first} didn&apos;t check in by {at(missedAt, j.timeZone)}. Try calling {first}. If you can&apos;t reach {first} and you&apos;re worried, call {emergency}.
            </p>
            {d && r ? <OnItButton d={d} r={r} first={first} /> : null}
          </div>
        ) : null}
        {j.status === "arrived" ? <p className="text-fg">{first} tapped &ldquo;I&apos;ve arrived&rdquo;.</p> : null}
        {j.status === "ended" ? <p className="text-fg">{first} ended the journey.</p> : null}
      </Glass>

      <Glass tier={2} className="space-y-3">
        <h2 className="flex items-center gap-2 text-xl">
          <MapPin aria-hidden className="size-5 text-pink-ink" /> Location
        </h2>
        {j.lastLocation ? (
          <>
            <p className="text-fg">
              Last shared {j.lastLocation.at ? at(j.lastLocation.at, j.timeZone) : "recently"}, accurate to about {Math.round(j.lastLocation.accuracy)} m.
            </p>
            <Button asChild variant="secondary">
              <a href={mapsLink(j.lastLocation.lat, j.lastLocation.lng)} target="_blank" rel="noopener noreferrer">
                Open in Maps
              </a>
            </Button>
          </>
        ) : (
          <p className="text-muted">{first} isn&apos;t sharing a location on this journey. Check-ins still show here.</p>
        )}
      </Glass>

      <div className="grid gap-2 sm:grid-cols-2">
        {j.phone ? (
          <Button asChild size="lg">
            <a href={telLink(j.phone)}>
              <Phone aria-hidden /> Call {first}
            </a>
          </Button>
        ) : null}
        <Button asChild size="lg" variant={j.status === "escalated" ? "danger" : "secondary"}>
          <a href={telLink(emergency)}>Call {emergency}</a>
        </Button>
      </div>
      <p className="text-center text-sm text-muted">
        {live ? "This page updates by itself. " : ""}The link stops working an hour after the journey ends.
      </p>
    </main>
  );
}
