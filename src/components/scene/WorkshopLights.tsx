"use client";

import { useState } from "react";
import * as THREE from "three";
import { theme } from "./theme";
import { layout } from "./layout";

const [carX, , carZ] = layout.car.position;
const ceilingY = layout.garage.height - 0.12;

// Two long ceiling strip lights running front to back over the car. They
// light the workshop warmly, and their reflections run along the gloss
// black roof and bonnet: that's what makes a black car's shape readable.
const STRIPS: [number, number, number][] = [
  [carX - 0.75, ceilingY, carZ],
  [carX + 0.75, ceilingY, carZ],
];
const STRIP_LENGTH = 3.4;

/**
 * The garage's own lighting, on top of the dusk environment:
 * - warm overhead strip lights (visible fittings plus real lights), and
 * - a cool rim light from the back wall that outlines the roof, pillars
 *   and shoulders against the dark background.
 */
export default function WorkshopLights() {
  // The rim light's aim point. A spot light only aims correctly if its
  // target is part of the scene, so it's rendered below as a primitive.
  const [rimTarget] = useState(() => new THREE.Object3D());

  return (
    <group>
      {STRIPS.map((position) => (
        <mesh key={position[0]} position={position}>
          <boxGeometry args={[0.14, 0.05, STRIP_LENGTH]} />
          <meshStandardMaterial
            color={theme.workshopLight}
            emissive={theme.workshopLight}
            emissiveIntensity={1.3}
            toneMapped={false}
          />
        </mesh>
      ))}
      <pointLight
        position={[carX, ceilingY - 1.1, carZ + 1.3]}
        color={theme.workshopLight}
        intensity={6}
        distance={9}
        decay={2}
      />
      <pointLight
        position={[carX, ceilingY - 1.1, carZ - 1.3]}
        color={theme.workshopLight}
        intensity={6}
        distance={9}
        decay={2}
      />

      <primitive object={rimTarget} position={[carX, 1.1, carZ]} />
      <spotLight
        position={[carX, ceilingY - 0.2, layout.garage.backZ + 0.4]}
        target={rimTarget}
        color={theme.rimLight}
        intensity={45}
        angle={0.75}
        penumbra={1}
        distance={12}
        decay={2}
      />
    </group>
  );
}
