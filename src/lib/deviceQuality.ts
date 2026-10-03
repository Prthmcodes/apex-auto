// A simple, cheap heuristic for low-end / mobile devices: few CPU cores,
// or a very high device pixel ratio (common on phones), suggest the GPU
// has less headroom than the screen resolution implies. No feature
// detection beyond two numbers already on `navigator`/`window`.
export function isLowEndDevice(): boolean {
  if (typeof window === "undefined") return false;
  const cores = navigator.hardwareConcurrency ?? 8;
  const dpr = window.devicePixelRatio || 1;
  return cores <= 4 || dpr >= 3;
}

/** True on phones and tablets (a touch screen is the main pointer). */
function isTouchDevice(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/**
 * The highest pixel ratio the 3D canvas renders at. Phones/tablets and
 * low-end devices are capped at 1.5: their screens are dense enough that
 * the difference is hard to see, and it roughly halves the pixels the GPU
 * has to draw compared with 2 (or more, on 3x phones).
 */
export function getMaxDpr(lowEnd: boolean): number {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
  return Math.min(dpr || 1, lowEnd || isTouchDevice() ? 1.5 : 2);
}
