"use client";

import { Canvas } from "@react-three/fiber";
import Scene from "./scene/Scene";
import { START_POSITION } from "./scene/cameraPath";

export default function Experience() {
  return (
    <Canvas
      camera={{ position: START_POSITION, fov: 50, near: 0.1, far: 120 }}
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}
    >
      <Scene />
    </Canvas>
  );
}
