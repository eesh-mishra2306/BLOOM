import { base, launch, signUpAndOnboard } from "./lib-session.mjs";

const { browser, context, page, errors } = await launch();
await context.grantPermissions(["geolocation"], { origin: base });
await context.setGeolocation({ latitude: 30.3165, longitude: 78.0322, accuracy: 25 }); // Dehradun
await signUpAndOnboard(page, { consents: ["Chat with Mochi", "Add my location to SOS"] });

// Trusted circle: add a contact and get the invite link
await page.goto(`${base}/safety`);
await page.getByRole("button", { name: "Add a contact" }).first().click();
const dialog = page.getByRole("dialog");
await dialog.getByLabel("Name", { exact: true }).fill("Priya");
await dialog.getByLabel("Phone number", { exact: true }).fill("+91 98765 43210");
await dialog.getByLabel("Relationship (optional)").fill("Sister");
await dialog.getByRole("button", { name: "Add and create invite" }).click();
const linkBox = dialog.getByLabel("Invite link");
await linkBox.waitFor();
const inviteUrl = await linkBox.inputValue();
await page.screenshot({ path: "/tmp/shots/invite-share.png" });
await page.keyboard.press("Escape");

// The contact opens the invite in their own browser and accepts
const contactCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const contactPage = await contactCtx.newPage();
await contactPage.goto(inviteUrl);
await contactPage.getByRole("button", { name: "Accept" }).click();
await contactPage.getByText(/trusted circle/).waitFor();
await contactPage.screenshot({ path: "/tmp/shots/invite-accepted.png" });

// Back to the user: Shield hub shows the accepted contact
await page.goto(`${base}/safety`);
await page.waitForTimeout(800);
await page.screenshot({ path: "/tmp/shots/safety.png", fullPage: true });

// SOS with countdown
await page.getByRole("link", { name: "SOS" }).first().click();
await page.getByRole("button", { name: "Cancel" }).waitFor();
await page.screenshot({ path: "/tmp/shots/sos-countdown.png" });
await page.waitForTimeout(6500);
await page.screenshot({ path: "/tmp/shots/sos-active.png" });
const statusText = await page.locator("section[aria-live=polite]").innerText();
console.log("SOS status:\n" + statusText);

// Offline: the service worker must serve the emergency page
await page.goto(`${base}/dashboard`);
await page.waitForTimeout(2500);
const swReady = await page.evaluate(async () => Boolean(await caches.match("/sos-offline.html")));
console.log("offline page cached:", swReady);
await context.setOffline(true);
await page.goto(`${base}/sos`).catch(() => undefined);
await page.waitForTimeout(800);
await page.screenshot({ path: "/tmp/shots/sos-offline.png" });
console.log("offline page title:", await page.title(), "| call link:", await page.locator("#call").getAttribute("href"), "| sms:", (await page.locator("#text").getAttribute("href"))?.slice(0, 60));
await context.setOffline(false);
const real = errors.filter((e) => !e.includes("ERR_INTERNET_DISCONNECTED")); // expected while offline is simulated
console.log(real.length ? "ERRORS:\n" + real.join("\n") : "no page errors");
await browser.close();
