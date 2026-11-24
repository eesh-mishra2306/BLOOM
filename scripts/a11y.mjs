// Accessibility scan (axe-core, WCAG 2.2 A/AA rules) of every main screen, signed out and in.
import AxeBuilder from "@axe-core/playwright";
import { base, launch, signUpAndOnboard } from "./lib-session.mjs";

const { browser, page } = await launch();
const results = [];
async function scan(path, label = path) {
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).exclude("canvas").analyze();
  results.push({ label, violations: r.violations });
}
try {
  await scan("/", "landing");
  await scan("/auth", "sign in");
  await scan("/sos", "SOS (signed out)");
  await scan("/j/not-a-real-token", "journey link (invalid)");
  await signUpAndOnboard(page, { consents: ["Chat with Mochi"] });
  for (const p of ["/dashboard", "/cycle", "/wellness", "/journal", "/companion", "/safety", "/journey", "/bloomverse", "/settings", "/privacy"]) await scan(p);
  // Dark mode and discreet mode change colours, so check contrast there too.
  await page.evaluate(() => localStorage.setItem("bloom.prefs.v1", JSON.stringify({ theme: "dark" })));
  for (const p of ["/dashboard", "/cycle", "/wellness", "/journal", "/safety", "/journey", "/bloomverse", "/settings", "/privacy"]) await scan(p, `${p} (dark)`);
  await page.evaluate(() => localStorage.setItem("bloom.prefs.v1", JSON.stringify({ discreet: true })));
  for (const p of ["/dashboard", "/cycle", "/safety"]) await scan(p, `${p} (discreet)`);
  await page.evaluate(() => localStorage.setItem("bloom.prefs.v1", JSON.stringify({ contrast: "high" })));
  await scan("/dashboard", "/dashboard (high contrast)");
} finally {
  await browser.close();
}
let total = 0;
for (const { label, violations } of results) {
  total += violations.length;
  console.log(`${violations.length ? "✗" : "✓"} ${label}${violations.length ? ` — ${violations.length} issue(s)` : ""}`);
  for (const v of violations) {
    console.log(`   [${v.impact}] ${v.id}: ${v.help}`);
    for (const n of v.nodes.slice(0, 3)) console.log(`      ${n.target.join(" ")} ${n.failureSummary?.split("\n")[1]?.trim() ?? ""}`);
  }
}
console.log(total ? `\n${total} issue type(s) found` : "\nNo accessibility violations found.");
