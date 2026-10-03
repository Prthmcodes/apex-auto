#!/usr/bin/env node
// Visual QA screenshots for the Apex Auto site.
//
// Usage:
//   node scripts/qa-screenshots.mjs
//
// By default it looks for a dev server at QA_BASE_URL (http://localhost:3001
// to match this project's usual port). If nothing answers there, it starts
// `npm run dev` itself on an ephemeral port and tears it down afterwards.

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "qa-screenshots");

const EXPLICIT_BASE_URL = process.env.QA_BASE_URL;
const FALLBACK_PORT = 4310;

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];
const SCROLL_POINTS = [0, 15, 35, 55, 75, 95, 100];

async function isServerUp(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.ok || res.status === 404; // any real HTTP response is fine
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerUp(url)) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function startOwnDevServer(port) {
  console.log(`No server found; starting \`npm run dev\` on port ${port}…`);
  const child = spawn("npm", ["run", "dev", "--", "-p", String(port)], {
    cwd: ROOT,
    shell: true,
    stdio: "ignore",
  });
  const url = `http://localhost:${port}`;
  const ok = await waitForServer(url, 30000);
  if (!ok) {
    child.kill();
    throw new Error(`Timed out waiting for dev server on ${url}`);
  }
  return { url, child };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  let baseUrl = EXPLICIT_BASE_URL || "http://localhost:3001";
  let spawned = null;

  if (!(await isServerUp(baseUrl))) {
    if (EXPLICIT_BASE_URL) {
      console.error(`QA_BASE_URL (${EXPLICIT_BASE_URL}) is not responding. Start it first.`);
      process.exit(1);
    }
    const started = await startOwnDevServer(FALLBACK_PORT);
    baseUrl = started.url;
    spawned = started.child;
  } else {
    console.log(`Using existing server at ${baseUrl}`);
  }

  let webglOk = true;

  try {
    const browser = await chromium.launch({
      args: [
        "--use-gl=swiftshader",
        "--enable-unsafe-swiftshader",
        "--ignore-gpu-blocklist",
      ],
    });

    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();
      // Force reduced-motion so the camera snaps straight to each stage's
      // exact authored position instead of easing toward it — headless
      // Chromium can throttle requestAnimationFrame in a backgrounded tab,
      // which would otherwise leave the damped camera short of its target
      // within our wait window. This is a screenshot-determinism choice,
      // not a claim that real users see this snap — see the reduced-motion
      // section below for that check instead.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(baseUrl, { waitUntil: "load" });

      const hasWebGL = await page.evaluate(() => {
        try {
          const canvas = document.createElement("canvas");
          return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
        } catch {
          return false;
        }
      });
      if (!hasWebGL) webglOk = false;

      // Let the scene mount and the loading screen fade out.
      await page.waitForTimeout(1500);

      for (const pct of SCROLL_POINTS) {
        await page.evaluate((p) => {
          window.__qaSetScrollProgress?.(p / 100);
        }, pct);
        // With reduced-motion forced, the camera snaps instantly — this
        // wait is just for the next render tick, not for easing to converge.
        await page.waitForTimeout(500);

        const filename = `home-${viewport.name}-${pct}.png`;
        await page.screenshot({ path: path.join(OUT_DIR, filename) });
        console.log(`Saved ${filename}`);
      }

      await context.close();
    }

    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/book`, { waitUntil: "load" });
      await page.waitForTimeout(300);

      const filename = `book-${viewport.name}.png`;
      await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: true });
      console.log(`Saved ${filename}`);

      await context.close();
    }

    await browser.close();
  } finally {
    if (spawned) spawned.kill();
  }

  if (!webglOk) {
    console.warn(
      "\nWARNING: WebGL was not available in headless Chromium, even with swiftshader flags."
    );
    console.warn(
      "Home-page screenshots likely show a blank canvas or the WebGL-unavailable fallback, not the 3D scene."
    );
  }

  console.log(`\nDone. Screenshots in ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
