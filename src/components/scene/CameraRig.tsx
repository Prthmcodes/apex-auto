"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import scrollState from "@/lib/scrollState";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { siteContent } from "@/content/site";
import { positionPath, lookAtPath } from "./cameraPath";

// How quickly the eased scroll progress catches up to the raw value.
// Higher = snappier, lower = floatier. See THREE.MathUtils.damp.
const DAMP_LAMBDA = 6;

function stageIndexFor(progress: number) {
  const stages = siteContent.stages;
  for (let i = 0; i < stages.length; i += 1) {
    if (progress <= stages[i].range[1] || i === stages.length - 1) {
      return i;
    }
  }
  return stages.length - 1;
}

export default function CameraRig() {
  const smoothProgress = useRef(0);
  const position = useRef(new THREE.Vector3());
  const lookAt = useRef(new THREE.Vector3());
  const reducedMotion = useReducedMotion();

  useFrame(({ camera }, delta) => {
    const progress = THREE.MathUtils.clamp(scrollState.progress, 0, 1);

    if (reducedMotion.current) {
      // No smoothing: cut straight to the current stage's shot.
      const stage = stageIndexFor(progress);
      position.current.copy(positionPath.points[stage]);
      lookAt.current.copy(lookAtPath.points[stage]);
    } else {
      smoothProgress.current = THREE.MathUtils.damp(
        smoothProgress.current,
        progress,
        DAMP_LAMBDA,
        delta
      );
      positionPath.getPoint(smoothProgress.current, position.current);
      lookAtPath.getPoint(smoothProgress.current, lookAt.current);
    }

    camera.position.copy(position.current);
    camera.lookAt(lookAt.current);
  });

  return null;
}
