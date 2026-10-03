"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { layout } from "./layout";
import { siteContent } from "@/content/site";
import scrollState from "@/lib/scrollState";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { HologramPart } from "./HologramPart";
import BrakeAssembly from "./BrakeAssembly";
import EngineBlock from "./EngineBlock";
import Diagnostics from "./Diagnostics";

const ENGINE_STAGE_RANGE = siteContent.stages[3].range;

// How many full turns the wheels make over the entire page scroll. Tied to
// scroll progress, not elapsed time, so it never spins on its own.
const WHEEL_SPIN_TURNS = 4;

function buildBodyGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-2.1, 0.25);
  shape.lineTo(-2.22, 0.5);
  shape.lineTo(-1.9, 0.68);
  shape.lineTo(-0.85, 0.8);
  shape.lineTo(0.85, 0.8);
  shape.lineTo(1.9, 0.62);
  shape.lineTo(2.25, 0.5);
  shape.lineTo(2.15, 0.22);
  shape.lineTo(1.9, 0.18);
  shape.lineTo(-1.9, 0.18);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 1.8,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.translate(0, 0, -0.9);
  return geometry;
}

function buildCabinGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.8, 0.8);
  shape.lineTo(-0.62, 1.3);
  shape.lineTo(0.55, 1.34);
  shape.lineTo(0.85, 0.8);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 1.5,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.translate(0, 0, -0.75);
  return geometry;
}

function buildWheelGeometry() {
  const geometry = new THREE.CylinderGeometry(0.45, 0.45, 0.32, 24);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function buildRimGeometry() {
  return new THREE.TorusGeometry(0.26, 0.03, 8, 24);
}

function buildArchGeometry() {
  return new THREE.TorusGeometry(0.58, 0.035, 8, 24, Math.PI);
}

// Front-right wheel is the one the camera focuses on in stage 3; its brake
// assembly lives there. See cameraPath.ts's FRONT_WHEEL for the world-space
// equivalent of this same point.
export const FOCUS_WHEEL_LOCAL: [number, number, number] = [1.3, 0.45, -0.78];

const WHEEL_POSITIONS: [number, number, number][] = [
  [1.3, 0.45, 0.78],
  FOCUS_WHEEL_LOCAL,
  [-1.3, 0.45, 0.78],
  [-1.3, 0.45, -0.78],
];

function SpinningWheel({
  position,
  wheelGeometry,
  rimGeometry,
  archGeometry,
}: {
  position: [number, number, number];
  wheelGeometry: THREE.BufferGeometry;
  rimGeometry: THREE.BufferGeometry;
  archGeometry: THREE.BufferGeometry;
}) {
  const spinRef = useRef<THREE.Group>(null!);
  const reducedMotion = useReducedMotion();

  useFrame(() => {
    spinRef.current.rotation.z = reducedMotion.current
      ? 0
      : -scrollState.progress * WHEEL_SPIN_TURNS * Math.PI * 2;
  });

  return (
    <group position={position}>
      <group ref={spinRef}>
        <HologramPart geometry={wheelGeometry} brightenAtX={position[0]} />
        <HologramPart geometry={rimGeometry} brightenAtX={position[0]} />
      </group>
      <HologramPart geometry={archGeometry} />
    </group>
  );
}

export default function HologramCar() {
  const body = useMemo(() => buildBodyGeometry(), []);
  const cabin = useMemo(() => buildCabinGeometry(), []);
  const wheel = useMemo(() => buildWheelGeometry(), []);
  const rim = useMemo(() => buildRimGeometry(), []);
  const arch = useMemo(() => buildArchGeometry(), []);

  return (
    <group position={layout.car.position} rotation={layout.car.rotation}>
      <HologramPart geometry={body} dimRange={ENGINE_STAGE_RANGE} />
      <HologramPart
        geometry={cabin}
        dimRange={ENGINE_STAGE_RANGE}
        brightenAtX={0}
      />
      {WHEEL_POSITIONS.map((pos) => (
        <SpinningWheel
          key={pos.join(",")}
          position={pos}
          wheelGeometry={wheel}
          rimGeometry={rim}
          archGeometry={arch}
        />
      ))}
      <BrakeAssembly wheelPosition={FOCUS_WHEEL_LOCAL} />
      <EngineBlock />
      <Diagnostics />
    </group>
  );
}
