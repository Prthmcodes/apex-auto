"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { layout } from "./layout";

const { frontZ, door, shutterOpenFraction } = layout.garage;

// The inner face of the front wall; the camera counts as inside past it.
const INNER_FACE_Z = frontZ - 0.15;
// A little extra all round the doorway, for safety: better to draw the
// outside for a frame it isn't needed than to miss one where it is.
const MARGIN = 0.15;

// The open part of the doorway, under the two-thirds-open shutter: the
// only way to see out of the bay.
const doorway = new THREE.Box3(
  new THREE.Vector3(-door.width / 2 - MARGIN, -MARGIN, INNER_FACE_Z - MARGIN),
  new THREE.Vector3(
    door.width / 2 + MARGIN,
    door.height * shutterOpenFraction + MARGIN,
    layout.facade.z + MARGIN
  )
);

/** Scene.tsx gives the group of outside things this name. */
export const OUTSIDE_GROUP = "outside (sky, street front, forecourt)";

const frustum = new THREE.Frustum();
const viewProjection = new THREE.Matrix4();

/**
 * Hides everything outside the building — sky, tarmac, the street front
 * and the forecourt — while the camera is inside the bay AND the doorway
 * is out of shot. Nothing can be seen out there except through the open
 * door, so this can never make anything visible disappear: it's checked
 * against the real camera every frame, for whatever screen shape the
 * visitor has, rather than switched on and off by scroll position.
 *
 * Placed after CameraRig in Scene.tsx so it sees this frame's camera, not
 * the last one.
 */
export default function OutsideVisibility() {
  const group = useRef<THREE.Object3D | null>(null);

  useFrame(({ camera, scene }) => {
    group.current ??= scene.getObjectByName(OUTSIDE_GROUP) ?? null;
    const outside = group.current;
    if (!outside) return;

    let visible = true;
    if (camera.position.z < INNER_FACE_Z) {
      camera.updateMatrixWorld();
      viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(viewProjection);
      visible = frustum.intersectsBox(doorway);
    }
    if (outside.visible !== visible) outside.visible = visible;
  });

  return null;
}
