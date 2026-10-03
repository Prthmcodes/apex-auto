// Frame statistics for the ?perf overlay.
//
// Only ever loaded when the page URL has ?perf (see Experience.tsx), so
// none of this costs a normal visitor anything. PerfProbe (inside the 3D
// canvas) records one sample per frame; PerfPanel (plain HTML) reads it a
// few times a second and builds the "Copy report" text.

import { siteContent } from "@/content/site";

const STAGES = siteContent.stages;

/** Same rule the camera uses to decide which stage you're in. */
export function stageIndexFor(progress: number) {
  for (let i = 0; i < STAGES.length; i += 1) {
    if (progress <= STAGES[i].range[1] || i === STAGES.length - 1) return i;
  }
  return STAGES.length - 1;
}

export type FrameSample = {
  /** Time since the previous frame started, in ms (i.e. one frame's length). */
  intervalMs: number;
  /** JavaScript time spent inside the 3D frame (updates + render calls). */
  jsMs: number;
  drawCalls: number;
  triangles: number;
  stage: number;
  pixelRatio: number;
  quality: number;
};

// Gaps longer than this aren't frames, they're the tab being hidden or the
// browser stalling for something else entirely; counting them would wreck
// every average without saying anything about the scene.
const MAX_INTERVAL_MS = 1000;
const RECENT_FRAMES = 300;
const MAX_STORED_PER_STAGE = 20000;

type StageStats = {
  frames: number;
  totalMs: number;
  worstMs: number;
  intervals: number[];
  drawCalls: number;
  triangles: number;
  jsMs: number;
  minQuality: number;
  maxQuality: number;
  minDpr: number;
  maxDpr: number;
};

function emptyStage(): StageStats {
  return {
    frames: 0,
    totalMs: 0,
    worstMs: 0,
    intervals: [],
    drawCalls: 0,
    triangles: 0,
    jsMs: 0,
    minQuality: Infinity,
    maxQuality: -Infinity,
    minDpr: Infinity,
    maxDpr: -Infinity,
  };
}

/** The value below which `fraction` of the sorted list falls. */
function percentile(sorted: number[], fraction: number) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * fraction));
  return sorted[index];
}

export const perfStats = {
  /** The latest frame, plus anything the probe wants the panel to show. */
  latest: null as (FrameSample & { lights: number; shadowLights: number }) | null,
  recent: [] as number[],
  stages: STAGES.map(emptyStage),
  /** The GPU, if the browser is willing to say. Filled in by the probe. */
  gpu: "unknown",

  record(sample: FrameSample) {
    if (sample.intervalMs <= 0 || sample.intervalMs > MAX_INTERVAL_MS) return;

    this.recent.push(sample.intervalMs);
    if (this.recent.length > RECENT_FRAMES) this.recent.shift();

    const s = this.stages[sample.stage];
    s.frames += 1;
    s.totalMs += sample.intervalMs;
    s.worstMs = Math.max(s.worstMs, sample.intervalMs);
    if (s.intervals.length < MAX_STORED_PER_STAGE) s.intervals.push(sample.intervalMs);
    s.drawCalls += sample.drawCalls;
    s.triangles += sample.triangles;
    s.jsMs += sample.jsMs;
    s.minQuality = Math.min(s.minQuality, sample.quality);
    s.maxQuality = Math.max(s.maxQuality, sample.quality);
    s.minDpr = Math.min(s.minDpr, sample.pixelRatio);
    s.maxDpr = Math.max(s.maxDpr, sample.pixelRatio);
  },

  reset() {
    this.recent = [];
    this.stages = STAGES.map(emptyStage);
  },

  /** Live numbers for the corner panel. */
  summary() {
    const recent = this.recent;
    const last = recent[recent.length - 1] ?? 0;
    const total = recent.reduce((a, b) => a + b, 0);
    const sorted = [...recent].sort((a, b) => a - b);
    return {
      fps: last ? 1000 / last : 0,
      avgFps: total ? (recent.length * 1000) / total : 0,
      worst1PercentMs: percentile(sorted, 0.99),
    };
  },

  /** The plain-text table behind the "Copy report" button. */
  report(context: { screen: string; quality: string; qualityChanges: number }) {
    const rows = this.stages.map((s, i) => {
      const name = `${i + 1} ${STAGES[i].title}`.padEnd(22);
      if (!s.frames) return `${name}  (no frames recorded — scroll through this stage)`;
      const sorted = [...s.intervals].sort((a, b) => a - b);
      const cells = [
        String(s.frames).padStart(6),
        ((s.frames * 1000) / s.totalMs).toFixed(1).padStart(7),
        s.worstMs.toFixed(1).padStart(8),
        percentile(sorted, 0.99).toFixed(1).padStart(9),
        Math.round(s.drawCalls / s.frames).toString().padStart(10),
        Math.round(s.triangles / s.frames).toLocaleString("en-GB").padStart(11),
        (s.jsMs / s.frames).toFixed(2).padStart(6),
        (s.minDpr === s.maxDpr ? s.minDpr.toFixed(2) : `${s.minDpr}-${s.maxDpr}`).padStart(9),
        (s.minQuality === s.maxQuality ? String(s.minQuality) : `${s.minQuality}-${s.maxQuality}`).padStart(7),
      ];
      return `${name}  ${cells.join("  ")}`;
    });

    return [
      "Apex Auto ?perf report",
      `Browser: ${navigator.userAgent}`,
      `GPU: ${this.gpu}`,
      `Screen: ${context.screen}`,
      `Adaptive quality now: ${context.quality} (changed ${context.qualityChanges} time(s) this visit)`,
      "",
      `${"Stage".padEnd(22)}  ${["Frames", "Avg fps", "Worst ms", "1% low ms", "Draw calls", "Triangles", "JS ms", "Pixel rt", "Quality"]
        .map((h, i) => h.padStart([6, 7, 8, 9, 10, 11, 6, 9, 7][i]))
        .join("  ")}`,
      ...rows,
      "",
      "Avg fps = frames / time spent in that stage. Worst ms = the single slowest frame;",
      "1% low ms = 99% of frames were faster than this. Quality 0 = full; higher = the",
      "adaptive quality has stepped down (see PROGRESS.md).",
    ].join("\n");
  },
};
