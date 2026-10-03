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

  if (!webglSupported) {
    return <FallbackSection />;
  }

  return (
    <SceneErrorBoundary>
      <Experience onReady={() => setReady(true)} />
      <StageOverlay />
      <ConversionOverlay />
      <ScrollRig />
      <LoadingScreen ready={ready} />
    </SceneErrorBoundary>
  );
}
