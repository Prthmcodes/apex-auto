"use client";

import { Canvas } from "@react-three/fiber";
import Scene from "./scene/Scene";
import { layout } from "./scene/layout";

export default function Experience() {
  return (
    <Canvas
      camera={{ position: layout.camera.start, fov: 50, near: 0.1, far: 120 }}
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}
    >
      <Scene />
    </Canvas>
  );
}
