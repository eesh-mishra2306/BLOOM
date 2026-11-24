import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";

/**
 * Fixed-window limiter stored in Postgres, so it holds across server instances.
 * One atomic upsert per call: no read-modify-write race.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ ok: boolean; remaining: number; retryAfter: number }> {
  const result = await getDb().execute<{ count: number; window_start: Date | string }>(sql`
    INSERT INTO app_rate_limit (key, count, window_start)
    VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN app_rate_limit.window_start <= now() - make_interval(secs => ${windowSeconds})
                   THEN 1 ELSE app_rate_limit.count + 1 END,
      window_start = CASE WHEN app_rate_limit.window_start <= now() - make_interval(secs => ${windowSeconds})
                   THEN now() ELSE app_rate_limit.window_start END
    RETURNING count, window_start
  `);
  const row = result.rows[0];
  const count = Number(row.count);
  const windowEnds = new Date(row.window_start).getTime() + windowSeconds * 1000;
  const ok = count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - count),
    retryAfter: ok ? 0 : Math.max(1, Math.ceil((windowEnds - Date.now()) / 1000)),
  };
}
