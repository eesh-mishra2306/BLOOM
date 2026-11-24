// Usage: node scripts/shot.mjs <url> <out.png> [--mobile] [--prefs '{"theme":"dark"}'] [--wait ms] [--full]
import { chromium } from "@playwright/test";

const [url, out, ...rest] = process.argv.slice(2);
const opt = (name) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
};
const mobile = rest.includes("--mobile");
const full = rest.includes("--full");
const prefs = opt("--prefs");
const wait = Number(opt("--wait") ?? 1200);
const cookie = opt("--cookie");

const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"],
});
const context = await browser.newContext(
  mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1 },
);
if (cookie) {
  const [name, value] = cookie.split("=");
  await context.addCookies([{ name, value, url: new URL(url).origin }]);
}
if (prefs) {
  await context.addInitScript((p) => localStorage.setItem("bloom.prefs.v1", p), prefs);
}
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(wait);
await page.screenshot({ path: out, fullPage: full });
if (errors.length) console.log("PAGE ERRORS:\n" + errors.slice(0, 8).join("\n"));
console.log("saved", out);
await browser.close();
