"use client";

import { theme } from "./theme";

export default function Atmosphere() {
  return (
    <>
      <color attach="background" args={[theme.background]} />
      <fog attach="fog" args={[theme.fog.color, theme.fog.near, theme.fog.far]} />
      <hemisphereLight args={["#2b3a55", "#05060a", 0.5]} />
      <directionalLight position={[-14, 10, 12]} intensity={0.35} color="#9db4d8" />
    </>
  );
}
