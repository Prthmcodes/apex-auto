"use client";

import { theme } from "./theme";

export default function Atmosphere() {
  return (
    <>
      <color attach="background" args={[theme.background]} />
      <fog attach="fog" args={[theme.fog.color, theme.fog.near, theme.fog.far]} />
      <hemisphereLight args={[theme.ambientSky, theme.ambientGround, 0.5]} />
      {/* The one soft key light, low and warm-cool for dusk — casts the
          scene's only real-time shadows (skipped renderer-wide on
          low-end devices via Canvas's `shadows` prop in Experience.tsx). */}
      <directionalLight
        position={[-14, 10, 12]}
        intensity={0.45}
        color={theme.ambientSun}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0015}
      />
    </>
  );
}
