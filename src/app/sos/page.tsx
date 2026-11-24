import type { Metadata } from "next";
import { EmergencyCardSync } from "@/components/safety/emergency-card-sync";
import { SosScreen } from "@/components/safety/sos-screen";
import { getSessionUser } from "@/lib/auth/session";
import { hasConsent } from "@/lib/consent";
import { ensureProfile } from "@/lib/profile";
import { listContacts } from "@/lib/safety/contacts";
import { getEmergencyInfo } from "@/lib/safety/emergency-info";
import { emergencyFor } from "@/lib/safety/emergency-numbers";

export const metadata: Metadata = { title: "Emergency" };

export default async function SosPage({ searchParams }: PageProps<"/sos">) {
  const params = await searchParams;
  const autoStart = params.go === "1";
  const user = await getSessionUser();

  if (!user) {
    const e = emergencyFor("IN");
    return <SosScreen signedIn={false} name="Someone" emergency={e.emergency} extras={e.extras} countdown={5} customMessage={null} contacts={[]} info={null} locationAllowed={false} autoStart={false} />;
  }

  const [profile, contacts, info, locationAllowed] = await Promise.all([
    ensureProfile(user.id),
    listContacts(user.id),
    getEmergencyInfo(user.id),
    hasConsent(user.id, "location_sos"),
  ]);
  const e = emergencyFor(profile.country);
  const name = profile.displayName || user.name;
  const people = contacts.map((c) => ({ name: c.name, phone: c.phone }));
  return (
    <>
      <EmergencyCardSync card={{ name, emergency: e.emergency, extras: e.extras, contacts: people, message: profile.sosMessage, info }} />
      <SosScreen
        signedIn
        name={name}
        emergency={e.emergency}
        extras={e.extras}
        countdown={profile.sosCountdownSeconds}
        customMessage={profile.sosMessage}
        contacts={people}
        info={info}
        locationAllowed={locationAllowed}
        autoStart={autoStart}
      />
    </>
  );
}
