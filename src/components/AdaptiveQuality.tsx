"use client";

import { useRef, useState } from "react";
import { PerformanceMonitor } from "@react-three/drei";
import { qualityState, setQualityLevel, type QualityStep } from "@/lib/qualityState";

// Below this many frames per second, held for a full second, step down.
const DECLINE_BELOW_FPS = 45;
// Ignore the first few seconds: the first frames after the scene appears
// include compiling shaders and uploading textures, and are slow on every
// machine regardless of how well it will run afterwards.
const SETTLE_MS = 3000;
// Step back up only after this long at the current level, so a brief good
// patch doesn't bounce quality up and straight back down again.
const MIN_MS_BEFORE_STEP_UP = 5000;
// After this many changes, stop adjusting and stay where we are: a machine
// hovering right on the line would otherwise flip back and forth forever.
const MAX_CHANGES = 8;

/**
 * Watches the frame rate and trades quality for smoothness when needed:
 * pixel ratio first (1.5 > 1.25 > 1), then bloom, then shadows. Never goes
 * below a pixel ratio of 1. Steps back up slowly if the frame rate
 * recovers.
 *
 * The steps themselves are applied by Experience (pixel ratio and bloom)
 * and Atmosphere (shadows), which read the shared level from
 * src/lib/qualityState.ts.
 *
 * Off when the URL has ?fixedquality, which the QA scripts use: the test
 * machine has no graphics card and runs at about one frame per second, so
 * without this every screenshot would be taken at the lowest quality.
 */
export default function AdaptiveQuality({ steps }: { steps: QualityStep[] }) {
  const [enabled] = useState(
    () => !new URLSearchParams(window.location.search).has("fixedquality")
  );
  const startedAt = useRef(0);
  const lastChangeAt = useRef(0);

  if (!enabled) return null;

  const now = () => performance.now();
  const settled = () => {
    if (!startedAt.current) startedAt.current = now();
    return now() - startedAt.current > SETTLE_MS && qualityState.changes < MAX_CHANGES;
  };

  const step = (direction: 1 | -1) => {
    const next = qualityState.level + direction;
    if (next < 0 || next >= steps.length) return;
    lastChangeAt.current = now();
    setQualityLevel(next, steps[next]);
  };

  return (
    <PerformanceMonitor
      // Four quarter-second samples; all four must agree, so it takes a
      // full second below (or above) the line before anything changes.
      ms={250}
      iterations={4}
      threshold={0.75}
      bounds={(refreshRate) => [DECLINE_BELOW_FPS, refreshRate > 90 ? 100 : 57]}
      onDecline={() => {
        if (settled()) step(1);
      }}
      onIncline={() => {
        if (settled() && now() - lastChangeAt.current > MIN_MS_BEFORE_STEP_UP) step(-1);
      }}
    />
  );
}
