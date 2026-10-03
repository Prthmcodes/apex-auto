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

// A straight (non-volumetric) cone standing in for light spilling out of
// the doorway onto the forecourt. No real light or shadow map — just a
// cheap, faint, additively-blended mesh.
const CONE_APEX = new THREE.Vector3(0, 3.0, -1.7);
const CONE_TARGET = new THREE.Vector3(0, 0, 4.5);
const CONE_HEIGHT = CONE_APEX.distanceTo(CONE_TARGET);
const CONE_MID = CONE_APEX.clone().lerp(CONE_TARGET, 0.5);
const CONE_QUATERNION = new THREE.Quaternion().setFromUnitVectors(
  new THREE.Vector3(0, -1, 0),
  CONE_TARGET.clone().sub(CONE_APEX).normalize()
);

function LightCone() {
  return (
    <mesh position={CONE_MID} quaternion={CONE_QUATERNION}>
      <coneGeometry args={[2.4, CONE_HEIGHT, 24, 1, true]} />
      <meshBasicMaterial
        color={theme.accent}
        transparent
        opacity={0.05}
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

export default function Atmospherics() {
  return (
    <>
      <DustParticles />
      <LightCone />
    </>
  );
}
