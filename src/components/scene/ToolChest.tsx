"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import scrollState from "@/lib/scrollState";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { theme } from "./theme";
import {
  CHEST,
  DRAWER_TRAVEL,
  drawerCentreY,
  drawerHeight,
  drawerOpen,
} from "./toolReveal";

// Every geometry and material here is built once, at module load, and
// shared by all six drawers — nothing is created per frame.

const DRAWER_H = drawerHeight();
const DRAWER_FACE_DEPTH = 0.035;
const HANDLE_LENGTH = CHEST.width * 0.62;

const geometry = {
  carcass: new THREE.BoxGeometry(CHEST.depth, CHEST.height - CHEST.toeKick, CHEST.width),
  top: new THREE.BoxGeometry(CHEST.depth + 0.04, CHEST.topThickness, CHEST.width + 0.04),
  toeKick: new THREE.BoxGeometry(CHEST.depth * 0.8, CHEST.toeKick, CHEST.width * 0.9),
  drawerFace: new THREE.BoxGeometry(DRAWER_FACE_DEPTH, DRAWER_H, CHEST.width - 0.03),
  // The open drawer's box, so a pulled-out drawer isn't a floating slab.
  drawerBox: new THREE.BoxGeometry(CHEST.depth * 0.82, DRAWER_H * 0.82, CHEST.width - 0.07),
  handle: new THREE.CylinderGeometry(0.011, 0.011, HANDLE_LENGTH, 10).rotateX(Math.PI / 2),
  handleStem: new THREE.CylinderGeometry(0.008, 0.008, 0.035, 8).rotateZ(Math.PI / 2),
  castor: new THREE.CylinderGeometry(0.045, 0.045, 0.028, 14).rotateX(Math.PI / 2),
  castorStem: new THREE.CylinderGeometry(0.012, 0.012, 0.045, 8),
  badge: new THREE.PlaneGeometry(0.34, 0.07),
};

const material = {
  // Worn workshop red: a touch desaturated so the car stays the brightest
  // thing on screen.
  body: new THREE.MeshStandardMaterial({
    color: theme.chestRed,
    roughness: 0.52,
    metalness: 0.35,
  }),
  // Brushed charcoal for the worktop and drawer fronts.
  charcoal: new THREE.MeshStandardMaterial({
    color: theme.chestCharcoal,
    roughness: 0.46,
    metalness: 0.55,
  }),
  steel: new THREE.MeshStandardMaterial({
    color: theme.toolSteel,
    roughness: 0.3,
    metalness: 0.9,
  }),
  rubber: new THREE.MeshStandardMaterial({ color: theme.rubber, roughness: 0.85 }),
  badge: new THREE.MeshStandardMaterial({
    color: theme.primary,
    roughness: 0.5,
    transparent: true,
    opacity: 0.5,
  }),
};

/** One drawer: a charcoal front with a steel bar handle, on runners. */
function Drawer({ index }: { index: number }) {
  const ref = useRef<THREE.Group>(null!);
  const reducedMotion = useReducedMotion();
  const restX = CHEST.depth / 2 - DRAWER_FACE_DEPTH / 2;
  const y = drawerCentreY(index) - (CHEST.height - CHEST.toeKick) / 2 - CHEST.toeKick / 2;

  useFrame(() => {
    const open = drawerOpen(scrollState.progress, index, reducedMotion.current);
    ref.current.position.x = restX + open * DRAWER_TRAVEL;
  });

  return (
    <group ref={ref} position={[restX, y, 0]}>
      <mesh geometry={geometry.drawerFace} material={material.charcoal} castShadow />
      {/* the drawer body, sitting back behind its own front */}
      <mesh
        geometry={geometry.drawerBox}
        material={material.charcoal}
        position={[-CHEST.depth / 2 + 0.02, 0, 0]}
      />
      {/* bar handle on two short stems */}
      <mesh
        geometry={geometry.handle}
        material={material.steel}
        position={[DRAWER_FACE_DEPTH / 2 + 0.035, 0, 0]}
      />
      <mesh
        geometry={geometry.handleStem}
        material={material.steel}
        position={[DRAWER_FACE_DEPTH / 2 + 0.018, 0, -HANDLE_LENGTH / 2 + 0.02]}
      />
      <mesh
        geometry={geometry.handleStem}
        material={material.steel}
        position={[DRAWER_FACE_DEPTH / 2 + 0.018, 0, HANDLE_LENGTH / 2 - 0.02]}
      />
    </group>
  );
}

/**
 * A rolling tool chest against the workshop's left-hand wall: worn red
 * carcass, brushed charcoal worktop and drawer fronts, steel bar handles
 * and four castors. Its drawers slide open as the camera comes in and the
 * six floating tools lift out of them (see toolReveal.ts, which both this
 * and FloatingTools.tsx read their timing from).
 *
 * Everything is procedural, and every geometry and material is built once
 * at module load and shared.
 */
export default function ToolChest() {
  const castorInset = 0.12;
  const bodyY = CHEST.toeKick + (CHEST.height - CHEST.toeKick) / 2;

  return (
    <group position={[CHEST.x, 0, CHEST.z]}>
      {/* carcass */}
      <mesh
        geometry={geometry.carcass}
        material={material.body}
        position={[0, bodyY, 0]}
        castShadow
        receiveShadow
      />
      {/* worktop */}
      <mesh
        geometry={geometry.top}
        material={material.charcoal}
        position={[0, CHEST.height + CHEST.topThickness / 2, 0]}
        castShadow
      />
      {/* recessed plinth, so it doesn't look like a box sat on the floor */}
      <mesh
        geometry={geometry.toeKick}
        material={material.charcoal}
        position={[0, CHEST.toeKick / 2, 0]}
      />

      <group position={[0, bodyY, 0]}>
        {Array.from({ length: CHEST.drawers }).map((_, i) => (
          <Drawer key={i} index={i} />
        ))}
      </group>

      {/* a faint accent badge on the worktop edge, as a brand touch */}
      <mesh
        geometry={geometry.badge}
        material={material.badge}
        position={[CHEST.depth / 2 + 0.003, CHEST.height - 0.1, 0]}
        rotation={[0, Math.PI / 2, 0]}
      />

      {/* castors */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <group
            key={`${sx}-${sz}`}
            position={[
              sx * (CHEST.depth / 2 - castorInset),
              0,
              sz * (CHEST.width / 2 - castorInset),
            ]}
          >
            <mesh geometry={geometry.castorStem} material={material.steel} position={[0, 0.06, 0]} />
            <mesh geometry={geometry.castor} material={material.rubber} position={[0, 0.03, 0]} />
          </group>
        ))
      )}
    </group>
  );
}
