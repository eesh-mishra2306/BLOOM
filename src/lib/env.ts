import "server-only";
import { z } from "zod";

/**
 * Server environment, validated lazily so that `next build` works without secrets and a
 * missing value fails with a message that names it, not a crash deep inside a request.
 */
const optional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (postgres://…)"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  BLOOM_MASTER_KEY: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, "BLOOM_MASTER_KEY must be 32 bytes, base64-encoded"),
  BLOOM_MASTER_KEY_ID: z.string().min(1).default("v1"),

  AI_PROVIDER: z.enum(["anthropic", "openai", "google"]).optional().catch(undefined),
  AI_MODEL: optional,
  ANTHROPIC_API_KEY: optional,
  OPENAI_API_KEY: optional,
  GOOGLE_GENERATIVE_AI_API_KEY: optional,

  VAPID_PUBLIC_KEY: optional,
  VAPID_PRIVATE_KEY: optional,
  VAPID_SUBJECT: optional,

  CRON_SECRET: optional,
  RESEND_API_KEY: optional,
  EMAIL_FROM: optional,
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`BLOOM is missing server configuration:\n${problems}\nSee .env.example.`);
  }
  cached = parsed.data;
  return cached;
}

/** For tests that change process.env between cases. */
export function resetEnvCache() {
  cached = undefined;
}
