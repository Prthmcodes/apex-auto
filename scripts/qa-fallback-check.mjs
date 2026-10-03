#!/usr/bin/env node
// Verifies that with WebGL forced unavailable, the home page shows the
// static fallback and never fetches the three.js/r3f/drei bundle.
//
// Usage: node scripts/qa-fallback-check.mjs (QA_BASE_URL env var optional)

import { chromium } from "playwright";

const BASE_URL = process.env.QA_BASE_URL || "http://localhost:3001";

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();

// Simulate no WebGL support.
await page.addInitScript(() => {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    if (typeof type === "string" && type.toLowerCase().includes("webgl")) return null;
    return original.call(this, type, ...rest);
  };
});

const requestedUrls = [];
page.on("request", (req) => requestedUrls.push(req.url()));

await page.goto(BASE_URL, { waitUntil: "load" });
await page.waitForTimeout(1500);

const bodyText = await page.evaluate(() => document.body.innerText);
const threeRequested = requestedUrls.some((u) =>
  /node_modules_three|react-three_fiber|react-three_drei|postprocessing/i.test(u)
);
const fallbackVisible = /east london/i.test(bodyText) && /call/i.test(bodyText);

console.log("Fallback content visible:", fallbackVisible);
console.log("three.js bundle fetched:", threeRequested);

await browser.close();

if (fallbackVisible && !threeRequested) {
  console.log("PASS");
} else {
  console.log("FAIL");
  process.exit(1);
}
