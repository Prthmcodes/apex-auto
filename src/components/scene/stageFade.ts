const DEFAULT_FADE = 0.04;

/** 0 outside the range, ramping up/down over `fade` at each edge, 1 inside. */
export function bandOpacity(
  progress: number,
  range: readonly [number, number],
  fade = DEFAULT_FADE
) {
  const [start, end] = range;
  if (progress < start - fade || progress > end + fade) return 0;
  if (progress < start) return (progress - (start - fade)) / fade;
  if (progress > end) return 1 - (progress - end) / fade;
  return 1;
}

/** Step function: 1 inside the range, 0 outside. No fade. */
export function hardBand(progress: number, range: readonly [number, number]) {
  const [start, end] = range;
  return progress >= start && progress <= end ? 1 : 0;
}

/** bandOpacity, but hard-stepping instead of fading when reduced motion is on. */
export function fadeOpacity(
  progress: number,
  range: readonly [number, number],
  reducedMotion: boolean,
  fade = DEFAULT_FADE
) {
  return reducedMotion ? hardBand(progress, range) : bandOpacity(progress, range, fade);
}
