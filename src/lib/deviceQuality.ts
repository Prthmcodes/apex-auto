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

export function getMaxDpr(lowEnd: boolean): number {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
  return Math.min(dpr || 1, lowEnd ? 1.5 : 2);
}
