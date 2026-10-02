"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import CameraRig from "./CameraRig";

function PlaceholderCube() {
  const meshRef = useRef<Mesh>(null!);

  useFrame((_, delta) => {
    meshRef.current.rotation.x += delta * 0.15;
    meshRef.current.rotation.y += delta * 0.3;
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial color="#ff5a1f" />
    </mesh>
  );
}

export default function Experience() {
  return (
    <Canvas
      camera={{ position: [0, 4, 10], fov: 50, near: 0.1, far: 100 }}
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}
    >
      <color attach="background" args={["#05050a"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} />
      <PlaceholderCube />
      <CameraRig />
    </Canvas>
  );
}
