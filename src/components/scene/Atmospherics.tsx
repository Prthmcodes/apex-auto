"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { theme } from "./theme";
import { layout } from "./layout";
import { useReducedMotion } from "@/lib/useReducedMotion";

const [carX, , carZ] = layout.car.position;

// A handful of dust motes, not a snowstorm. There used to be 260 of them,
// in the theme's orange, scattered across the full width of the forecourt;
// they read as floating confetti rather than air. These are few, nearly
// white, and penned into the beam of the ceiling strip lights above the
// car, which is the only place dust is actually visible in a dim workshop.
const DUST_COUNT = 30;

// The lit volume under the two ceiling strips (see WorkshopLights.tsx):
// roughly the width of the car, the depth of the strips, and from just
// above the floor up to the fittings.
const BEAM_WIDTH = 2.2;
const BEAM_DEPTH = 3.2;
const BEAM_BASE_Y = 0.6;
const BEAM_TOP_Y = 3.5;

// Computed once at module load — not during any component's render — so
// there's no "impure call during render" concern from Math.random here.
function buildBaseDustPositions() {
  const positions = new Float32Array(DUST_COUNT * 3);
  for (let i = 0; i < DUST_COUNT; i += 1) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * BEAM_WIDTH;
    positions[i3 + 1] = BEAM_BASE_Y + Math.random() * (BEAM_TOP_Y - BEAM_BASE_Y);
    positions[i3 + 2] = (Math.random() - 0.5) * BEAM_DEPTH;
  }
  return positions;
}
const BASE_DUST_POSITIONS = buildBaseDustPositions();

function DustParticles() {
  // The ref is populated by React's own ref-assignment on the
  // <bufferGeometry> element below, and only ever read inside useFrame
  // (post-render) — never during render itself.
  const geometryRef = useRef<THREE.BufferGeometry>(null!);
  const reducedMotion = useReducedMotion();

  useFrame(({ clock }) => {
    if (reducedMotion.current) return;

    const posAttr = geometryRef.current.attributes.position as THREE.BufferAttribute;
    const array = posAttr.array as Float32Array;
    const t = clock.elapsedTime;
    for (let i = 0; i < DUST_COUNT; i += 1) {
      const i3 = i * 3;
      array[i3] = BASE_DUST_POSITIONS[i3] + Math.sin(t * 0.08 + i * 2.0) * 0.1;
      array[i3 + 1] = BASE_DUST_POSITIONS[i3 + 1] + Math.sin(t * 0.15 + i) * 0.22;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points position={[carX, 0, carZ]}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[BASE_DUST_POSITIONS.slice(), 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={theme.workshopLight}
        size={0.018}
        sizeAttenuation
        transparent
        opacity={0.28}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

export default function Atmospherics() {
  return (
    <DustParticles />
  );
}
