const scrollState = { progress: 0 };

// QA-only hook: lets the Playwright screenshot script (scripts/qa-screenshots.mjs)
// set an exact scroll progress directly, instead of fighting Lenis's smoothing
// to land on a precise percentage. Harmless in production — nothing else calls it.
if (typeof window !== "undefined") {
  (window as unknown as { __qaSetScrollProgress?: (p: number) => void }).__qaSetScrollProgress = (
    p: number
  ) => {
    scrollState.progress = Math.min(Math.max(p, 0), 1);
  };
}

export default scrollState;
