"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { theme } from "./theme";
import { layout } from "./layout";

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

const WHEEL_POSITIONS: [number, number, number][] = [
  [1.3, 0.45, 0.78],
  [1.3, 0.45, -0.78],
  [-1.3, 0.45, 0.78],
  [-1.3, 0.45, -0.78],
];

function HologramPart({
  geometry,
  position,
}: {
  geometry: THREE.BufferGeometry;
  position?: [number, number, number];
}) {
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 20), [geometry]);

  return (
    <group position={position}>
      <mesh geometry={geometry}>
        <meshBasicMaterial
          color={theme.teal}
          transparent
          opacity={0.07}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={theme.teal} toneMapped={false} />
      </lineSegments>
    </group>
  );
}

export default function HologramCar() {
  const body = useMemo(buildBodyGeometry, []);
  const cabin = useMemo(buildCabinGeometry, []);
  const wheel = useMemo(buildWheelGeometry, []);
  const rim = useMemo(buildRimGeometry, []);
  const arch = useMemo(buildArchGeometry, []);

  return (
    <group position={layout.car.position}>
      <HologramPart geometry={body} />
      <HologramPart geometry={cabin} />
      {WHEEL_POSITIONS.map((pos) => (
        <group key={pos.join(",")}>
          <HologramPart geometry={wheel} position={pos} />
          <HologramPart geometry={rim} position={pos} />
          <HologramPart geometry={arch} position={[pos[0], 0.45, pos[2]]} />
        </group>
      ))}
    </group>
  );
}
