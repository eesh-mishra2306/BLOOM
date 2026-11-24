import type { Metadata } from "next";
import { BloomverseView } from "@/components/bloomverse/bloomverse-view";
import type { Species } from "@/components/mochi/palette";
import type { Accessory } from "@/components/mochi/rig";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getConsents } from "@/lib/consent";
import { ambientFromMoods } from "@/lib/garden/growth";
import { listActivities } from "@/lib/wellness/activity";
import { listMoods } from "@/lib/wellness/repo";

export const metadata: Metadata = { title: "Bloomverse" };

export default async function BloomversePage() {
  const { user, profile } = await requireOnboardedUser("/bloomverse");
  const consents = await getConsents(user.id);
  const [activities, moods] = await Promise.all([listActivities(user.id), consents.mood_bloomverse ? listMoods(user.id, 7) : Promise.resolve([])]);
  return (
    <BloomverseView
      activities={activities.map((a) => ({ id: a.id, kind: a.kind, at: a.completedAt.toISOString() }))}
      moodScene={ambientFromMoods(moods, consents.mood_bloomverse)}
      moodConsent={consents.mood_bloomverse}
      companion={{ species: profile.companionSpecies as Species, color: profile.companionColor, accessory: profile.companionAccessory as Accessory, name: profile.companionName }}
    />
  );
}
