import { randomBytes } from "node:crypto";
import { afterAll, beforeAll } from "vitest";

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:5432/bloom_test";
process.env.BLOOM_MASTER_KEY ??= randomBytes(32).toString("base64");
process.env.BLOOM_MASTER_KEY_ID ??= "test";
process.env.BETTER_AUTH_SECRET ??= "integration-test-secret-integration-test-secret";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.CRON_SECRET ??= "integration-test-cron-secret";

beforeAll(async () => {
  const { runMigrations } = await import("@/lib/db/migrate");
  await runMigrations(process.env.DATABASE_URL!);
});

afterAll(async () => {
  const { closeDb } = await import("@/lib/db/client");
  await closeDb();
});
