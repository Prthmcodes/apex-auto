"use client";

import { Suspense, lazy, useEffect, useState, useSyncExternalStore } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, SMAA } from "@react-three/postprocessing";
import { useProgress } from "@react-three/drei";
import * as THREE from "three";
import Scene from "./scene/Scene";
import { START_POSITION } from "./scene/cameraPath";
import { isLowEndDevice, getMaxDpr } from "@/lib/deviceQuality";
import {
  getQualityLevel,
  initQuality,
  qualitySteps,
  subscribeQuality,
} from "@/lib/qualityState";
import AdaptiveQuality from "./AdaptiveQuality";

// The ?perf overlay (fps, draw calls and a copyable per-stage report).
// Lazy, so a normal visit never downloads a byte of it: the import only
// runs if one of these is actually rendered, which only happens with
// ?perf in the URL.
const PerfProbe = lazy(() => import("./perf/PerfProbe"));
const PerfPanel = lazy(() => import("./perf/PerfPanel"));

/**
 * Reports real download progress (0 to 100) of everything the scene loads:
 * the car model, the HDR and the textures. Lives here, inside the 3D
 * bundle, rather than in LoadingScreen, so the loading screen itself never
 * pulls three.js into the page before the WebGL check has run.
 */
function ProgressReporter({ onProgress }: { onProgress?: (value: number) => void }) {
  const { progress } = useProgress();
  useEffect(() => {
    onProgress?.(progress);
  }, [progress, onProgress]);
  return null;
}

export default function Experience({
  onReady,
  onProgress,
}: {
  onReady?: () => void;
  onProgress?: (value: number) => void;
}) {
  // Lazy initializer only ever runs client-side: Experience is always
  // loaded via next/dynamic with ssr:false, so there's no hydration
  // mismatch risk reading navigator/window here.
  const [lowEnd] = useState(() => isLowEndDevice());
  const [maxDpr] = useState(() => getMaxDpr(lowEnd));
  const [perf] = useState(() => new URLSearchParams(window.location.search).has("perf"));
  const [steps] = useState(() => {
    const ladder = qualitySteps(maxDpr);
    initQuality(ladder[0]);
    return ladder;
  });
  // Re-renders only when the adaptive quality level changes, which happens
  // a handful of times at most — never per frame.
  const level = useSyncExternalStore(subscribeQuality, getQualityLevel, getQualityLevel);
  const quality = steps[level];

  return (
    <>
      <ProgressReporter onProgress={onProgress} />
      {perf && (
        <Suspense fallback={null}>
          <PerfPanel />
        </Suspense>
      )}
      <Canvas
        camera={{ position: START_POSITION, fov: 50, near: 0.1, far: 120 }}
        dpr={quality.pixelRatio}
        shadows={lowEnd ? false : { type: THREE.PCFShadowMap }}
        // antialias off: everything is drawn by the post-processing
        // composer below and copied to the screen as one flat image, so
        // the canvas's own multisampling smoothed nothing and only cost
        // memory and a full-screen resolve every frame.
        gl={{ toneMapping: THREE.ACESFilmicToneMapping, antialias: false }}
        style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}
      >
        {/* Nothing renders until every model/texture has loaded, so the
            scene appears complete rather than popping in piece by piece. The
            loading screen covers the wait. */}
        <Suspense fallback={null}>
          <Scene onReady={onReady} />
        </Suspense>
        {perf && (
          <Suspense fallback={null}>
            <PerfProbe />
          </Suspense>
        )}
        <AdaptiveQuality steps={steps} />
        {/* multisampling={0}: the composer's default is 8x multisampling,
            i.e. the whole scene drawn into an 8-sample, 16-bit-per-channel
            buffer every frame — at a 2x pixel ratio that is the single
            heaviest thing on the page for a laptop's graphics chip.
            Edges stay smooth anyway: at a pixel ratio of 1.5 or more the
            pixels are too small for jagged edges to show, and below that
            SMAA (a cheap edge-smoothing pass, a small fraction of the cost
            of 8x multisampling) takes over. */}
        <EffectComposer enableNormalPass={false} multisampling={0}>
          {lowEnd || !quality.bloom ? (
            <>
              <Vignette offset={0.3} darkness={0.6} />
              {quality.pixelRatio < 1.5 ? <SMAA /> : <></>}
            </>
          ) : (
            <>
              <Bloom
                luminanceThreshold={0.8}
                luminanceSmoothing={0.2}
                intensity={0.45}
                mipmapBlur
                radius={0.5}
                // Half resolution (the library default, stated so it
                // stays that way): the glow is a blur, so it loses nothing.
                resolutionScale={0.5}
              />
              <Vignette offset={0.3} darkness={0.6} />
              {quality.pixelRatio < 1.5 ? <SMAA /> : <></>}
            </>
          )}
        </EffectComposer>
      </Canvas>
    </>
  );
}
