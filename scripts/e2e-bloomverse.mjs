// Bloomverse: the 3D garden grows from real activities; sky, sound and Mochi respond.
import { readFileSync } from "node:fs";
import pg from "pg";
import { base, launch, signUpAndOnboard } from "./lib-session.mjs";

const { browser, page, errors } = await launch();
try {
  const { email } = await signUpAndOnboard(page);
  // One real activity through the UI…
  await page.goto(`${base}/wellness`);
  await page.getByRole("radio", { name: "Good", exact: true }).click();
  await page.getByRole("button", { name: "Save check-in" }).click();
  await page.getByText("Thanks for checking in.").waitFor();
  // …and a few weeks of history straight into the database, for a fuller garden.
  const url = readFileSync(new URL("../.env.local", import.meta.url), "utf8").match(/^DATABASE_URL=(.*)$/m)[1].trim();
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  await db.query(
    `INSERT INTO wellness_activity (id, user_id, kind, completed_at)
     SELECT gen_random_uuid()::text, u.id, (ARRAY['breathing','mood','journal','cycle_log','goal'])[1 + (g % 5)], now() - (g || ' hours')::interval
     FROM "user" u, generate_series(1, 90) g WHERE u.email = $1`,
    [email],
  );
  await db.end();

  await page.goto(`${base}/bloomverse`);
  await page.locator(".garden canvas").waitFor({ timeout: 30000 });
  await page.waitForTimeout(4000);
  console.log("summary:", await page.locator(".garden .sr-only").first().innerText());
  await page.screenshot({ path: "/tmp/shots/bloomverse.png" });

  // Tap Mochi in the middle of the garden
  const box = await page.locator(".garden").boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.42);
  await page.waitForTimeout(800);
  console.log("mochi says:", await page.locator(".garden p:not(.sr-only)").first().innerText().catch(() => "(nothing)"));

  // Moonlight sky and rain
  await page.getByRole("radio", { name: "Moonlight" }).click();
  await page.getByRole("radio", { name: "Rain" }).click();
  await page.getByText(/Playing rain|Making the sound/).waitFor({ timeout: 15000 });
  await page.getByText("Playing rain.").waitFor({ timeout: 20000 });
  console.log("sound:", await page.getByText("Playing rain.").innerText());
  await page.getByRole("button", { name: "Turn right" }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "/tmp/shots/bloomverse-moon.png" });
  await page.screenshot({ path: "/tmp/shots/bloomverse-full.png", fullPage: true });

  // Other skies
  for (const sky of ["Dawn", "Golden", "Dusk"]) {
    await page.getByRole("radio", { name: sky }).click();
    await page.getByRole("button", { name: "Reset view" }).click();
    await page.locator(".garden").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1800);
    await page.locator(".garden").screenshot({ path: `/tmp/shots/garden-${sky.toLowerCase()}.png` });
  }

  // SOS (opened from the top bar, inside the app) stops the sound
  await page.getByRole("link", { name: "SOS" }).first().click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.goBack();
  await page.getByText(/Paused because SOS opened|Playing rain/).first().waitFor({ timeout: 10000 });
  console.log("after SOS:", await page.getByText(/Paused because SOS opened|Playing rain/).first().innerText().catch(() => "(player reset by navigation)"));
} finally {
  console.log("page errors:", errors.length ? errors : "none");
  await browser.close();
}
