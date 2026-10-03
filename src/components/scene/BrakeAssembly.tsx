"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { siteContent } from "@/content/site";
import scrollState from "@/lib/scrollState";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { HologramPart } from "./HologramPart";

const WHEEL_SPIN_TURNS = 4;
const WHEELS_STAGE_RANGE = siteContent.stages[2].range;

function buildDiscGeometry() {
  const geometry = new THREE.CylinderGeometry(0.2, 0.2, 0.03, 20);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function buildCaliperGeometry() {
  return new THREE.BoxGeometry(0.07, 0.14, 0.2);
}

/**
 * Brake disc (spins with the wheel) and caliper (fixed), fading in and out
 * during the "wheels" stage. Lives only on the front wheel the camera
 * focuses on in that stage.
 */
export default function BrakeAssembly({
  wheelPosition,
}: {
  wheelPosition: [number, number, number];
}) {
  const spinRef = useRef<THREE.Group>(null!);
  const reducedMotion = useReducedMotion();
  const discGeometry = useMemo(() => buildDiscGeometry(), []);
  const caliperGeometry = useMemo(() => buildCaliperGeometry(), []);

  useFrame(() => {
    spinRef.current.rotation.z = reducedMotion.current
      ? 0
      : -scrollState.progress * WHEEL_SPIN_TURNS * Math.PI * 2;
  });

  return (
    <group position={wheelPosition}>
      <group ref={spinRef}>
        <HologramPart
          geometry={discGeometry}
          fillOpacity={0.12}
          fadeRange={WHEELS_STAGE_RANGE}
        />
      </group>
      <HologramPart
        geometry={caliperGeometry}
        position={[0, 0.22, 0.02]}
        fillOpacity={0.12}
        fadeRange={WHEELS_STAGE_RANGE}
      />
    </group>
  );
}
