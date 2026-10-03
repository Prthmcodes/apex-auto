"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { theme } from "./theme";
import { useReducedMotion } from "@/lib/useReducedMotion";

const DUST_COUNT = 260;

// Computed once at module load — not during any component's render — so
// there's no "impure call during render" concern from Math.random here.
function buildBaseDustPositions() {
  const positions = new Float32Array(DUST_COUNT * 3);
  for (let i = 0; i < DUST_COUNT; i += 1) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 7;
    positions[i3 + 1] = Math.random() * 3.3;
    positions[i3 + 2] = (Math.random() - 0.5) * 6;
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
      array[i3] = BASE_DUST_POSITIONS[i3] + Math.sin(t * 0.08 + i * 2.0) * 0.15;
      array[i3 + 1] = BASE_DUST_POSITIONS[i3 + 1] + Math.sin(t * 0.15 + i) * 0.4;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points position={[0, 0, -1.5]}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[BASE_DUST_POSITIONS.slice(), 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={theme.accent}
        size={0.035}
        sizeAttenuation
        transparent
        opacity={0.5}
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
