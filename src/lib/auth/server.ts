import "server-only";
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { getEnv } from "@/lib/env";

function createAuth() {
  const env = getEnv();
  const origin = new URL(env.BETTER_AUTH_URL);
  return betterAuth({
    appName: "BLOOM",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        passkey: schema.passkey,
        rateLimit: schema.rateLimit,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Reset your BLOOM password",
          text: `Someone asked to reset the password for your BLOOM account.\n\nOpen this link to choose a new one (it expires in 1 hour):\n${url}\n\nIf this wasn't you, you can ignore this email. Your password stays the same.`,
        });
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: process.env.NODE_ENV !== "test",
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 300, max: 3 },
      },
    },
    advanced: {
      database: { generateId: () => crypto.randomUUID() },
      useSecureCookies: origin.protocol === "https:",
    },
    telemetry: { enabled: false },
    plugins: [
      passkey({ rpID: origin.hostname, rpName: "BLOOM", origin: origin.origin }),
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

let instance: Auth | undefined;

/** Created on first use so `next build` doesn't need runtime secrets. */
export function getAuth(): Auth {
  instance ??= createAuth();
  return instance;
}
