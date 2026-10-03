import * as THREE from "three";

// Points of interest on the car that the camera looks at. Computed from the real car.glb's own
// geometry (see CarModel.tsx's auto-centring) — not guessed: the model is
// centred on X/Z and rested on Y=0 at layout.car.position, nose toward +Z,
// so a local-space point (lx, ly, lz) relative to the model's own bbox
// centre maps to world as (carX - lz, ly, carZ + lx).
export const CAR_CENTER = new THREE.Vector3(0, 0.9, -6.5);
export const FRONT_WHEEL = new THREE.Vector3(0.79, 0.41, -4.93);
export const BONNET = new THREE.Vector3(0, 0.98, -4.74);

// One camera position per stage: Arrive, Inspect, Wheels, Engine,
// Diagnostics, Done. Tweak these to reshape the fly-through.
const ARRIVE: [number, number, number] = [0, 3.4, 32];
const INSPECT: [number, number, number] = [0, 1.6, 4];
const WHEELS: [number, number, number] = [3.46, 0.78, -4.76];
const ENGINE: [number, number, number] = [0, 3.36, -2.69];
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
