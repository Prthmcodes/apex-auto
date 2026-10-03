"use client";

import { ContactShadows, Environment } from "@react-three/drei";
import Atmosphere from "./Atmosphere";
import Atmospherics from "./Atmospherics";
import Ground from "./Ground";
import Garage from "./Garage";
import Sign from "./Sign";
import CarModel from "./CarModel";
import FloatingTools from "./FloatingTools";
import CameraRig from "./CameraRig";
import SceneReady from "./SceneReady";
import { layout } from "./layout";
import { theme } from "./theme";
import { ENVIRONMENT_URL } from "./assets";
import WorkshopLights from "./WorkshopLights";

export default function Scene({ onReady }: { onReady?: () => void }) {
  const [carX, , carZ] = layout.car.position;

  return (
    <>
      <Atmosphere />
      {/* Soft fill light for the whole scene from a local dusk HDR
          (public/hdr/dusk.exr, CC0, see CREDITS.md), kept low so the garage
          stays moody. The car uses the same HDR at full strength for its
          reflections (see CarModel.tsx). Lighting only: the visible sky
          stays the theme's dusk colour and fog. */}
      <Environment files={ENVIRONMENT_URL} environmentIntensity={0.4} />
      <WorkshopLights />
      <Ground />
      <Garage />
      <Sign />
      <CarModel />
      <FloatingTools />
      {/* A cheap, baked-once AO blob under the car so it reads as resting
          on the ground rather than floating — the car itself doesn't move,
          so frames={1} renders it a single time and reuses it. */}
      <ContactShadows
        position={[carX, 0.014, carZ]}
        scale={6}
        opacity={0.8}
        blur={1.4}
        far={2.2}
        frames={1}
        color={theme.contactShadow}
      />
      <Atmospherics />
      <CameraRig />
      <SceneReady onReady={onReady} />
    </>
  );
}
