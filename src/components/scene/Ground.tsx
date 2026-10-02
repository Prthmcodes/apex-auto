"use client";

import { Grid } from "@react-three/drei";
import { theme } from "./theme";
import { layout } from "./layout";

export default function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[layout.ground.size, layout.ground.size]} />
        <meshStandardMaterial color={theme.ground} />
      </mesh>
      <Grid
        position={[0, 0.01, 0]}
        args={[layout.ground.size, layout.ground.size]}
        cellSize={1}
        cellThickness={0.6}
        cellColor={theme.teal}
        sectionSize={5}
        sectionThickness={1.2}
        sectionColor={theme.teal}
        fadeDistance={45}
        fadeStrength={1.5}
        infiniteGrid
        followCamera={false}
      />
    </group>
  );
}
