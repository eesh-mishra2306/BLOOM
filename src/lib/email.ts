import "server-only";
import { getEnv } from "@/lib/env";

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("Email isn't set up on this server, so BLOOM can't send password-reset links yet.");
    this.name = "EmailNotConfiguredError";
  }
}

export function emailConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
}

/** Sends a plain-text email through Resend. Throws when email is not configured or the send fails. */
export async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }) {
  const env = getEnv();
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new EmailNotConfiguredError();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Email provider refused the message (HTTP ${res.status})`);
}
