#!/usr/bin/env node
// Headless render-cost measurement, per stage.
//
// Usage:
//   QA_BASE_URL=http://localhost:3000 node scripts/qa-perf.mjs
//   QA_LABEL=before  — names the JSON file written to qa-screenshots/
//
// What this CAN measure on a machine without a GPU: how much work each
// frame asks for — draw calls, triangles (including shadow-map passes),
// how many times the car is drawn, transparent draws, lights, and the
// JavaScript time per frame. What it CANNOT measure is real frame rate:
// here the browser rasterises on the CPU (SwiftShader), which is tens of
// times slower than any real graphics card. For real fps, open the site
// with ?perf on real hardware and use the overlay's "Copy report".
//
// Loads the page with ?perf (the probe that collects these numbers only
// exists then) and ?fixedquality (so adaptive quality can't step down on
// this slow machine and change what is being measured).

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { siteContent } from "../src/content/site.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "qa-screenshots");
const BASE_URL = process.env.QA_BASE_URL || "http://localhost:3001";
const LABEL = process.env.QA_LABEL || "latest";
const WARMUP_FRAMES = 3;
const SAMPLE_FRAMES = 5;

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const STAGES = siteContent.stages.map((stage, i) => ({
  name: `${i + 1} ${stage.title}`,
  progress: i / (siteContent.stages.length - 1),
}));

const METRICS = [
  ["drawCalls", "calls"],
  ["triangles", "triangles"],
  ["shadowDraws", "shadow draws"],
  ["shadowTriangles", "shadow tris"],
  ["carDraws", "car draws"],
  ["carTriangles", "car tris"],
  ["carShadowDraws", "car shadow draws"],
  ["transparentDraws", "transparent"],
  ["punctual", "lights"],
  ["shadowLights", "shadow lights"],
  ["jsMs", "JS ms"],
];

async function waitFrames(page, count) {
  const start = await page.evaluate(() => window.__apexPerf?.snapshot().frame ?? 0);
  await page.waitForFunction(
    (target) => (window.__apexPerf?.snapshot().frame ?? 0) >= target,
    start + count,
    { timeout: 180000, polling: 50 }
  );
}

async function measure(page) {
  const results = [];
  for (const stage of STAGES) {
    await page.evaluate((p) => window.__qaSetScrollProgress?.(p), stage.progress);
    await waitFrames(page, WARMUP_FRAMES);
    const samples = [];
    for (let i = 0; i < SAMPLE_FRAMES; i += 1) {
      await waitFrames(page, 1);
      samples.push(await page.evaluate(() => window.__apexPerf.snapshot()));
    }
    const average = {};
    for (const [key] of METRICS) {
      average[key] = samples.reduce((sum, s) => sum + (s[key] ?? 0), 0) / samples.length;
    }
    results.push({ stage: stage.name, ...average });
  }
  return results;
}

function table(rows) {
  const header = ["stage".padEnd(22), ...METRICS.map(([, h]) => h.padStart(Math.max(h.length, 9)))];
  const lines = rows.map((row) => [
    row.stage.padEnd(22),
    ...METRICS.map(([key, h]) => {
      const value = row[key];
      const text = key === "jsMs" ? value.toFixed(1) : Math.round(value).toLocaleString("en-GB");
      return text.padStart(Math.max(h.length, 9));
    }),
  ]);
  return [header, ...lines].map((cells) => cells.join(" ")).join("\n");
}

const browser = await chromium.launch({
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
await mkdir(OUT_DIR, { recursive: true });
const report = { label: LABEL, url: BASE_URL, viewports: {} };

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(180000);
  await page.goto(`${BASE_URL}/?perf&fixedquality`, { waitUntil: "load" });
  await page.waitForFunction(
    () => document.querySelector('[data-scene-ready="true"]') && window.__apexPerf,
    null,
    { timeout: 120000 }
  );
  await waitFrames(page, 5);
  await page.evaluate(() => window.__apexPerf.refindCar());

  const rows = await measure(page);

  // Where the triangles go, in the engine shot: one frame's draws grouped by
  // the nearest named object.
  await page.evaluate((p) => window.__qaSetScrollProgress?.(p), STAGES[3].progress);
  await waitFrames(page, 2);
  await page.evaluate(() => { window.__apexPerf.breakdown.triangles = {}; window.__apexPerf.breakdown.on = true; });
  await waitFrames(page, 2);
  const breakdown = await page.evaluate(() => {
    const b = window.__apexPerf.breakdown;
    b.on = false;
    return Object.entries(b.triangles).sort((a, c) => c[1] - a[1]).slice(0, 12);
  });

  // Raycasting: sweep the mouse across the engine shot, where the car fills
  // the screen, and count how many mesh raycasts that triggered — and how
  // many of them hit the car's own (half-million-triangle) meshes.
  await page.evaluate((p) => window.__qaSetScrollProgress?.(p), STAGES[3].progress);
  await waitFrames(page, 2);
  const before = await page.evaluate(() => ({ ...window.__apexPerf.raycasts }));
  for (let i = 0; i <= 10; i += 1) {
    await page.mouse.move((viewport.width * i) / 10, viewport.height * (0.3 + 0.04 * i));
  }
  await waitFrames(page, 2);
  const after = await page.evaluate(() => ({ ...window.__apexPerf.raycasts }));
  const raycasts = {
    meshRaycasts: after.calls - before.calls,
    carMeshRaycasts: after.carCalls - before.carCalls,
  };

  const memory = await page.evaluate(() => {
    const s = window.__apexPerf.snapshot();
    return {
      geometries: s.geometries,
      textures: s.textures,
      programs: s.programs,
      shadowAutoUpdate: s.shadowAutoUpdate,
      pixelRatio: s.pixelRatio,
    };
  });

  report.viewports[viewport.name] = { rows, raycasts, memory, breakdown };
  console.log(`\n=== ${LABEL} — ${viewport.name} ${viewport.width}x${viewport.height} ===`);
  console.log(table(rows));
  console.log(
    `11 mouse moves over the engine shot: ${raycasts.meshRaycasts} mesh raycasts, ${raycasts.carMeshRaycasts} on the car`
  );
  console.log(
    `GPU memory: ${memory.geometries} geometries, ${memory.textures} textures, ${memory.programs} shader programs; shadow map re-rendered every frame: ${memory.shadowAutoUpdate}; pixel ratio ${memory.pixelRatio}`
  );
  console.log("Biggest triangle sources in the engine shot (2 frames, main passes only):");
  for (const [name, tris] of breakdown) console.log(`  ${Math.round(tris / 2).toLocaleString("en-GB").padStart(10)}  ${name}`);
  await context.close();
}

await browser.close();
const file = path.join(OUT_DIR, `perf-${LABEL}.json`);
await writeFile(file, JSON.stringify(report, null, 2));
console.log(`\nSaved ${file}`);
