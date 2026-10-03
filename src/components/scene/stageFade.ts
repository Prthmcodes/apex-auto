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

/** How long one caption takes to fade, in scroll progress. */
const DEFAULT_HANDOVER = 0.035;

/**
 * Like bandOpacity, but for a set of ranges that run back to back — the
 * stage captions, whose ranges share their edges (…0.3], [0.3…).
 *
 * bandOpacity fades each range in starting *before* its own start and out
 * until *after* its own end, which for touching ranges means the incoming
 * caption starts appearing while the outgoing one is still at full
 * strength: two captions stacked on top of each other at every boundary.
 *
 * This keeps the whole fade inside the range instead, so one caption is
 * all the way out before the next starts coming in. The two meet at
 * exactly 0 on the boundary, so the handover reads as one caption
 * replacing another rather than a gap.
 *
 * The page's first and last captions don't fade at their outer edges —
 * the opening caption should already be readable when the page loads, and
 * the closing one shouldn't dim as you reach the bottom.
 */
export function sequentialOpacity(
  progress: number,
  range: readonly [number, number],
  reducedMotion: boolean,
  handover = DEFAULT_HANDOVER
) {
  if (reducedMotion) return hardBand(progress, range);

  const [start, end] = range;
  if (progress < start || progress > end) return 0;

  const fadeInUntil = start <= 0 ? start : start + handover;
  const fadeOutFrom = end >= 1 ? end : end - handover;

  if (progress < fadeInUntil) return (progress - start) / handover;
  if (progress > fadeOutFrom) return (end - progress) / handover;
  return 1;
}
