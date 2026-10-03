"use client";

import Atmosphere from "./Atmosphere";
import Ground from "./Ground";
import Garage from "./Garage";
import Sign from "./Sign";
import HologramCar from "./HologramCar";
import Markers from "./Markers";
import CameraRig from "./CameraRig";

export default function Scene() {
  return (
    <>
      <Atmosphere />
      <Ground />
      <Garage />
      <Sign />
      <HologramCar />
      <Markers />
      <CameraRig />
    </>
  );
}
