"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import ScrollRig from "./ScrollRig";
import StageOverlay from "./StageOverlay";
import ConversionOverlay from "./ConversionOverlay";
import LoadingScreen from "./LoadingScreen";
import SceneErrorBoundary from "./SceneErrorBoundary";
import FallbackSection from "./FallbackSection";
import { hasWebGL } from "@/lib/hasWebGL";
import { applyThemeOverride } from "./scene/theme";

// Dev-only live theme preview: ?theme=amber-red / ?theme=ice-blue / ?theme=teal.
// Runs at module scope — once, when this module first loads — not inside
// the component's render, so it happens before Experience/CarModel/etc.
// ever mount and read `theme`'s values, and never trips the project's
// react-hooks/purity rule (no side effects allowed during render). Safe to
// mutate the shared `theme` object here specifically because this module
// only ever loads in the browser (see the dynamic(ssr:false) note below) —
// it never runs on the shared Node.js server process.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  applyThemeOverride(new URLSearchParams(window.location.search).get("theme"));
}

// Experience (and everything it imports — three, @react-three/fiber, drei,
// postprocessing) must stay behind its OWN dynamic import, separate from
// this file. next/dynamic only calls import() when the wrapped component
// is actually rendered — so as long as <Experience> only appears in JSX
// once webglSupported is true, the three.js bundle is never fetched for
// the fallback path. If Experience were imported statically here instead,
// the bundler would pack it into *this* chunk, and it would download as
// soon as SceneGate's own chunk loads — before the check below ever runs.
const Experience = dynamic(() => import("./Experience"), { ssr: false });

/**
 * Everything the 3D home page needs, gated on WebGL actually being
 * available. This whole component is loaded via next/dynamic with
 * ssr:false (see HomeClient.tsx), so this is always its first real
 * render — there's no server-rendered output to match, which is what
 * makes the lazy useState below safe.
 */
export default function SceneGate() {
  const [webglSupported] = useState(() => hasWebGL());
  const [ready, setReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  if (!webglSupported) {
    return <FallbackSection />;
  }

  return (
    <SceneErrorBoundary>
      <Experience onReady={() => setReady(true)} onProgress={setLoadProgress} />
      <StageOverlay />
      <ConversionOverlay />
      <ScrollRig />
      <LoadingScreen ready={ready} progress={loadProgress} />
    </SceneErrorBoundary>
  );
}
