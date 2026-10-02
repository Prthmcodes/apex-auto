"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import scrollState from "@/lib/scrollState";
import { layout } from "./layout";

const START = new THREE.Vector3(...layout.camera.start);
const END = new THREE.Vector3(...layout.camera.end);
const LOOK_AT = new THREE.Vector3(...layout.camera.lookAt);

export default function CameraRig() {
  const position = useRef(new THREE.Vector3());

  useFrame(({ camera }) => {
    position.current.lerpVectors(START, END, scrollState.progress);
    camera.position.copy(position.current);
    camera.lookAt(LOOK_AT);
  });

  return null;
}
