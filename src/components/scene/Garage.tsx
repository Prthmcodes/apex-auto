"use client";

import { useEffect } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { theme } from "./theme";
import { layout } from "./layout";

const { width, depth, height, frontZ, backZ, door } = layout.garage;
const halfWidth = width / 2;
const wallThickness = 0.3;
const pillarWidth = (width - door.width) / 2;
const midZ = (frontZ + backZ) / 2;

function useRepeatingTexture(paths: { map: string; normalMap: string; roughnessMap: string }, repeat: number) {
  const maps = useTexture(paths);
  useEffect(() => {
    for (const texture of Object.values(maps)) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeat, repeat);
      texture.needsUpdate = true;
    }
  }, [maps, repeat]);
  return maps;
}

/** A handful of slat ridges on the lintel, standing in for a rolled-up roller door. */
function RollerSlats() {
  const slatCount = 5;
  const bandHeight = height - door.height;
  const slatHeight = bandHeight / slatCount;

  return (
    <>
      {Array.from({ length: slatCount }).map((_, i) => (
        <mesh
          key={i}
          position={[
            0,
            door.height + slatHeight * (i + 0.5),
            frontZ + wallThickness / 2 + 0.01,
          ]}
        >
          <boxGeometry args={[door.width - 0.05, slatHeight - 0.03, 0.04]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? "#8a8d93" : "#6e7177"}
            roughness={0.5}
            metalness={0.6}
          />
        </mesh>
      ))}
    </>
  );
}

/** A small lit window in the right-hand pillar. */
function LitWindow() {
  const x = door.width / 2 + pillarWidth / 2;
  const z = frontZ + wallThickness / 2;
  return (
    <group position={[x, height * 0.6, z]}>
      {/* dark frame, sitting slightly behind the lit pane */}
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[0.86, 1.06, 0.06]} />
        <meshStandardMaterial color="#1a1612" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[0.7, 0.9]} />
        <meshStandardMaterial
          color={theme.accent}
          emissive={theme.accent}
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>
      {/* a central mullion, so it reads as a window rather than a lit panel */}
      <mesh position={[0, 0, 0.035]}>
        <boxGeometry args={[0.04, 0.9, 0.01]} />
        <meshStandardMaterial color="#1a1612" />
      </mesh>
    </group>
  );
}

export default function Garage() {
  const concrete = useRepeatingTexture(
    {
      map: "/textures/concrete/color.jpg",
      normalMap: "/textures/concrete/normal.jpg",
      roughnessMap: "/textures/concrete/roughness.jpg",
    },
    3
  );
  const bricks = useRepeatingTexture(
    {
      map: "/textures/bricks/color.jpg",
      normalMap: "/textures/bricks/normal.jpg",
      roughnessMap: "/textures/bricks/roughness.jpg",
    },
    4
  );

  const concreteProps = {
    map: concrete.map,
    normalMap: concrete.normalMap,
    roughnessMap: concrete.roughnessMap,
    roughness: 0.9,
  };
  const brickProps = {
    map: bricks.map,
    normalMap: bricks.normalMap,
    roughnessMap: bricks.roughnessMap,
    roughness: 0.85,
  };

  return (
    <group>
      {/* left side wall */}
      <mesh
        position={[-halfWidth + wallThickness / 2, height / 2, midZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[wallThickness, height, depth]} />
        <meshStandardMaterial {...concreteProps} />
      </mesh>

      {/* right side wall */}
      <mesh
        position={[halfWidth - wallThickness / 2, height / 2, midZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[wallThickness, height, depth]} />
        <meshStandardMaterial {...concreteProps} />
      </mesh>

      {/* back wall */}
      <mesh position={[0, height / 2, backZ]} receiveShadow>
        <boxGeometry args={[width, height, wallThickness]} />
        <meshStandardMaterial {...concreteProps} />
      </mesh>

      {/* flat roof */}
      <mesh position={[0, height + wallThickness / 2, midZ]} castShadow>
        <boxGeometry args={[width, wallThickness, depth]} />
        <meshStandardMaterial {...concreteProps} />
      </mesh>

      {/* front wall: left door pillar, brick-faced lower band */}
      <mesh
        position={[-(door.width / 2 + pillarWidth / 2), height / 2, frontZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[pillarWidth, height, wallThickness]} />
        <meshStandardMaterial {...brickProps} />
      </mesh>

      {/* front wall: right door pillar, brick-faced lower band */}
      <mesh
        position={[door.width / 2 + pillarWidth / 2, height / 2, frontZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[pillarWidth, height, wallThickness]} />
        <meshStandardMaterial {...brickProps} />
      </mesh>
      <LitWindow />

      {/* lintel above the open roller door */}
      <mesh
        position={[0, door.height + (height - door.height) / 2, frontZ]}
        castShadow
      >
        <boxGeometry args={[door.width, height - door.height, wallThickness]} />
        <meshStandardMaterial {...concreteProps} />
      </mesh>
      <RollerSlats />

      {/* warm amber strip light glowing from just inside the doorway */}
      <mesh position={[0, door.height - 0.1, frontZ + 0.4]}>
        <boxGeometry args={[door.width - 0.3, 0.1, 0.1]} />
        <meshStandardMaterial
          color={theme.accent}
          emissive={theme.accent}
          emissiveIntensity={2.5}
          toneMapped={false}
        />
      </mesh>

      {/* amber light spilling out of the garage onto the forecourt */}
      <pointLight
        position={[0, door.height - 0.6, frontZ + 1.5]}
        color={theme.accent}
        intensity={6}
        distance={13}
        decay={2}
      />
    </group>
  );
}
