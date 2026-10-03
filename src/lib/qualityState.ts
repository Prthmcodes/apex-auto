// The current adaptive-quality level, shared between the 3D scene, the
// post-processing setup and the ?perf overlay.
//
// Level 0 is full quality. Each step down gives up one thing, in the order
// a visitor is least likely to notice: first sharpness (pixel ratio), then
// the soft glow around bright lights (bloom), and last the shadows. The
// step-down decisions themselves live in src/components/AdaptiveQuality.tsx.
//
// A plain store rather than React state, so components only re-render when
// the level actually changes (a handful of times at most), never per frame.

export type QualityStep = {
  pixelRatio: number;
  bloom: boolean;
  shadows: boolean;
  label: string;
};

/** The ladder for a device whose sharpest allowed pixel ratio is `maxDpr`. */
export function qualitySteps(maxDpr: number): QualityStep[] {
  const ratios = [maxDpr, 1.5, 1.25, 1].filter(
    (ratio, i, all) => ratio <= maxDpr && all.indexOf(ratio) === i
  );
  if (!ratios.length) ratios.push(maxDpr);
  const lowest = ratios[ratios.length - 1];
  return [
    ...ratios.map((pixelRatio, i) => ({
      pixelRatio,
      bloom: true,
      shadows: true,
      label: i === 0 ? `full (pixel ratio ${pixelRatio})` : `pixel ratio ${pixelRatio}`,
    })),
    { pixelRatio: lowest, bloom: false, shadows: true, label: `pixel ratio ${lowest}, no bloom` },
    {
      pixelRatio: lowest,
      bloom: false,
      shadows: false,
      label: `pixel ratio ${lowest}, no bloom, no shadows`,
    },
  ];
}

export const qualityState = {
  level: 0,
  label: "full",
  /** Times the level has changed this visit (shown in the ?perf report). */
  changes: 0,
  /** Whether shadows are on at the current level. */
  shadows: true,
};

const listeners = new Set<() => void>();

export function subscribeQuality(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getQualityLevel() {
  return qualityState.level;
}

export function getQualityShadows() {
  return qualityState.shadows;
}

export function setQualityLevel(level: number, step: QualityStep) {
  if (level === qualityState.level) return;
  qualityState.level = level;
  qualityState.label = step.label;
  qualityState.shadows = step.shadows;
  qualityState.changes += 1;
  listeners.forEach((listener) => listener());
}

/** Called once with the starting step, so labels are right from the start. */
export function initQuality(step: QualityStep) {
  qualityState.label = step.label;
  qualityState.shadows = step.shadows;
}
