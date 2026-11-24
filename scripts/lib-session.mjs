// Shared helper: launch Chrome, sign up a fresh user and finish onboarding through the UI.
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import pg from "pg";

export const base = process.env.BASE ?? "http://localhost:3000";

mkdirSync("/tmp/shots", { recursive: true });

// Uses Chrome if it's installed in the usual Linux place (or CHROME_PATH), else Playwright's own Chromium
// (run `npx playwright install chromium` once).
const chrome = process.env.CHROME_PATH ?? (existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined);

export async function launch({ mobile = true } = {}) {
  const browser = await chromium.launch({
    executablePath: chrome,
    args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"],
  });
  const context = await browser.newContext(
    mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 820 } },
  );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !m.text().includes("(404)") && errors.push(m.text()));
  return { browser, context, page, errors };
}

/** Sign-up is rate limited (5 a minute per address). Test runs all come from one address, so clear it. */
async function clearAuthRateLimits() {
  const url = readFileSync(new URL("../.env.local", import.meta.url), "utf8").match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
  if (!url) return;
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  await db.query("DELETE FROM rate_limit");
  await db.end();
}

export async function signUpAndOnboard(page, { consents = ["Chat with Mochi"], name = "Asha" } = {}) {
  await clearAuthRateLimits();
  const email = `asha+${Date.now()}${Math.floor(Math.random() * 1e4)}@example.com`;
  await page.goto(`${base}/auth?mode=create`);
  await page.getByLabel("Your first name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("a calm walk home");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).last().click();
  await page.waitForURL("**/onboarding", { timeout: 30000 });
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Continue" }).click();
  for (const c of consents) await page.getByRole("switch", { name: new RegExp(c) }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  const start = new Date(Date.now() - 20 * 86400000).toLocaleDateString("en-CA");
  await page.getByLabel("When did your last period start?").fill(start);
  await page.getByLabel("Usual cycle length (days)").fill("29");
  await page.getByRole("button", { name: "Finish" }).click();
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  return { email };
}
