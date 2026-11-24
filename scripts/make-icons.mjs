// Renders BLOOM's app icons to PNG with the system Chrome (no image libraries needed).
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const petal = (fill) =>
  [0, 72, 144, 216, 288]
    .map((d) => `<path transform="rotate(${d} 16 16)" d="M16 15.5c-3.6-1.6-5.2-5.3-3.9-8.7.6-1.6 1.9-2.6 3.1-3l.8 1.7.8-1.7c1.2.4 2.5 1.4 3.1 3 1.3 3.4-.3 7.1-3.9 8.7Z" fill="${fill}"/>`)
    .join("");
const icon = (size, { bg = "#fff0f5", maskable = false, mono = false } = {}) => {
  const pad = maskable ? 0.24 : 0.14;
  const inner = size * (1 - pad * 2);
  return `<html><body style="margin:0"><div style="width:${size}px;height:${size}px;background:${mono ? "transparent" : bg};display:grid;place-items:center;border-radius:${maskable || mono ? 0 : size * 0.22}px">
  <svg width="${inner}" height="${inner}" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb8d0"/><stop offset="1" stop-color="#ff4f91"/></linearGradient></defs>
  ${petal(mono ? "#000" : "url(#g)")}<circle cx="16" cy="16" r="2.6" fill="${mono ? "#000" : "#fff0f5"}" stroke="${mono ? "#000" : "#e83f65"}" stroke-width=".8"/></svg></div></body></html>`;
};

mkdirSync("public/icons", { recursive: true });
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const page = await browser.newPage();
for (const [name, size, opts] of [
  ["icon-192.png", 192, {}],
  ["icon-512.png", 512, {}],
  ["maskable-512.png", 512, { maskable: true }],
  ["apple-touch-icon.png", 180, { maskable: true }],
  ["badge-72.png", 72, { mono: true }],
]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(icon(size, opts));
  await page.screenshot({ path: `public/icons/${name}`, omitBackground: Boolean(opts.mono) });
}
await browser.close();
console.log("icons written");
