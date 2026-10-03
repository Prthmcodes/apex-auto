"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { siteContent } from "@/content/site";
import scrollState from "@/lib/scrollState";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { theme } from "./theme";
import { HologramPart } from "./HologramPart";
import { fadeOpacity } from "./stageFade";

const ENGINE_STAGE_RANGE = siteContent.stages[3].range;

function buildBlockGeometry() {
  return new THREE.BoxGeometry(0.8, 0.45, 1.1);
}

function buildIntakeGeometry() {
  return new THREE.CylinderGeometry(0.12, 0.12, 0.3, 16);
}

function buildPulleyGeometry() {
  const geometry = new THREE.CylinderGeometry(0.15, 0.15, 0.08, 20);
  geometry.rotateZ(Math.PI / 2);
  return geometry;
}

const LABEL_POSITIONS: [number, number, number][] = [
  [1.1, 0.78, 0.15],
  [0.75, 0.95, 0.25],
  [0.55, 0.65, -0.35],
];

function EngineLabel({
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
        fadeOpacity(scrollState.progress, ENGINE_STAGE_RANGE, reducedMotion.current)
      );
    }
  });

  return (
    <Html position={position} center pointerEvents="none">
      <div
        ref={ref}
        className="whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
        style={{
          opacity: 0,
          color: theme.primary,
          backgroundColor: "rgba(6, 9, 18, 0.65)",
          border: `1px solid ${theme.primary}66`,
        }}
      >
        {text}
      </div>
    </Html>
  );
}

/**
 * A simple engine block revealed under the bonnet during the "engine"
 * stage, with a few generic floating labels. Text comes from
 * src/content/site.ts (siteContent.engineLabels).
 */
export default function EngineBlock() {
  const block = useMemo(() => buildBlockGeometry(), []);
  const intake = useMemo(() => buildIntakeGeometry(), []);
  const pulley = useMemo(() => buildPulleyGeometry(), []);
  const labels = siteContent.engineLabels;

  return (
    <group>
      <HologramPart
        geometry={block}
        position={[1.0, 0.55, 0]}
        fadeRange={ENGINE_STAGE_RANGE}
      />
      <HologramPart
        geometry={intake}
        position={[0.75, 0.95, 0.25]}
        fadeRange={ENGINE_STAGE_RANGE}
      />
      <HologramPart
        geometry={intake}
        position={[0.75, 0.95, -0.25]}
        fadeRange={ENGINE_STAGE_RANGE}
      />
      <HologramPart
        geometry={pulley}
        position={[1.35, 0.5, 0]}
        fadeRange={ENGINE_STAGE_RANGE}
      />
      {labels.map((text, i) => (
        <EngineLabel key={text} position={LABEL_POSITIONS[i]} text={text} />
      ))}
    </group>
  );
}
