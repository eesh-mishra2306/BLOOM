import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ensureProfile, type Profile } from "@/lib/profile";
import { getAuth } from "./server";

export type SessionUser = { id: string; email: string; name: string };

/** The signed-in user for this request, or null. Memoised per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  return { id: session.user.id, email: session.user.email, name: session.user.name };
});

/** For pages: sends signed-out visitors to /auth and brings them back afterwards. */
export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(next ? `/auth?next=${encodeURIComponent(next)}` : "/auth");
  return user;
}

/** For app pages: also sends people who haven't finished onboarding to /onboarding. */
export async function requireOnboardedUser(next?: string): Promise<{ user: SessionUser; profile: Profile }> {
  const user = await requireUser(next);
  const profile = await ensureProfile(user.id);
  if (!profile.onboardedAt) redirect("/onboarding");
  return { user, profile };
}

/** For route handlers: the session user from the request cookies, or null. */
export async function apiUser(req: Request): Promise<SessionUser | null> {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return null;
  return { id: session.user.id, email: session.user.email, name: session.user.name };
}
