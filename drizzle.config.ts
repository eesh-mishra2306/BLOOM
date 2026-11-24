import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  schemaFilter: ["public", "keystore"],
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://postgres@localhost:5432/bloom" },
  strict: true,
  verbose: false,
});
