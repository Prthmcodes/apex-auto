"use client";

import { Text } from "@react-three/drei";
import { theme } from "./theme";
import { layout } from "./layout";
import { siteContent } from "@/content/site";

const { height, door, frontZ } = layout.garage;

export default function Sign() {
  return (
    <Text
      font="/fonts/Rajdhani-Bold.ttf"
      position={[0, door.height + (height - door.height) / 2, frontZ + 0.2]}
      fontSize={0.55}
      letterSpacing={0.06}
      anchorX="center"
      anchorY="middle"
    >
      {siteContent.business.name.toUpperCase()}
      <meshBasicMaterial color={theme.primary} toneMapped={false} />
    </Text>
  );
}
