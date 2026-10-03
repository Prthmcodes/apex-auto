"use client";

import { useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { layout } from "./layout";

// How many times the 512px tile repeats across the ground plane. Lower
// number = each tile covers more ground = a larger, calmer grain. At 40
// the tile was small enough that its bumps turned into a rippling,
// water-like pattern under the garage lights.
const REPEAT = 26;

// How much the normal map is allowed to bend the light. The map is built
// for close-up tarmac; at full strength every tiny bump catches a specular
// highlight and the whole forecourt shimmers like wet water. A third of
// that keeps the texture readable without the shimmer.
const NORMAL_STRENGTH = 0.3;
const NORMAL_SCALE = new THREE.Vector2(NORMAL_STRENGTH, NORMAL_STRENGTH);

function useAsphalt() {
  const maps = useTexture({
    map: "/textures/asphalt/color.jpg",
    normalMap: "/textures/asphalt/normal.jpg",
    roughnessMap: "/textures/asphalt/roughness.jpg",
  });

  useEffect(() => {
    for (const texture of Object.values(maps)) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(REPEAT, REPEAT);
      texture.needsUpdate = true;
    }
  }, [maps]);

  return maps;
}

/**
 * A couple of faded parking-bay markings out on the tarmac.
 *
 * They used to run from z = 2 to z = 18 at x = +/-2.6, which put one of
 * them directly under the opening camera and the other straight through
 * the concrete apron. Moved out and apart: they now start beyond the apron
 * and flank the approach instead of running down the middle of it.
 */
function LineMarkings() {
  const lines = useMemo(
    () => [
      { position: [-3.6, 0.006, 13] as const, size: [0.12, 0.01, 15] as const },
      { position: [5.9, 0.006, 13] as const, size: [0.12, 0.01, 15] as const },
    ],
    []
  );

  return (
    <>
      {lines.map((line, i) => (
        <mesh key={i} position={line.position}>
          <boxGeometry args={line.size} />
          <meshStandardMaterial color="#cfcfc4" roughness={0.8} />
        </mesh>
      ))}
    </>
  );
}

/** A low kerb marking the far edge of the forecourt. */
function Kerb() {
  return (
    <mesh position={[0, 0.08, 28.5]}>
      <boxGeometry args={[20, 0.16, 0.4]} />
      <meshStandardMaterial color="#8a8a82" roughness={0.9} />
    </mesh>
  );
}

export default function Ground() {
  const asphalt = useAsphalt();

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[layout.ground.size, layout.ground.size]} />
        <meshStandardMaterial
          map={asphalt.map}
          normalMap={asphalt.normalMap}
          normalScale={NORMAL_SCALE}
          roughnessMap={asphalt.roughnessMap}
          roughness={0.74}
          metalness={0}
        />
      </mesh>
      <LineMarkings />
      <Kerb />
    </group>
  );
}
