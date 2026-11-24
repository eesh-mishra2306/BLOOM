import type { Metadata } from "next";
import Link from "next/link";
import { JourneyLive } from "@/components/safety/journey-live";
import { JourneyPlanner } from "@/components/safety/journey-planner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getConsents } from "@/lib/consent";
import { getEnv } from "@/lib/env";
import { listContacts } from "@/lib/safety/contacts";
import type { CircleMember, ClientJourney } from "@/lib/safety/journey-client";
import { getActiveJourney } from "@/lib/safety/journeys";
import { vapidPublicKey } from "@/lib/safety/push";

export const metadata: Metadata = { title: "Journey" };

export default async function JourneyPage() {
  const { user, profile } = await requireOnboardedUser("/journey");
  const [contacts, consents, active] = await Promise.all([listContacts(user.id), getConsents(user.id), getActiveJourney(user.id)]);
  const circle: CircleMember[] = contacts
    .filter((c) => c.status === "accepted" || c.status === "pending")
    .map((c) => ({ id: c.id, name: c.name, relationship: c.relationship, phone: c.phone, status: c.status, devices: c.devices }));

  if (active) {
    return (
      <JourneyLive
        initial={JSON.parse(JSON.stringify(active)) as ClientJourney}
        shareUrl={new URL(active.sharePath, getEnv().BETTER_AUTH_URL).toString()}
        circle={circle}
        timeZone={profile.timeZone}
        vapidKey={vapidPublicKey()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-4xl">Start a journey</h1>
        <p className="max-w-prose text-fg">Walking home late, taking a cab, going somewhere new? Let the people you trust follow along until you get there.</p>
      </div>
      {circle.length ? (
        <JourneyPlanner circle={circle} locationConsent={consents.location_journey} timeZone={profile.timeZone} />
      ) : (
        <EmptyState
          title="Add someone you trust first"
          body="Journeys are shared with people in your trusted circle. Add one person to get started."
          action={
            <Button asChild>
              <Link href="/safety">Add a trusted contact</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
