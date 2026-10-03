const scrollState = {
  progress: 0,
  /**
   * Set by the QA hook below, cleared by CameraRig once it has acted on it.
   *
   * The camera eases towards the scroll position rather than following it
   * exactly, so jumping the progress to 30% does not put the camera where
   * 30% of the scroll actually looks — it starts drifting there over the
   * next second, and a screenshot taken in between is of nowhere in
   * particular. This tells the rig to land on the new progress at once.
   */
  teleport: false,
};

// QA-only hook: lets the Playwright screenshot script (scripts/qa-screenshots.mjs)
// set an exact scroll progress directly, instead of fighting Lenis's smoothing
// to land on a precise percentage. Harmless in production — nothing else calls it.
if (typeof window !== "undefined") {
  (window as unknown as { __qaSetScrollProgress?: (p: number) => void }).__qaSetScrollProgress = (
    p: number
  ) => {
    scrollState.progress = Math.min(Math.max(p, 0), 1);
    scrollState.teleport = true;
  };
}

export default scrollState;
