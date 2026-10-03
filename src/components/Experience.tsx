"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useProgress } from "@react-three/drei";
import * as THREE from "three";
import Scene from "./scene/Scene";
import { START_POSITION } from "./scene/cameraPath";
import { isLowEndDevice, getMaxDpr } from "@/lib/deviceQuality";

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

  return (
    <>
      <ProgressReporter onProgress={onProgress} />
      <Canvas
        camera={{ position: START_POSITION, fov: 50, near: 0.1, far: 120 }}
        dpr={maxDpr}
        shadows={lowEnd ? false : { type: THREE.PCFShadowMap }}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping }}
        style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}
      >
        {/* Nothing renders until every model/texture has loaded, so the
            scene appears complete rather than popping in piece by piece. The
            loading screen covers the wait. */}
        <Suspense fallback={null}>
          <Scene onReady={onReady} />
        </Suspense>
        <EffectComposer enableNormalPass={false}>
          {lowEnd ? (
            <Vignette offset={0.3} darkness={0.6} />
          ) : (
            <>
              <Bloom
                luminanceThreshold={0.8}
                luminanceSmoothing={0.2}
                intensity={0.45}
                mipmapBlur
                radius={0.5}
              />
              <Vignette offset={0.3} darkness={0.6} />
            </>
          )}
        </EffectComposer>
      </Canvas>
    </>
  );
}
