// Local stand-in for the production scheduler: calls the journey check every 30 seconds.
// Usage: npm run cron:journeys   (reads CRON_SECRET and BETTER_AUTH_URL from .env.local)
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]),
);
const base = process.env.BASE ?? env.BETTER_AUTH_URL ?? "http://localhost:3000";
const secret = process.env.CRON_SECRET ?? env.CRON_SECRET;
if (!secret) {
  console.error("Set CRON_SECRET in .env.local first.");
  process.exit(1);
}

async function tick() {
  try {
    const res = await fetch(`${base}/api/cron/journeys`, { headers: { authorization: `Bearer ${secret}` } });
    const body = await res.text();
    console.log(new Date().toLocaleTimeString(), res.status, body);
  } catch (err) {
    console.error(new Date().toLocaleTimeString(), "couldn't reach", base, err.message);
  }
}
await tick();
setInterval(tick, 30_000);
