"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { siteContent } from "@/content/site";
import scrollState from "@/lib/scrollState";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { theme } from "./theme";
import { bandOpacity, fadeOpacity } from "./stageFade";
import { SCAN_STAGE_RANGE, scanPositionX } from "./scan";

function ScanPlane() {
  const groupRef = useRef<THREE.Group>(null!);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null!);
  const reducedMotion = useReducedMotion();

  useFrame(() => {
    const progress = scrollState.progress;
    // The sweeping plane itself is motion, so it's switched off under
    // reduced motion. The "parts it has passed" glow (HologramPart's
    // brightenAtX) is driven by scroll position directly and stays on.
    const visible = !reducedMotion.current && bandOpacity(progress, SCAN_STAGE_RANGE, 0.05) > 0;
    groupRef.current.visible = visible;
    if (visible) {
      groupRef.current.position.x = scanPositionX(progress);
      materialRef.current.opacity = 0.35 * bandOpacity(progress, SCAN_STAGE_RANGE, 0.05);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.7, 0]} visible={false}>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.2, 1.6]} />
        <meshBasicMaterial
          ref={materialRef}
          color={theme.primary}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

const READOUT_POSITIONS: [number, number, number][] = [
  [1.1, 0.9, -1.3],
  [0.4, 0.9, -1.3],
  [-0.3, 0.9, -1.3],
  [-1.2, 0.9, -1.3],
];

function ReadoutChip({
  position,
  text,
}: {
  position: [number, number, number];
  text: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useFrame(() => {
    if (ref.current) {
      ref.current.style.opacity = String(
        fadeOpacity(scrollState.progress, SCAN_STAGE_RANGE, reducedMotion.current)
      );
    }
  });

  return (
    <Html position={position} center pointerEvents="none">
      <div
        ref={ref}
        className="whitespace-nowrap rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide"
        style={{
          opacity: 0,
          color: theme.primary,
          backgroundColor: "rgba(6, 9, 18, 0.7)",
          border: `1px solid ${theme.primary}66`,
        }}
      >
        {text}
      </div>
    </Html>
  );
}

/**
 * The "diagnostics" stage beat: a sweeping scan plane plus a handful of
 * readout chips beside the car. The chip text (siteContent.diagnosticsReadouts)
 * is decorative placeholder UI dressing only — fake results to sell the
 * diagnostics idea, never real inspection data.
 */
export default function Diagnostics() {
  const readouts = siteContent.diagnosticsReadouts;

  return (
    <group>
      <ScanPlane />
      {readouts.map((text, i) => (
        <ReadoutChip key={text} position={READOUT_POSITIONS[i]} text={text} />
      ))}
    </group>
  );
}
