import type { Metadata } from "next";
import { CompanionStudio } from "@/components/mochi/companion-studio";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getConsents } from "@/lib/consent";

export const metadata: Metadata = { title: "Mochi" };

export default async function CompanionPage() {
  const { user, profile } = await requireOnboardedUser("/companion");
  const consents = await getConsents(user.id);
  return (
    <CompanionStudio
      userName={profile.displayName || user.name}
      country={profile.country}
      chatAllowed={consents.ai_chat}
      memoryAllowed={consents.ai_memory}
      initial={{
        name: profile.companionName,
        species: profile.companionSpecies,
        color: profile.companionColor,
        accessory: profile.companionAccessory,
        personality: profile.companionPersonality,
        language: profile.companionLanguage,
      }}
    />
  );
}
