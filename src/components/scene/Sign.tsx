"use client";

import { Text } from "@react-three/drei";
import { theme } from "./theme";
import { layout } from "./layout";
import { siteContent } from "@/content/site";

const { height, frontZ } = layout.garage;
const WALL_THICKNESS = 0.3;

// Smaller and mounted just above the roofline — a modest shop sign rather
// than a dominant neon centrepiece, now that the roller shutter fills the
// lintel band behind where it used to sit.
export default function Sign() {
  return (
    <Text
      font="/fonts/Rajdhani-Bold.ttf"
      position={[0, height + WALL_THICKNESS + 0.3, frontZ + 0.15]}
      fontSize={0.36}
      letterSpacing={0.05}
      anchorX="center"
      anchorY="middle"
    >
      {siteContent.business.name.toUpperCase()}
      <meshBasicMaterial color={theme.primary} toneMapped={false} />
    </Text>
  );
}
