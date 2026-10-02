"use client";

import { theme } from "./theme";
import { layout } from "./layout";

const { width, depth, height, frontZ, backZ, door } = layout.garage;
const halfWidth = width / 2;
const wallThickness = 0.3;
const pillarWidth = (width - door.width) / 2;
const midZ = (frontZ + backZ) / 2;

export default function Garage() {
  return (
    <group>
      {/* left side wall */}
      <mesh position={[-halfWidth + wallThickness / 2, height / 2, midZ]}>
        <boxGeometry args={[wallThickness, height, depth]} />
        <meshStandardMaterial color={theme.wall} />
      </mesh>

      {/* right side wall */}
      <mesh position={[halfWidth - wallThickness / 2, height / 2, midZ]}>
        <boxGeometry args={[wallThickness, height, depth]} />
        <meshStandardMaterial color={theme.wall} />
      </mesh>

      {/* back wall */}
      <mesh position={[0, height / 2, backZ]}>
        <boxGeometry args={[width, height, wallThickness]} />
        <meshStandardMaterial color={theme.wall} />
      </mesh>

      {/* flat roof */}
      <mesh position={[0, height + wallThickness / 2, midZ]}>
        <boxGeometry args={[width, wallThickness, depth]} />
        <meshStandardMaterial color={theme.roof} />
      </mesh>

      {/* front wall: left door pillar */}
      <mesh
        position={[-(door.width / 2 + pillarWidth / 2), height / 2, frontZ]}
      >
        <boxGeometry args={[pillarWidth, height, wallThickness]} />
        <meshStandardMaterial color={theme.pillar} />
      </mesh>

      {/* front wall: right door pillar */}
      <mesh position={[door.width / 2 + pillarWidth / 2, height / 2, frontZ]}>
        <boxGeometry args={[pillarWidth, height, wallThickness]} />
        <meshStandardMaterial color={theme.pillar} />
      </mesh>

      {/* lintel above the open roller door */}
      <mesh
        position={[0, door.height + (height - door.height) / 2, frontZ]}
      >
        <boxGeometry args={[door.width, height - door.height, wallThickness]} />
        <meshStandardMaterial color={theme.pillar} />
      </mesh>

      {/* warm amber strip light glowing from just inside the doorway */}
      <mesh position={[0, door.height - 0.1, frontZ + 0.4]}>
        <boxGeometry args={[door.width - 0.3, 0.1, 0.1]} />
        <meshStandardMaterial
          color={theme.amber}
          emissive={theme.amber}
          emissiveIntensity={2.5}
          toneMapped={false}
        />
      </mesh>

      {/* amber light spilling out of the garage onto the forecourt */}
      <pointLight
        position={[0, door.height - 0.6, frontZ + 1.5]}
        color={theme.amber}
        intensity={6}
        distance={13}
        decay={2}
      />
    </group>
  );
}
