import * as THREE from "three";

// Points of interest in the scene, shared by the camera's look-at path and
// the glowing marker dots on the car.
export const CAR_CENTER = new THREE.Vector3(0, 0.75, -6.5);
export const FRONT_WHEEL = new THREE.Vector3(0.78, 0.45, -5.2);
export const BONNET = new THREE.Vector3(0, 0.65, -5.1);

// One camera position per stage: Arrive, Inspect, Wheels, Engine,
// Diagnostics, Done. Tweak these to reshape the fly-through.
const ARRIVE: [number, number, number] = [0, 3.4, 32];
const INSPECT: [number, number, number] = [0, 1.6, 4];
const WHEELS: [number, number, number] = [2.0, 0.6, -5.0];
const ENGINE: [number, number, number] = [0, 2.3, -4.0];
const DIAGNOSTICS: [number, number, number] = [3.3, 1.3, -6.5];
const DONE: [number, number, number] = [0, 1.7, 9];

export const START_POSITION = ARRIVE;

const STAGE_POSITIONS = [ARRIVE, INSPECT, WHEELS, ENGINE, DIAGNOSTICS, DONE];

// A gentler set of look-at targets, so the camera's gaze eases between
// stages instead of snapping straight at each one.
const STAGE_LOOK_ATS = [
  new THREE.Vector3(0, 2.0, -4),
  CAR_CENTER,
  FRONT_WHEEL,
  BONNET,
  CAR_CENTER,
  new THREE.Vector3(0, 1.9, -2),
];

// Scroll progress (0 to 1) is passed straight into getPoint() on both
// curves. With 6 control points that divides into 5 equal segments, so
// each stage's exact camera position is reached at progress 0, 0.2, 0.4,
// 0.6, 0.8 and 1 in turn — matching the stage ranges in site.ts.
export const positionPath = new THREE.CatmullRomCurve3(
  STAGE_POSITIONS.map((point) => new THREE.Vector3(...point))
);

export const lookAtPath = new THREE.CatmullRomCurve3(STAGE_LOOK_ATS);
