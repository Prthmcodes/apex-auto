"use client";

import { ContactShadows } from "@react-three/drei";
import Atmosphere from "./Atmosphere";
import Atmospherics from "./Atmospherics";
import Ground from "./Ground";
import Garage from "./Garage";
import Sign from "./Sign";
import HologramCar from "./HologramCar";
import Markers from "./Markers";
import CameraRig from "./CameraRig";
import SceneReady from "./SceneReady";
import { layout } from "./layout";

export default function Scene({ onReady }: { onReady?: () => void }) {
  const [carX, , carZ] = layout.car.position;

  return (
    <>
      <Atmosphere />
      <Ground />
      <Garage />
      <Sign />
      <HologramCar />
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
        color="#000000"
      />
      <Markers />
      <Atmospherics />
      <CameraRig />
      <SceneReady onReady={onReady} />
    </>
  );
}
