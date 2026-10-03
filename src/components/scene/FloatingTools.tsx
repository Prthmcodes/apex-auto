"use client";

import { useCallback, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import scrollState from "@/lib/scrollState";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { peek, setHover, toggleStory } from "@/lib/toolStory";
import { theme } from "./theme";
import { bandOpacity, hardBand } from "./stageFade";
import { ENGINE_RANGE, DIAGNOSTICS_RANGE } from "./carStages";
import { RISE_START, chestSlot, toolRise } from "./toolReveal";

type Vec3 = [number, number, number];

// The tools are on show from the moment the first one lifts out of the
// tool chest (well before "engine") to the end of "diagnostics". Coming
// in is handled per tool by toolRise, so they appear one after another;
// this range only governs how they leave at the end.
const SHOW_RANGE: [number, number] = [RISE_START, DIAGNOSTICS_RANGE[1]];
// Once a tool is out of its drawer it flies over to its "engine" spot,
// arriving as the engine stage begins.
const FLY_END = ENGINE_RANGE[0];
// Between these two scroll points the tools glide from their "engine"
// spots (beside the car) to their "diagnostics" spots (above the roof),
// while the camera itself moves between those two shots.
const MOVE_START = ENGINE_RANGE[1] - 0.04;
const MOVE_END = DIAGNOSTICS_RANGE[0] + 0.06;

// ---------------------------------------------------------------------------
// Shared geometry: built once when this file loads, reused by every render.

function extrude(shape: THREE.Shape, depth: number) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.25,
    bevelSize: depth * 0.2,
    bevelSegments: 2,
    curveSegments: 24,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function roundedRect(width: number, height: number, radius: number) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function annulus(outer: number, inner: number) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
}

/** Combination spanner: a ring end, a handle, and an open jaw. */
function buildSpanner() {
  const handle = extrude(roundedRect(0.24, 0.026, 0.012), 0.012);
  const ring = extrude(annulus(0.034, 0.019), 0.016);
  ring.translate(-0.13, 0, 0);
  const jaw = new THREE.Shape();
  const gap = 0.55;
  jaw.absarc(0, 0, 0.038, gap, Math.PI * 2 - gap, false);
  jaw.absarc(0, 0, 0.02, Math.PI * 2 - gap, gap, true);
  const jawGeometry = extrude(jaw, 0.014);
  jawGeometry.translate(0.135, 0, 0);
  return mergeGeometries([handle, ring, jawGeometry])!;
}

function lathe(points: [number, number][], segments = 32) {
  return new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segments
  );
}

const geometry = {
  spanner: buildSpanner(),

  bottle: lathe([
    [0, 0], [0.055, 0], [0.062, 0.012], [0.062, 0.15], [0.05, 0.19],
    [0.02, 0.205], [0.02, 0.22], [0, 0.22],
  ]),
  bottleLabel: new THREE.CylinderGeometry(0.0635, 0.0635, 0.06, 32, 1, true),
  bottleCap: new THREE.CylinderGeometry(0.024, 0.024, 0.03, 20),

  disc: extrude(annulus(0.15, 0.055), 0.022),
  discHat: new THREE.CylinderGeometry(0.06, 0.06, 0.04, 32).rotateX(Math.PI / 2),
  caliper: extrude(roundedRect(0.11, 0.06, 0.02), 0.06),

  gaugeBody: new THREE.CylinderGeometry(0.048, 0.048, 0.026, 32).rotateX(Math.PI / 2),
  gaugeFace: new THREE.CircleGeometry(0.04, 32),
  gaugeNeedle: new THREE.BoxGeometry(0.004, 0.034, 0.002),
  gaugeStem: new THREE.CylinderGeometry(0.008, 0.008, 0.12, 12),
  gaugeChuck: new THREE.CylinderGeometry(0.013, 0.011, 0.03, 12),

  plugCeramic: lathe([
    [0, 0.13], [0.008, 0.13], [0.011, 0.12], [0.013, 0.07], [0.017, 0.062], [0, 0.062],
  ]),
  plugHex: new THREE.CylinderGeometry(0.022, 0.022, 0.022, 6),
  plugThread: new THREE.CylinderGeometry(0.011, 0.011, 0.05, 16),
  plugTip: new THREE.CylinderGeometry(0.003, 0.003, 0.014, 6),

  wrenchShaft: new THREE.CylinderGeometry(0.012, 0.012, 0.42, 16).rotateZ(Math.PI / 2),
  wrenchHead: new THREE.CylinderGeometry(0.026, 0.026, 0.026, 24).rotateX(Math.PI / 2),
  wrenchGrip: new THREE.CylinderGeometry(0.019, 0.019, 0.13, 16).rotateZ(Math.PI / 2),
  wrenchCollar: new THREE.CylinderGeometry(0.016, 0.016, 0.02, 16).rotateZ(Math.PI / 2),
};

// Shared materials. Brushed steel uses a little anisotropy so highlights
// stretch along the metal, the way real brushed tools catch light.
const material = {
  steel: new THREE.MeshPhysicalMaterial({
    color: theme.toolSteel,
    metalness: 1,
    roughness: 0.32,
    anisotropy: 0.6,
    envMapIntensity: 1.2,
  }),
  darkSteel: new THREE.MeshStandardMaterial({
    color: theme.engineMetal,
    metalness: 0.9,
    roughness: 0.35,
  }),
  grip: new THREE.MeshStandardMaterial({ color: theme.toolGrip, roughness: 0.75 }),
  bottle: new THREE.MeshStandardMaterial({ color: theme.oilBottle, roughness: 0.45 }),
  accent: new THREE.MeshStandardMaterial({ color: theme.primary, roughness: 0.4 }),
  caliper: new THREE.MeshStandardMaterial({ color: theme.caliperRed, roughness: 0.35, metalness: 0.3 }),
  ceramic: new THREE.MeshStandardMaterial({ color: theme.sparkCeramic, roughness: 0.25 }),
  face: new THREE.MeshStandardMaterial({ color: theme.gaugeFace, roughness: 0.5 }),
};

/**
 * A soft round glow, painted once as a small radial gradient.
 *
 * A plain additive sphere was tried first and looked wrong: additive
 * blending makes every pixel of it equally bright, so it read as a solid
 * ball of colour swallowing the tool rather than a glow behind it. A
 * gradient that falls away to nothing at its edge is what actually reads
 * as light.
 */
function makeGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, "rgba(255,255,255,0.85)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.28)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Built lazily, so this module can still be imported where there's no
// document (it only ever renders in the browser, but imports are cheap to
// get wrong).
let glowTexture: THREE.Texture | null = null;
function getGlowTexture() {
  if (!glowTexture) glowTexture = makeGlowTexture();
  return glowTexture;
}

// A sprite always faces the camera, so the glow reads the same from every
// angle without any per-frame work.
// Deliberately generous hit target: a comfortable tap on a phone, where
// the tools are small on screen.
const hitGeometry = new THREE.SphereGeometry(0.2, 12, 8);

type PartSpec = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  position?: Vec3;
  rotation?: Vec3;
};

type Spots = { engine: Vec3; diagnostics: Vec3 };

type ToolSpec = {
  name: string;
  parts: PartSpec[];
  scale: number;
  // World-space hover spots for the two stages, one set for wide screens
  // and one for upright phones, plus a resting tilt.
  wide: Spots;
  tall: Spots;
  tilt: Vec3;
};

// Spots are in world space, chosen by projecting them through the actual
// stage cameras so none of them covers the car or the captions.
// The car sits at x = 0, z = -6.5, about 2.2m wide and 4.9m long with its
// roof at 1.8m.
// - Wide screens: "engine" spots sit either side of the car (the engine
//   shot looks down from in front of it); "diagnostics" spots sit in the
//   strip above the roofline (the side-on shot has no room beside it).
// - Upright phones: the car fills the width in the engine shot, so the
//   tools hover in the open space behind it instead, and the taller
//   diagnostics frame leaves more room above the roof.
const TOOLS: ToolSpec[] = [
  {
    name: "spanner",
    parts: [{ geometry: geometry.spanner, material: material.steel }],
    scale: 1.5,
    wide: { engine: [-1.6, 1.25, -4.2], diagnostics: [-1.4, 2.22, -4.2] },
    tall: { engine: [-1.5, 1.6, -9.5], diagnostics: [-1.2, 2.75, -5.0] },
    tilt: [0.5, 0.3, 0.4],
  },
  {
    name: "oil bottle",
    parts: [
      { geometry: geometry.bottle, material: material.bottle },
      { geometry: geometry.bottleLabel, material: material.accent, position: [0, 0.085, 0] },
      { geometry: geometry.bottleCap, material: material.grip, position: [0, 0.232, 0] },
    ],
    scale: 1.3,
    wide: { engine: [1.6, 1.1, -4.4], diagnostics: [-1.4, 2.27, -5.2] },
    tall: { engine: [-0.9, 1.25, -9.8], diagnostics: [-1.2, 3.05, -5.6] },
    tilt: [0.25, 0, -0.3],
  },
  {
    name: "brake disc and caliper",
    parts: [
      { geometry: geometry.disc, material: material.steel },
      { geometry: geometry.discHat, material: material.darkSteel },
      { geometry: geometry.caliper, material: material.caliper, position: [0, 0.13, 0.02] },
    ],
    scale: 1.2,
    wide: { engine: [-1.7, 1.0, -5.2], diagnostics: [-1.4, 2.22, -6.3] },
    tall: { engine: [-0.3, 1.65, -9.5], diagnostics: [-1.2, 2.8, -6.2] },
    tilt: [0.2, 0.7, 0],
  },
  {
    name: "tyre pressure gauge",
    parts: [
      { geometry: geometry.gaugeBody, material: material.steel },
      { geometry: geometry.gaugeFace, material: material.face, position: [0, 0, 0.0135] },
      { geometry: geometry.gaugeNeedle, material: material.caliper, position: [0.006, 0.01, 0.015], rotation: [0, 0, -0.6] },
      { geometry: geometry.gaugeStem, material: material.darkSteel, position: [0, -0.105, 0] },
      { geometry: geometry.gaugeChuck, material: material.steel, position: [0, -0.175, 0] },
    ],
    scale: 1.7,
    wide: { engine: [1.65, 1.55, -5.3], diagnostics: [-1.4, 2.30, -7.3] },
    tall: { engine: [0.3, 1.3, -9.8], diagnostics: [-1.2, 3.1, -6.8] },
    tilt: [0.1, -0.5, 0.25],
  },
  {
    name: "spark plug",
    parts: [
      { geometry: geometry.plugCeramic, material: material.ceramic },
      { geometry: geometry.plugHex, material: material.steel, position: [0, 0.05, 0] },
      { geometry: geometry.plugThread, material: material.darkSteel, position: [0, 0.015, 0] },
      { geometry: geometry.plugTip, material: material.steel, position: [0, -0.016, 0] },
    ],
    scale: 2.2,
    wide: { engine: [-1.75, 1.5, -5.6], diagnostics: [-1.4, 2.22, -8.3] },
    tall: { engine: [0.9, 1.7, -9.5], diagnostics: [-1.2, 2.75, -7.4] },
    tilt: [0.6, 0, 0.5],
  },
  {
    name: "torque wrench",
    parts: [
      { geometry: geometry.wrenchShaft, material: material.steel },
      { geometry: geometry.wrenchHead, material: material.darkSteel, position: [-0.22, 0, 0] },
      { geometry: geometry.wrenchGrip, material: material.grip, position: [0.17, 0, 0] },
      { geometry: geometry.wrenchCollar, material: material.accent, position: [0.095, 0, 0] },
    ],
    scale: 1.2,
    wide: { engine: [1.45, 0.8, -4.0], diagnostics: [-1.4, 2.27, -9.2] },
    tall: { engine: [1.5, 1.3, -9.6], diagnostics: [-1.2, 3.0, -8.0] },
    tilt: [0.3, 0.4, -0.25],
  },
];

// Shared scratch objects for the per-frame maths, so nothing is allocated
// inside useFrame.
const scratchTarget = new THREE.Vector3();
const scratchSlot = new THREE.Vector3();

function FloatingTool({ tool, index }: { tool: ToolSpec; index: number }) {
  const groupRef = useRef<THREE.Group>(null!);
  const glowRef = useRef<THREE.Sprite>(null!);
  const glowMaterial = useRef<THREE.SpriteMaterial>(null!);
  const reducedMotion = useReducedMotion();
  const phase = index * 1.7;
  const slot = chestSlot(index);

  // Smoothed hover amount, so the glow and the size ease rather than snap.
  const hover = useRef(0);

  const onOver = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      setHover(tool.name);
      document.body.style.cursor = "pointer";
    },
    [tool.name]
  );

  const onOut = useCallback(() => {
    setHover(null);
    document.body.style.cursor = "";
  }, []);

  const onClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      // Keeps the click from also counting as a click on the backdrop,
      // which would immediately close the card we're opening.
      event.stopPropagation();
      toggleStory(tool.name);
    },
    [tool.name]
  );

  useFrame(({ clock, size }, delta) => {
    const progress = scrollState.progress;
    const reduced = reducedMotion.current;
    const group = groupRef.current;

    // How far this tool is out of its drawer, and how far through its
    // flight to the car it is.
    const rise = toolRise(progress, index, reduced);
    const leaving = reduced
      ? hardBand(progress, SHOW_RANGE)
      : bandOpacity(progress, [SHOW_RANGE[0] - 1, SHOW_RANGE[1]], 0.06);

    const amount = Math.min(rise, leaving);
    group.visible = amount > 0.001;
    if (!group.visible) {
      if (hover.current !== 0) hover.current = 0;
      return;
    }

    // Ease in by growing from nothing, rather than fading (see-through
    // metal looks wrong).
    const eased = THREE.MathUtils.smoothstep(amount, 0, 1);

    const tall = size.width < size.height;
    const spots = tall ? tool.tall : tool.wide;
    const [ex, ey, ez] = spots.engine;
    const [dx, dy, dz] = spots.diagnostics;
    const move = THREE.MathUtils.smoothstep(progress, MOVE_START, MOVE_END);
    // Slightly smaller in the wide diagnostics shot, where the strip above
    // the roof is narrow.
    const fit = tall ? 1 : THREE.MathUtils.lerp(1, 0.8, move);

    // Hover: a touch bigger, with a glow behind it. Eased by time rather
    // than snapped, and skipped entirely under reduced motion.
    const state = peek();
    const wanted = state.hoverId === tool.name || state.openId === tool.name ? 1 : 0;
    hover.current = reduced
      ? wanted
      : // Capped like the camera's (CameraRig.tsx), so a slow frame
        // doesn't snap the glow on or off.
        THREE.MathUtils.damp(hover.current, wanted, 12, Math.min(delta, 1 / 30));
    const hovered = hover.current;

    group.scale.setScalar(tool.scale * eased * fit * (1 + hovered * 0.16));
    if (glowMaterial.current) glowMaterial.current.opacity = hovered * 0.5;
    if (glowRef.current) glowRef.current.visible = hovered > 0.01;

    // A slow, gentle hover and turn; switched off for reduced motion.
    const t = reduced ? 0 : clock.elapsedTime;
    const bob = Math.sin(t * 0.7 + phase) * 0.04;
    // While gliding between the two stages' spots, arc up and over the
    // roof rather than cutting through the car.
    const arc = Math.sin(move * Math.PI) * 0.9;
    scratchTarget.set(
      THREE.MathUtils.lerp(ex, dx, move),
      THREE.MathUtils.lerp(ey, dy, move) + arc + bob,
      THREE.MathUtils.lerp(ez, dz, move)
    );

    // Before the engine stage the tool is still travelling from its drawer
    // to its hovering spot; `fly` is 0 at the chest and 1 once it's there.
    const fly = reduced
      ? 1
      : THREE.MathUtils.smoothstep(progress, RISE_START + index * 0.022, FLY_END);
    if (fly < 1) {
      scratchSlot.set(slot[0], slot[1] + rise * 0.35, slot[2]);
      scratchTarget.lerpVectors(scratchSlot, scratchTarget, THREE.MathUtils.smoothstep(fly, 0, 1));
    }
    group.position.copy(scratchTarget);

    group.rotation.set(
      tool.tilt[0] + Math.sin(t * 0.3 + phase) * 0.15,
      tool.tilt[1] + t * 0.25,
      tool.tilt[2]
    );
  });

  return (
    <group
      ref={groupRef}
      visible={false}
      onPointerOver={onOver}
      onPointerOut={onOut}
      onClick={onClick}
    >
      {/* A soft halo behind the tool on hover. Hidden (so not drawn)
          whenever the tool isn't being pointed at; sprites aren't raycast
          against here because the hit target below does that job. */}
      <sprite ref={glowRef} visible={false} scale={0.62} raycast={() => null}>
        <spriteMaterial
          ref={glowMaterial}
          map={getGlowTexture()}
          color={theme.primary}
          transparent
          opacity={0}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
      {tool.parts.map((part, i) => (
        <mesh
          key={i}
          geometry={part.geometry}
          material={part.material}
          position={part.position}
          rotation={part.rotation}
        />
      ))}
      {/* An invisible ball covering the whole tool, so fiddly shapes like
          the spark plug are still easy to hit with a finger. */}
      <mesh geometry={hitGeometry} visible={false} />
    </group>
  );
}

/**
 * Six workshop tools (spanner, oil bottle, brake disc and caliper, tyre
 * pressure gauge, spark plug, torque wrench) that drift slowly in the air
 * around the car during the "engine" and "diagnostics" stages. All
 * procedural; every geometry and material is built once and shared.
 */
export default function FloatingTools() {
  return (
    <>
      {TOOLS.map((tool, i) => (
        <FloatingTool key={tool.name} tool={tool} index={i} />
      ))}
    </>
  );
}
