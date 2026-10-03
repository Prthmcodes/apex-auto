"use client";

import { useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { layout } from "./layout";

// How many times the 512px tile repeats across the ground plane.
const REPEAT = 40;

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

/** A couple of faded parking-bay line markings in front of the garage door. */
function LineMarkings() {
  const lines = useMemo(
    () => [
      { position: [-2.6, 0.006, 10] as const, size: [0.12, 0.01, 16] as const },
      { position: [2.6, 0.006, 10] as const, size: [0.12, 0.01, 16] as const },
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
          roughnessMap={asphalt.roughnessMap}
          roughness={0.55}
          metalness={0}
        />
      </mesh>
      <LineMarkings />
      <Kerb />
    </group>
  );
}
