import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { ensureProfile } from "@/lib/profile";
import { OnboardingFlow } from "./flow";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  const profile = await ensureProfile(user.id);
  if (profile.onboardedAt) redirect("/dashboard");
  return <OnboardingFlow defaultName={profile.displayName || (user.name === "Friend" ? "" : user.name)} />;
}
