"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import Scene from "./scene/Scene";
import { START_POSITION } from "./scene/cameraPath";
import { isLowEndDevice, getMaxDpr } from "@/lib/deviceQuality";

export default function Experience({ onReady }: { onReady?: () => void }) {
  // Lazy initializer only ever runs client-side: Experience is always
  // loaded via next/dynamic with ssr:false, so there's no hydration
  // mismatch risk reading navigator/window here.
  const [lowEnd] = useState(() => isLowEndDevice());
  const [maxDpr] = useState(() => getMaxDpr(lowEnd));

  return (
    <Canvas
      camera={{ position: START_POSITION, fov: 50, near: 0.1, far: 120 }}
      dpr={maxDpr}
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}
    >
      <Scene onReady={onReady} />
      <EffectComposer enableNormalPass={false}>
        {lowEnd ? (
          <Vignette offset={0.3} darkness={0.6} />
        ) : (
          <>
            <Bloom
              luminanceThreshold={0.4}
              luminanceSmoothing={0.3}
              intensity={0.6}
              mipmapBlur
              radius={0.6}
            />
            <Vignette offset={0.3} darkness={0.6} />
          </>
        )}
      </EffectComposer>
    </Canvas>
  );
}
