"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import scrollState from "@/lib/scrollState";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { siteContent } from "@/content/site";
import { positionPath, lookAtPath } from "./cameraPath";
import { layout } from "./layout";

// How quickly the eased scroll progress catches up to the raw value.
// Higher = snappier, lower = floatier. See THREE.MathUtils.damp.
const DAMP_LAMBDA = 6;

// Every stage's camera position/look-at was framed assuming roughly this
// much HORIZONTAL field of view. `fov` on a PerspectiveCamera is vertical,
// so on a narrow/portrait viewport (aspect < 1) the horizontal FOV is much
// smaller than this for the same vertical fov — wide shots like the
// diagnostics side-view or the arrival establishing shot don't fit. Widen
// the vertical fov on narrow viewports to keep the horizontal framing
// consistent; leave landscape/square viewports (aspect >= 1) alone, since
// that's what the stage positions were actually tuned against.
const BASE_FOV = 50;

function applyResponsiveFov(camera: THREE.Camera) {
  if (!(camera instanceof THREE.PerspectiveCamera)) return;
  const aspect = camera.aspect || 1;
  const targetFov =
    aspect < 1
      ? THREE.MathUtils.radToDeg(
          2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(BASE_FOV) / 2) / aspect)
        )
      : BASE_FOV;

  if (Math.abs(camera.fov - targetFov) > 0.01) {
    camera.fov = targetFov;
    camera.updateProjectionMatrix();
  }
}

// A slow breath on the opening shot, so the page doesn't look like a
// photograph while the visitor reads the first caption. Deliberately
// under-done: a fifth of a metre at periods of half a minute, which is
// enough to feel alive and not enough to notice as movement. It fades out
// over the first sixth of the scroll, so by the time the camera is lining
// up on the car every stage is framed exactly as authored.
const DRIFT_FADE_END = 0.16;
const DRIFT = [
  { amplitude: 0.18, period: 23, phase: 0.0 }, // x
  { amplitude: 0.07, period: 31, phase: 1.3 }, // y
  { amplitude: 0.25, period: 37, phase: 2.1 }, // z
];

function driftWeight(progress: number) {
  const t = THREE.MathUtils.clamp(1 - progress / DRIFT_FADE_END, 0, 1);
  return t * t * (3 - 2 * t); // smoothstep, so it eases out rather than stops
}

// Keeping the horizontal field of view fixed is right for every shot but
// the establishing one. A phone is tall, so the same horizontal framing
// comes with a 90-degree VERTICAL field — and from 14.8m back that left
// the building as a thin band across the middle with empty sky above it
// and empty tarmac below. Portrait viewports stand closer instead.
//
// 10.5m is not a taste call: it is as close as the camera can get while
// the whole fascia, which is about 8.1m of lettering, still fits inside a
// 50-degree horizontal frame (2 x 10.5 x tan 25 = 9.8m, so 0.85m spare
// each side). Any nearer and the sign starts losing its ends.
const NARROW_ARRIVE_DISTANCE = 10.5;

function narrowPullIn(camera: THREE.Camera, facadeZ: number) {
  if (!(camera instanceof THREE.PerspectiveCamera)) return 0;
  if ((camera.aspect || 1) >= 1) return 0;
  const authored = positionPath.points[0].z - facadeZ;
  return Math.max(0, authored - NARROW_ARRIVE_DISTANCE);
}

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
  // Our own clock for the drift, rather than three's: THREE.Clock is
  // deprecated, and summing the frame deltas we're already handed needs
  // nothing from it.
  const elapsed = useRef(0);

  useFrame(({ camera }, delta) => {
    applyResponsiveFov(camera);

    const progress = THREE.MathUtils.clamp(scrollState.progress, 0, 1);

    const pullIn = narrowPullIn(camera, layout.facade.z);

    if (reducedMotion.current) {
      // No smoothing: cut straight to the current stage's shot.
      const stage = stageIndexFor(progress);
      position.current.copy(positionPath.points[stage]);
      lookAt.current.copy(lookAtPath.points[stage]);
      // Applied here too, not just on the eased path, so that what the QA
      // screenshots capture (they force reduced motion, for determinism)
      // is the framing a real phone gets.
      if (stage === 0) position.current.z -= pullIn;
    } else if (scrollState.teleport) {
      // The QA script jumped the scroll somewhere; land there immediately
      // rather than easing, so a screenshot taken straight after is of the
      // shot that progress actually names. Nothing but QA sets this.
      scrollState.teleport = false;
      smoothProgress.current = progress;
      positionPath.getPoint(progress, position.current);
      lookAtPath.getPoint(progress, lookAt.current);
      position.current.z -= pullIn * driftWeight(progress);
    } else {
      smoothProgress.current = THREE.MathUtils.damp(
        smoothProgress.current,
        progress,
        DAMP_LAMBDA,
        delta
      );
      positionPath.getPoint(smoothProgress.current, position.current);
      lookAtPath.getPoint(smoothProgress.current, lookAt.current);

      elapsed.current += delta;
      const weight = driftWeight(smoothProgress.current);
      // Eased out over the same stretch as the drift, so by the time the
      // camera lines up on the car it is back on the authored path.
      position.current.z -= pullIn * weight;
      if (weight > 0) {
        const time = elapsed.current;
        const [x, y, z] = DRIFT.map(
          ({ amplitude, period, phase }) =>
            Math.sin((time / period) * Math.PI * 2 + phase) * amplitude * weight
        );
        position.current.x += x;
        position.current.y += y;
        position.current.z += z;
        // The gaze drifts a fraction of the camera's own movement rather
        // than staying pinned, which reads as a slow breath instead of the
        // sideways slide you get when the look-at target is nailed down.
        lookAt.current.x += x * 0.35;
        lookAt.current.y += y * 0.35;
      }
    }

    camera.position.copy(position.current);
    camera.lookAt(lookAt.current);
  });

  return null;
}
