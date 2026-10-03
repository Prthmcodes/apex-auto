import * as THREE from "three";
import { layout } from "./layout";
import { RISE_FIRST_START, RISE_LENGTH, RISE_STAGGER } from "./toolTiming";

// Where the tool chest stands, and how the six tools come out of it.
//
// Shared by ToolChest.tsx (which slides the drawers) and FloatingTools.tsx
// (which lifts the tools out), so the two can't drift apart: a drawer and
// the tool in it read the exact same number.

type Vec3 = [number, number, number];

const { width: garageWidth, backZ } = layout.garage;
const wallThickness = 0.3;

export const CHEST = {
  // Against the left-hand wall, inside it by half the chest's depth. The
  // "wheels" and "diagnostics" cameras both sit out to the right, so the
  // left wall is the one side that's on screen without the chest ever
  // getting between the camera and the car.
  x: -garageWidth / 2 + wallThickness + 0.3,
  // Towards the back wall. The doorway is only 4.4m wide, so from outside
  // it acts as a letterbox: close to the door barely any of the side walls
  // is in view, and the further back something sits the more of the
  // workshop's full width can be seen through the opening. At this depth
  // the chest clears both the door pillar and the back of the car.
  z: backZ + 1.4,
  width: 1.15, // along Z, the wall's run
  depth: 0.56, // along X, out from the wall
  height: 0.98,
  drawers: 6,
  toeKick: 0.07,
  topThickness: 0.035,
} as const;

/** How far a drawer travels when fully open. */
export const DRAWER_TRAVEL = 0.3;

/** The vertical centre of drawer `index`, in the chest's own space. */
export function drawerCentreY(index: number) {
  const usable = CHEST.height - CHEST.toeKick - CHEST.topThickness;
  const pitch = usable / CHEST.drawers;
  return CHEST.toeKick + pitch * (index + 0.5);
}

export function drawerHeight() {
  const usable = CHEST.height - CHEST.toeKick - CHEST.topThickness;
  return usable / CHEST.drawers - 0.012;
}

/**
 * Where tool `index` sits while it's still in its drawer: just above the
 * open drawer, out at the front edge, so it rises straight up out of it.
 */
export function chestSlot(index: number): Vec3 {
  return [
    CHEST.x + CHEST.depth / 2 + DRAWER_TRAVEL * 0.55,
    drawerCentreY(index) + 0.05,
    CHEST.z,
  ];
}

// The rise timing lives in toolTiming.ts, which has no three.js import, so
// the HTML overlay can read it without pulling in the 3D bundle.
export { RISE_START } from "./toolTiming";

/**
 * 0 while tool `index` is still shut in its drawer, 1 once it's fully out
 * and flying. Driven by scroll position only, so scrolling back up puts
 * every tool neatly back in its drawer.
 */
export function toolRise(progress: number, index: number, reducedMotion: boolean) {
  const start = RISE_FIRST_START + index * RISE_STAGGER;
  if (reducedMotion) {
    // No sliding or lifting: the tool is simply there (or not).
    return progress >= start ? 1 : 0;
  }
  return THREE.MathUtils.smoothstep(progress, start, start + RISE_LENGTH);
}

/** How far drawer `index` is pulled out, 0 to 1. */
export function drawerOpen(progress: number, index: number, reducedMotion: boolean) {
  if (reducedMotion) return 0;
  const rise = toolRise(progress, index, reducedMotion);
  // The drawer runs ahead of the tool and shuts again behind it, so the
  // chest doesn't end up standing wide open for the rest of the page.
  return Math.sin(THREE.MathUtils.clamp(rise, 0, 1) * Math.PI) * 0.85 + rise * 0.15;
}
