"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import scrollState from "@/lib/scrollState";
import { theme } from "./theme";
import { bandOpacity } from "./stageFade";
import { scanPassed } from "./scan";

type GlowEdgesProps = {
  geometry: THREE.BufferGeometry;
  /** Fades the edges in, then back out, across this stage's scroll range. */
  fadeRange?: readonly [number, number];
  /** Dims the edges (down to dimTo) during this stage's scroll range. */
  dimRange?: readonly [number, number];
  dimTo?: number;
  /** Brightens the edges once the diagnostics scan passes this local X. */
  brightenAtX?: number;
};

/** The glowing teal edge lines shared by every hologram piece. */
export function GlowEdges({
  geometry,
  fadeRange,
  dimRange,
  dimTo = 0.4,
  brightenAtX,
}: GlowEdgesProps) {
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 20), [geometry]);
  const lineRef = useRef<THREE.LineBasicMaterial>(null!);
  const normalColor = useMemo(() => new THREE.Color(theme.primary), []);
  const brightColor = useMemo(
    () => new THREE.Color(theme.primary).lerp(new THREE.Color("#ffffff"), 0.6),
    []
  );
  const dynamic = Boolean(fadeRange || dimRange || brightenAtX !== undefined);

  useFrame(() => {
    if (!dynamic) return;
    const progress = scrollState.progress;

    let factor = 1;
    if (fadeRange) factor *= bandOpacity(progress, fadeRange);
    if (dimRange) factor *= 1 - (1 - dimTo) * bandOpacity(progress, dimRange);
    lineRef.current.opacity = factor;

    if (brightenAtX !== undefined) {
      const brighten = scanPassed(progress, brightenAtX);
      lineRef.current.color.copy(normalColor).lerp(brightColor, brighten);
    }
  });

  return (
    <lineSegments geometry={edges}>
      <lineBasicMaterial
        ref={lineRef}
        color={theme.primary}
        transparent={dynamic}
        opacity={fadeRange ? 0 : 1}
        toneMapped={false}
      />
    </lineSegments>
  );
}

export type HologramPartProps = {
  geometry: THREE.BufferGeometry;
  position?: [number, number, number];
  fillOpacity?: number;
  fadeRange?: readonly [number, number];
  dimRange?: readonly [number, number];
  dimTo?: number;
  brightenAtX?: number;
};

/**
 * A single hologram piece: a faint translucent fill plus glowing teal edge
 * lines. Shared by the wheels, rims, arches, and the stage-specific detail
 * pieces (brake assembly, engine block). The car's body/cabin use
 * HologramShell instead, for the solidifying shader fill.
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
  const fillRef = useRef<THREE.MeshBasicMaterial>(null!);
  const dynamic = Boolean(fadeRange || dimRange);

  useFrame(() => {
    if (!dynamic) return;
    const progress = scrollState.progress;

    let factor = 1;
    if (fadeRange) factor *= bandOpacity(progress, fadeRange);
    if (dimRange) factor *= 1 - (1 - dimTo) * bandOpacity(progress, dimRange);
    fillRef.current.opacity = fillOpacity * factor;
  });

  return (
    <group position={position}>
      <mesh geometry={geometry}>
        <meshBasicMaterial
          ref={fillRef}
          color={theme.primary}
          transparent
          opacity={fadeRange ? 0 : fillOpacity}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <GlowEdges
        geometry={geometry}
        fadeRange={fadeRange}
        dimRange={dimRange}
        dimTo={dimTo}
        brightenAtX={brightenAtX}
      />
    </group>
  );
}
