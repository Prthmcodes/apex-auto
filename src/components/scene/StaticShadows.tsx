"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

// How many frames after the scene appears to keep refreshing the shadow
// map, so anything that settles in its first frames (the car model
// finishing its setup, ContactShadows' first bake) is caught.
const SETTLE_FRAMES = 3;

/**
 * Renders the shadow map once, instead of every frame.
 *
 * By default three.js redraws the shadow map on every frame, which here
 * means drawing every shadow caster a second time — including all 523,000
 * triangles of the car — just to arrive at the same picture as last time.
 * Nothing that casts a visible shadow moves: the car stays put, the light
 * is fixed, and the only moving casters (the wheels turning on the spot
 * and the tool-chest drawers, which stand in the shadow of the roof
 * anyway) don't change the shadow you can see.
 *
 * Anything that does need a fresh shadow later (the adaptive quality
 * switching shadows back on, see Atmosphere.tsx) sets
 * `gl.shadowMap.needsUpdate = true`.
 */
export default function StaticShadows() {
  const frames = useRef(0);

  useFrame(({ gl }) => {
    if (frames.current >= SETTLE_FRAMES) return;
    frames.current += 1;
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
  });

  return null;
}
