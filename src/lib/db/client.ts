import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";
import { withVerifiedTls } from "./tls";

export type DB = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __bloomPool?: Pool; __bloomDb?: DB };

/** One pool per process (survives dev hot reloads). */
export function getDb(): DB {
  if (!globalForDb.__bloomDb) {
    const pool = new Pool({ connectionString: withVerifiedTls(getEnv().DATABASE_URL), max: 10, idleTimeoutMillis: 30_000 });
    globalForDb.__bloomPool = pool;
    globalForDb.__bloomDb = drizzle(pool, { schema });
  }
  return globalForDb.__bloomDb;
}

export async function closeDb() {
  await globalForDb.__bloomPool?.end();
  globalForDb.__bloomPool = undefined;
  globalForDb.__bloomDb = undefined;
}

export { schema };
