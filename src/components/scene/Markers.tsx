"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { MeshBasicMaterial } from "three";
import scrollState from "@/lib/scrollState";
import { theme } from "./theme";
import { siteContent } from "@/content/site";
import { FRONT_WHEEL, BONNET } from "./cameraPath";
import { bandOpacity } from "./stageFade";

function MarkerDot({
  position,
  range,
}: {
  position: [number, number, number];
  range: readonly [number, number];
}) {
  const materialRef = useRef<MeshBasicMaterial>(null!);

  useFrame(() => {
    materialRef.current.opacity = bandOpacity(scrollState.progress, range);
  });

  return (
    <mesh position={position}>
      <sphereGeometry args={[0.06, 12, 12]} />
      <meshBasicMaterial
        ref={materialRef}
        color={theme.teal}
        transparent
        opacity={0}
        toneMapped={false}
      />
    </mesh>
  );
}

export default function Markers() {
  const wheelsStage = siteContent.stages[2];
  const engineStage = siteContent.stages[3];

  return (
    <>
      <MarkerDot
        position={[FRONT_WHEEL.x, FRONT_WHEEL.y + 0.35, FRONT_WHEEL.z]}
        range={wheelsStage.range}
      />
      <MarkerDot
        position={[BONNET.x, BONNET.y + 0.25, BONNET.z]}
        range={engineStage.range}
      />
    </>
  );
}
