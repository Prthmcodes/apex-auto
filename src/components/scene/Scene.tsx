"use client";

import Atmosphere from "./Atmosphere";
import Atmospherics from "./Atmospherics";
import Ground from "./Ground";
import Garage from "./Garage";
import Sign from "./Sign";
import HologramCar from "./HologramCar";
import Markers from "./Markers";
import CameraRig from "./CameraRig";
import SceneReady from "./SceneReady";

export default function Scene({ onReady }: { onReady?: () => void }) {
  return (
    <>
      <Atmosphere />
      <Ground />
      <Garage />
      <Sign />
      <HologramCar />
      <Markers />
      <Atmospherics />
      <CameraRig />
      <SceneReady onReady={onReady} />
    </>
  );
}
