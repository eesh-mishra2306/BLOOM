// Journey sharing end to end: plan, start, the contact follows along, check in, extend, arrive.
// Also checks the screens are honest about the journey timer: off until the scheduler has run.
import { readFileSync } from "node:fs";
import pg from "pg";
import { base, launch, signUpAndOnboard } from "./lib-session.mjs";

/** Sets the journey timer's last run the way the scheduler records it. null clears it (timer off). */
async function setTimerRun(at) {
  const url = readFileSync(new URL("../.env.local", import.meta.url), "utf8").match(/^DATABASE_URL=(.*)$/m)[1].trim();
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  if (at) await db.query("INSERT INTO job_heartbeat (job, last_run_at) VALUES ('journeys', $1) ON CONFLICT (job) DO UPDATE SET last_run_at = EXCLUDED.last_run_at", [at]);
  else await db.query("DELETE FROM job_heartbeat WHERE job = 'journeys'");
  await db.end();
}

const { browser, context, page, errors } = await launch();
await context.grantPermissions(["geolocation"], { origin: base });
await context.setGeolocation({ latitude: 30.3165, longitude: 78.0322, accuracy: 25 });
const shot = (p, n, full = true) => p.screenshot({ path: `/tmp/shots/${n}.png`, fullPage: full });
try {
  await signUpAndOnboard(page);

  // Empty state before anyone is in the circle
  await page.goto(`${base}/journey`);
  console.log("empty state:", await page.getByText("Add someone you trust first").count());

  await page.goto(`${base}/safety`);
  await page.getByRole("button", { name: "Add a contact" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("Priya");
  await dialog.getByLabel("Phone number", { exact: true }).fill("+91 98765 43210");
  await dialog.getByRole("button", { name: "Add and create invite" }).click();
  const inviteUrl = await dialog.getByLabel("Invite link").inputValue();
  await page.keyboard.press("Escape");

  const contactCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const contact = await contactCtx.newPage();
  await contact.goto(inviteUrl);
  await contact.getByRole("button", { name: "Accept" }).click();
  await contact.getByText(/trusted circle/).waitFor();

  // Plan the journey, with the timer off: the planner says reminders and alerts need BLOOM open
  await setTimerRun(null);
  await page.goto(`${base}/journey`);
  await page.getByText(/steps 2 and 3 only happen while BLOOM is open on your screen/).waitFor({ timeout: 10000 });
  console.log("planner timer note: shown while the timer is off");
  await page.getByLabel("Where are you going?").fill("Home from Rajpur Road");
  await page.getByRole("button", { name: "30 min" }).click();
  await page.getByRole("radio", { name: "Every 15 min" }).click();
  await page.getByRole("switch", { name: /Share my location/ }).click();
  await page.waitForTimeout(400);
  await shot(page, "journey-plan");
  await page.getByRole("button", { name: "Start journey" }).click();
  await page.getByText("On the way to").waitFor({ timeout: 20000 });
  await page.waitForTimeout(2500);
  const keepOpen = page.getByText("Keep BLOOM open on your screen.");
  await keepOpen.waitFor({ timeout: 10000 });
  await shot(page, "journey-live");

  // The scheduler starts: the live screen notices on its next sync with the server
  await setTimerRun(new Date());
  await keepOpen.waitFor({ state: "detached", timeout: 45000 });
  console.log("live timer note: hidden once the timer runs");
  const shareUrl = await page.getByLabel("Follow-along link").inputValue();
  console.log("next check-in:", await page.getByText("Next check-in").locator("..").innerText());
  console.log("location:", await page.getByText(/Sharing your location|Finding your location/).innerText());

  // The contact follows along
  await contact.goto(shareUrl);
  console.log("contact sees:", (await contact.locator("main").innerText()).split("\n").slice(0, 8).join(" | "));

  // Check in and add time
  await page.getByRole("button", { name: "I'm okay" }).click();
  await page.getByText("Checked in").first().waitFor();
  await page.getByRole("button", { name: "10 min" }).click();
  await page.getByText("Added 10 minutes").waitFor();
  console.log("after extend:", await page.getByText("Arriving by").locator("..").innerText());

  // Arrive
  await page.getByRole("button", { name: "I've arrived" }).first().click();
  await page.getByRole("heading", { name: "Start a journey" }).waitFor({ timeout: 20000 });
  if (await page.getByText(/steps 2 and 3 only happen/).count()) throw new Error("Planner still says the timer is off after it ran");
  console.log("planner timer note: hidden while the timer runs");
  await contact.reload();
  await contact.waitForTimeout(500);
  console.log("contact after arrival:", await contact.getByText("Arrived", { exact: true }).count(), "status pill");
  await shot(contact, "journey-follow");
  console.log("bad link:", await (await contact.goto(`${base}/j/not-a-token`), contact.getByRole("heading", { level: 1 }).innerText()));
} finally {
  await setTimerRun(null).catch(() => undefined);
  console.log("page errors:", errors.length ? errors : "none");
  await browser.close();
}
