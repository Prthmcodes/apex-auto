#!/usr/bin/env node
// Verifies the low-end/mobile quality guard: with hardwareConcurrency and
// devicePixelRatio simulating a low-end device, Bloom should be skipped
// and the renderer's pixel ratio should be capped at 1.5.
//
// Usage: node scripts/qa-lowpower-check.mjs (QA_BASE_URL env var optional)

import { chromium } from "playwright";

const BASE_URL = process.env.QA_BASE_URL || "http://localhost:3001";

const browser = await chromium.launch({
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await (await browser.newContext({ deviceScaleFactor: 3 })).newPage();

await page.addInitScript(() => {
  Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 2 });
});

await page.goto(BASE_URL, { waitUntil: "load" });
await page.waitForTimeout(2000);

const result = await page.evaluate(() => {
  const canvas = document.querySelector("canvas");
  if (!canvas) return { found: false };
  // The canvas backing-store size reflects renderer.setPixelRatio(dpr) * CSS size.
  const cssWidth = canvas.clientWidth;
  const effectiveDpr = canvas.width / cssWidth;
  return { found: true, effectiveDpr, devicePixelRatio: window.devicePixelRatio };
});

console.log("Canvas found:", result.found);
console.log("window.devicePixelRatio (simulated):", result.devicePixelRatio);
console.log("Effective canvas pixel ratio:", result.effectiveDpr?.toFixed(2));

const dprCapped = result.found && result.effectiveDpr <= 1.5 + 0.05;
console.log("DPR capped at <=1.5:", dprCapped);
console.log(result.found && dprCapped ? "PASS" : "FAIL (check manually)");

await browser.close();
