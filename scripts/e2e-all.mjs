// Runs every end-to-end flow in turn against BASE (default http://localhost:3000) and reports.
import { spawnSync } from "node:child_process";

const flows = ["e2e-smoke", "e2e-mochi", "e2e-shield", "e2e-wellness", "e2e-journey", "e2e-bloomverse", "e2e-home"];
let failed = 0;
for (const flow of flows) {
  const started = Date.now();
  const run = spawnSync(process.execPath, [new URL(`./${flow}.mjs`, import.meta.url).pathname], { encoding: "utf8", timeout: 300_000 });
  const out = `${run.stdout}${run.stderr}`;
  const ok = run.status === 0 && !/ERRORS:|page errors: \[/.test(out);
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${flow} (${Math.round((Date.now() - started) / 1000)}s)`);
  if (!ok) console.log(out.split("\n").slice(-25).join("\n"));
}
console.log(failed ? `\n${failed} flow(s) failed` : "\nAll flows passed. Screenshots are in /tmp/shots.");
process.exit(failed ? 1 : 0);
