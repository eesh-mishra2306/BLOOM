// Landing, home screen, settings and the privacy centre, ending with account deletion.
import { base, launch, signUpAndOnboard } from "./lib-session.mjs";

const { browser, page, errors } = await launch();
const shot = (n) => page.screenshot({ path: `/tmp/shots/${n}.png`, fullPage: true });
try {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await shot("landing");
  console.log("landing h1:", (await page.getByRole("heading", { level: 1 }).innerText()).replace(/\n/g, " / "));

  await signUpAndOnboard(page, { consents: ["Chat with Mochi", "Let Mochi remember"] });
  await page.waitForTimeout(1200);
  await shot("dashboard");
  console.log("greeting:", await page.getByRole("heading", { level: 1 }).innerText());
  console.log("coming up:", await page.getByRole("heading", { name: "Coming up" }).locator("..").innerText());
  await page.getByRole("radio", { name: "Rough", exact: true }).click();
  await page.getByRole("button", { name: "Save check-in" }).click();
  await page.getByText("You checked in today.").waitFor();
  console.log("after a rough check-in:", await page.getByText(/Sounds like a hard day/).first().innerText());

  await page.goto(`${base}/settings`);
  await page.getByRole("radio", { name: "Dark" }).click();
  await page.getByRole("radio", { name: "Larger" }).click();
  await page.waitForTimeout(400);
  console.log("theme attr:", await page.evaluate(() => document.documentElement.dataset.theme), "text scale:", await page.evaluate(() => getComputedStyle(document.documentElement).fontSize));
  await page.getByLabel("What should BLOOM call you?").fill("Asha R");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText("Saved").first().waitFor();
  await shot("settings-dark");
  await page.getByRole("radio", { name: "Light" }).click();
  await page.getByRole("radio", { name: "Default" }).click();

  await page.goto(`${base}/privacy`);
  await page.getByRole("switch", { name: /Let my moods tint Bloomverse/ }).click();
  await page.waitForTimeout(800);
  await page.reload();
  console.log("mood consent now:", await page.getByRole("switch", { name: /Let my moods tint Bloomverse/ }).getAttribute("aria-checked"));
  const dl = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download my data" }).click()]);
  const path = await dl[0].path();
  const data = JSON.parse((await import("node:fs")).readFileSync(path, "utf8"));
  console.log("export:", dl[0].suggestedFilename(), "| moods:", data.wellness.moods.length, "| name:", data.profile.displayName, "| consents:", data.consents.history.length);
  await shot("privacy");

  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.getByLabel("Your password").fill("wrong password here");
  await page.getByRole("checkbox", { name: /gone for good/ }).check();
  await page.getByRole("button", { name: "Delete forever" }).click();
  await page.getByText("That password isn't right.").waitFor();
  await page.getByLabel("Your password").fill("a calm walk home");
  await page.getByRole("button", { name: "Delete forever" }).click();
  await page.waitForURL((u) => u.pathname === "/" && u.search.includes("deleted"), { timeout: 20000 });
  console.log("after delete:", await page.getByRole("status").filter({ hasText: "deleted" }).innerText());
  await page.goto(`${base}/dashboard`);
  console.log("dashboard now redirects to:", new URL(page.url()).pathname);
} finally {
  console.log("page errors:", errors.length ? errors : "none");
  await browser.close();
}
