"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import scrollState from "@/lib/scrollState";
import { theme } from "./theme";
import { bandOpacity } from "./stageFade";
import { scanPassed } from "./scan";

export type HologramPartProps = {
  geometry: THREE.BufferGeometry;
  position?: [number, number, number];
  fillOpacity?: number;
  /** Fades the part in, then back out, across this stage's scroll range. */
  fadeRange?: readonly [number, number];
  /** Dims the part (down to dimTo) during this stage's scroll range. */
  dimRange?: readonly [number, number];
  dimTo?: number;
  /** Brightens the part's edge lines once the diagnostics scan passes this local X. */
  brightenAtX?: number;
};

/**
 * A single hologram piece: a faint translucent fill plus glowing teal edge
 * lines (EdgesGeometry + LineSegments). Shared by the car body, wheels, and
 * the stage-specific detail pieces (brake assembly, engine block).
 */
export function HologramPart({
  geometry,
  position,
  fillOpacity = 0.07,
  fadeRange,
  dimRange,
  dimTo = 0.4,
  brightenAtX,
}: HologramPartProps) {
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 20), [geometry]);
  const fillRef = useRef<THREE.MeshBasicMaterial>(null!);
  const lineRef = useRef<THREE.LineBasicMaterial>(null!);
  const normalColor = useMemo(() => new THREE.Color(theme.teal), []);
  const brightColor = useMemo(
    () => new THREE.Color(theme.teal).lerp(new THREE.Color("#ffffff"), 0.6),
    []
  );
  const dynamic = Boolean(fadeRange || dimRange || brightenAtX !== undefined);
  const initialOpacity = fadeRange ? 0 : 1;

  useFrame(() => {
    if (!dynamic) return;
    const progress = scrollState.progress;

    let factor = 1;
    if (fadeRange) factor *= bandOpacity(progress, fadeRange);
    if (dimRange) factor *= 1 - (1 - dimTo) * bandOpacity(progress, dimRange);

    fillRef.current.opacity = fillOpacity * factor;
    lineRef.current.opacity = factor;

    if (brightenAtX !== undefined) {
      const brighten = scanPassed(progress, brightenAtX);
      lineRef.current.color.copy(normalColor).lerp(brightColor, brighten);
    }
  });

  return (
    <group position={position}>
      <mesh geometry={geometry}>
        <meshBasicMaterial
          ref={fillRef}
          color={theme.teal}
          transparent
          opacity={fadeRange ? 0 : fillOpacity}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial
          ref={lineRef}
          color={theme.teal}
          transparent={dynamic}
          opacity={initialOpacity}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  );
}
