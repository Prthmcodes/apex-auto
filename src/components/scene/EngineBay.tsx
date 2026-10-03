"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { siteContent } from "@/content/site";
import scrollState from "@/lib/scrollState";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { theme } from "./theme";
import { engineReveal, checkHighlight } from "./carStages";

// Everything here is placed in the car model's own space (see CarModel.tsx):
// X runs front (+) to back (-), Y is up from the ground, and the car's
// centre line sits at Z = BAY_Z. The bonnet covers roughly X 1.05 to 2.4
// at a height of about 1.2, so every part tops out below that.
const BAY_Z = -0.333;

type Vec3 = [number, number, number];

// Where each check point sits, in the same order as
// siteContent.engineChecks.points (Oil level, Coolant, Battery, Brake fluid).
// Add a position here if you add a check point in site.ts.
const CHECK_POSITIONS: Vec3[] = [
  [1.74, 1.11, BAY_Z + 0.2], // oil filler cap, on the engine cover
  [2.02, 1.02, BAY_Z + 0.62], // coolant expansion tank
  [1.27, 0.99, BAY_Z + 0.66], // battery
  [1.24, 1.01, BAY_Z - 0.64], // brake fluid reservoir, by the bulkhead
];

const LABEL_LIFT = 0.2;
const INTRO_POSITION: Vec3 = [1.62, 1.5, BAY_Z];

// Built once and shared by every glow marker.
const ringGeometry = new THREE.TorusGeometry(0.075, 0.006, 8, 40);
ringGeometry.rotateX(Math.PI / 2);
const haloGeometry = new THREE.CircleGeometry(0.13, 32);
haloGeometry.rotateX(-Math.PI / 2);

/** A solid part with faint accent-coloured edges, so shapes read clearly. */
function Part({
  geometry,
  position,
  rotation,
  color,
  roughness = 0.45,
  metalness = 0.7,
  edges = true,
}: {
  geometry: THREE.BufferGeometry;
  position: Vec3;
  rotation?: Vec3;
  color: string;
  roughness?: number;
  metalness?: number;
  edges?: boolean;
}) {
  const edgeGeometry = useMemo(
    () => (edges ? new THREE.EdgesGeometry(geometry, 30) : null),
    [geometry, edges]
  );

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={color}
          roughness={roughness}
          metalness={metalness}
        />
      </mesh>
      {edgeGeometry && (
        <lineSegments geometry={edgeGeometry}>
          <lineBasicMaterial
            color={theme.primary}
            transparent
            opacity={0.28}
            toneMapped={false}
          />
        </lineSegments>
      )}
    </group>
  );
}

function roundedBox(width: number, height: number, depth: number, radius: number) {
  const shape = new THREE.Shape();
  const w = width / 2 - radius;
  const d = depth / 2 - radius;
  shape.moveTo(-w, -d - radius);
  shape.lineTo(w, -d - radius);
  shape.quadraticCurveTo(w + radius, -d - radius, w + radius, -d);
  shape.lineTo(w + radius, d);
  shape.quadraticCurveTo(w + radius, d + radius, w, d + radius);
  shape.lineTo(-w, d + radius);
  shape.quadraticCurveTo(-w - radius, d + radius, -w - radius, d);
  shape.lineTo(-w - radius, -d);
  shape.quadraticCurveTo(-w - radius, -d - radius, -w, -d - radius);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: Math.min(radius, height * 0.2),
    bevelSize: Math.min(radius, height * 0.2) * 0.6,
    bevelSegments: 2,
    curveSegments: 4,
  });
  // Extruded along +Z: stand it up so `height` runs along Y.
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -height / 2, 0);
  return geometry;
}

function useBayGeometry() {
  return useMemo(() => {
    const hose = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(1.88, 0.98, BAY_Z - 0.2),
        new THREE.Vector3(2.02, 1.0, BAY_Z - 0.35),
        new THREE.Vector3(2.18, 0.9, BAY_Z - 0.45),
      ]),
      16,
      0.025,
      8
    );
    const lowerHose = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(1.86, 0.74, BAY_Z + 0.25),
        new THREE.Vector3(2.04, 0.7, BAY_Z + 0.4),
        new THREE.Vector3(2.18, 0.72, BAY_Z + 0.5),
      ]),
      16,
      0.025,
      8
    );
    const intakeRunner = new THREE.CylinderGeometry(0.035, 0.035, 0.36, 12);
    intakeRunner.rotateZ(Math.PI / 2);
    const airBox = roundedBox(0.36, 0.14, 0.3, 0.04);

    return {
      floor: new THREE.BoxGeometry(1.3, 0.02, 1.8),
      block: roundedBox(0.56, 0.3, 0.74, 0.04),
      cover: roundedBox(0.52, 0.06, 0.62, 0.025),
      plenum: new THREE.CylinderGeometry(0.075, 0.075, 0.6, 20).rotateX(Math.PI / 2),
      intakeRunner,
      airBox,
      oilCap: new THREE.CylinderGeometry(0.042, 0.042, 0.035, 20),
      battery: roundedBox(0.28, 0.2, 0.19, 0.015),
      terminal: new THREE.CylinderGeometry(0.016, 0.016, 0.035, 10),
      coolantTank: roundedBox(0.2, 0.14, 0.24, 0.03),
      reservoir: new THREE.CylinderGeometry(0.058, 0.064, 0.12, 20),
      cap: new THREE.CylinderGeometry(0.036, 0.036, 0.03, 16),
      radiator: new THREE.BoxGeometry(0.05, 0.42, 1.3),
      hose,
      lowerHose,
    };
  }, []);
}

/** One check point: a soft glowing halo and ring, plus its HTML label. */
function CheckPoint({
  index,
  count,
  position,
  text,
}: {
  index: number;
  count: number;
  position: Vec3;
  text: string;
}) {
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null!);
  const haloMaterial = useRef<THREE.MeshBasicMaterial>(null!);
  const glowGroup = useRef<THREE.Group>(null!);
  const labelRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();

  useFrame(() => {
    const progress = scrollState.progress;
    const reveal = engineReveal(progress, reducedMotion.current);
    const highlight = checkHighlight(progress, index, count);

    ringMaterial.current.opacity = reveal * (0.25 + 0.75 * highlight);
    haloMaterial.current.opacity = reveal * 0.35 * highlight;
    glowGroup.current.scale.setScalar(0.85 + 0.3 * highlight);

    if (labelRef.current) {
      labelRef.current.style.opacity = String(reveal * (0.55 + 0.45 * highlight));
      labelRef.current.style.borderColor =
        highlight > 0.5 ? theme.primary : "rgba(255,255,255,0.14)";
    }
    if (dotRef.current) {
      dotRef.current.style.opacity = String(0.35 + 0.65 * highlight);
    }
  });

  return (
    <group position={position}>
      <group ref={glowGroup}>
        <mesh geometry={haloGeometry} renderOrder={2}>
          <meshBasicMaterial
            ref={haloMaterial}
            color={theme.primary}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh geometry={ringGeometry} renderOrder={2}>
          <meshBasicMaterial
            ref={ringMaterial}
            color={theme.primary}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
      <Html position={[0, LABEL_LIFT, 0]} center pointerEvents="none" zIndexRange={[20, 0]}>
        <div
          ref={labelRef}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide text-white backdrop-blur-sm transition-[border-color] duration-300"
          style={{ opacity: 0, backgroundColor: `${theme.background}cc` }}
        >
          <span
            ref={dotRef}
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: theme.primary, opacity: 0.35 }}
          />
          {text}
        </div>
      </Html>
    </group>
  );
}

function IntroLabel({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useFrame(() => {
    if (ref.current) {
      ref.current.style.opacity = String(
        engineReveal(scrollState.progress, reducedMotion.current)
      );
    }
  });

  return (
    <Html position={INTRO_POSITION} center pointerEvents="none" zIndexRange={[20, 0]}>
      <div
        ref={ref}
        className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.3em]"
        style={{ opacity: 0, color: theme.primary }}
      >
        {text}
      </div>
    </Html>
  );
}

/**
 * A simple procedural engine bay that sits under the car's bonnet. The
 * bonnet itself turns see-through during the "engine" stage (see the paint
 * shader in CarModel.tsx), revealing this bay, and each check point from
 * site.ts (siteContent.engineChecks) glows in turn as you scroll. These are
 * the checks the garage performs, not a fake readout of results.
 */
export default function EngineBay() {
  const groupRef = useRef<THREE.Group>(null!);
  const reducedMotion = useReducedMotion();
  const g = useBayGeometry();
  const { intro, points } = siteContent.engineChecks;

  useFrame(() => {
    // Skip drawing the whole bay while the bonnet is solid: it's hidden
    // anyway, and this saves the GPU the work.
    groupRef.current.visible =
      engineReveal(scrollState.progress, reducedMotion.current) > 0.001;
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* dark floor of the bay, so nothing below shows through */}
      <Part geometry={g.floor} position={[1.68, 0.6, BAY_Z]} color={theme.engineDark} roughness={0.8} metalness={0.2} edges={false} />

      {/* engine block, cover and intake */}
      <Part geometry={g.block} position={[1.62, 0.8, BAY_Z]} color={theme.engineMetal} />
      <Part geometry={g.cover} position={[1.62, 1.0, BAY_Z]} color={theme.engineDark} roughness={0.35} metalness={0.4} />
      <Part geometry={g.plenum} position={[1.42, 1.0, BAY_Z]} color={theme.engineMetal} roughness={0.3} />
      <Part geometry={g.intakeRunner} position={[1.62, 1.08, BAY_Z - 0.16]} color={theme.engineMetal} roughness={0.3} edges={false} />
      <Part geometry={g.intakeRunner} position={[1.62, 1.08, BAY_Z + 0.04]} color={theme.engineMetal} roughness={0.3} edges={false} />
      <Part geometry={g.airBox} position={[1.98, 0.95, BAY_Z - 0.5]} color={theme.enginePlastic} roughness={0.7} metalness={0.1} />
      <Part geometry={g.oilCap} position={[1.74, 1.05, BAY_Z + 0.2]} color={theme.toolSteel} roughness={0.25} metalness={0.9} edges={false} />

      {/* radiator and hoses at the front */}
      <Part geometry={g.radiator} position={[2.24, 0.82, BAY_Z]} color={theme.engineDark} roughness={0.6} metalness={0.5} />
      <Part geometry={g.hose} position={[0, 0, 0]} color={theme.rubber} roughness={0.9} metalness={0} edges={false} />
      <Part geometry={g.lowerHose} position={[0, 0, 0]} color={theme.rubber} roughness={0.9} metalness={0} edges={false} />

      {/* coolant expansion tank */}
      <Part geometry={g.coolantTank} position={[2.02, 0.92, BAY_Z + 0.62]} color={theme.reservoir} roughness={0.4} metalness={0} />
      <Part geometry={g.cap} position={[2.02, 1.0, BAY_Z + 0.62]} color={theme.enginePlastic} roughness={0.6} metalness={0} edges={false} />

      {/* battery and terminals */}
      <Part geometry={g.battery} position={[1.27, 0.86, BAY_Z + 0.66]} color={theme.enginePlastic} roughness={0.65} metalness={0.05} />
      <Part geometry={g.terminal} position={[1.2, 0.975, BAY_Z + 0.6]} color={theme.toolSteel} roughness={0.3} metalness={0.9} edges={false} />
      <Part geometry={g.terminal} position={[1.34, 0.975, BAY_Z + 0.6]} color={theme.toolSteel} roughness={0.3} metalness={0.9} edges={false} />

      {/* brake fluid reservoir */}
      <Part geometry={g.reservoir} position={[1.24, 0.9, BAY_Z - 0.64]} color={theme.reservoir} roughness={0.4} metalness={0} />
      <Part geometry={g.cap} position={[1.24, 0.975, BAY_Z - 0.64]} color={theme.enginePlastic} roughness={0.6} metalness={0} edges={false} />

      <IntroLabel text={intro} />
      {points.map((text, i) => (
        <CheckPoint
          key={text}
          index={i}
          count={points.length}
          position={CHECK_POSITIONS[i]}
          text={text}
        />
      ))}
    </group>
  );
}
