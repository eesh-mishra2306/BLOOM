import { Footprints, Siren } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ContactsManager } from "@/components/safety/contacts-manager";
import { EmergencyCardSync } from "@/components/safety/emergency-card-sync";
import { DiscreetSettings, EmergencyInfoForm, OfflineReadiness, SosSettings } from "@/components/safety/shield-settings";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/ui/glass";
import { requireOnboardedUser } from "@/lib/auth/session";
import { hasConsent } from "@/lib/consent";
import { listContacts } from "@/lib/safety/contacts";
import { getEmergencyInfo } from "@/lib/safety/emergency-info";
import { emergencyFor } from "@/lib/safety/emergency-numbers";
import { webPushSender } from "@/lib/safety/push";

export const metadata: Metadata = { title: "Bloom Shield" };

export default async function SafetyPage() {
  const { user, profile } = await requireOnboardedUser("/safety");
  const [contacts, info, locationAllowed] = await Promise.all([listContacts(user.id), getEmergencyInfo(user.id), hasConsent(user.id, "location_sos")]);
  const e = emergencyFor(profile.country);
  const name = profile.displayName || user.name;

  return (
    <div className="space-y-5">
      <EmergencyCardSync card={{ name, emergency: e.emergency, extras: e.extras, contacts: contacts.map((c) => ({ name: c.name, phone: c.phone })), message: profile.sosMessage, info }} />

      <Glass tier={1} petal className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <h1 className="text-4xl">
            <span className="discreet:hidden">Bloom Shield</span>
            <span className="hidden discreet:inline">Help</span>
          </h1>
          <p className="mt-2 max-w-prose text-muted">
            One tap starts a short countdown, then alerts your trusted contacts with your location. Calling {e.emergency} and texting your contacts work from the same screen, even without internet.
          </p>
          <p className="mt-2 text-sm text-muted">BLOOM alerts the people you trust. It doesn&apos;t contact the police or an ambulance for you.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild variant="danger" size="lg" className="h-16 px-10 text-xl">
            <Link href="/sos?go=1">
              <Siren aria-hidden /> SOS
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/journey">
              <Footprints aria-hidden /> Start a journey
            </Link>
          </Button>
        </div>
      </Glass>

      <Glass tier={2}>
        <h2 className="mb-1 text-2xl">Trusted circle</h2>
        <p className="mb-4 text-muted">People who get your SOS and journey alerts. Each one accepts first, so they know what to expect.</p>
        <ContactsManager
          contacts={contacts.map((c) => ({ id: c.id, name: c.name, phone: c.phone, relationship: c.relationship, status: c.status, devices: c.devices }))}
          userName={name}
          pushConfigured={webPushSender() !== null}
        />
      </Glass>

      <div className="grid gap-5 lg:grid-cols-2">
        <Glass tier={2} id="sos-settings" className="scroll-mt-24">
          <h2 className="mb-4 text-2xl">SOS settings</h2>
          <SosSettings countdown={profile.sosCountdownSeconds} message={profile.sosMessage} phone={profile.phone} locationAllowed={locationAllowed} />
        </Glass>
        <Glass tier={2}>
          <h2 className="mb-4 text-2xl">Emergency information</h2>
          <EmergencyInfoForm info={info} />
        </Glass>
        <Glass tier={2} id="discreet" className="scroll-mt-24">
          <h2 className="mb-2 text-2xl">Discreet mode and lock</h2>
          <DiscreetSettings />
        </Glass>
        <Glass tier={2}>
          <h2 className="mb-3 text-2xl">Works offline</h2>
          <OfflineReadiness />
        </Glass>
      </div>
    </div>
  );
}
