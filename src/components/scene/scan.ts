import * as THREE from "three";
import { siteContent } from "@/content/site";

// The diagnostics scan sweeps along the car's local length axis, from the
// front bumper to the rear bumper, during the "diagnostics" stage only.
export const SCAN_STAGE_RANGE = siteContent.stages[4].range;
export const SCAN_FRONT_X = 2.3;
export const SCAN_REAR_X = -2.3;

/** The scan plane's local X position for a given overall scroll progress. */
export function scanPositionX(progress: number) {
  const [start, end] = SCAN_STAGE_RANGE;
  const t = THREE.MathUtils.clamp((progress - start) / (end - start), 0, 1);
  return THREE.MathUtils.lerp(SCAN_FRONT_X, SCAN_REAR_X, t);
}

/**
 * 0 to 1: how much the scan has swept past a part at local X `partX`.
 * Before the diagnostics stage starts, nothing has been scanned yet (0).
 * After it ends, everything stays scanned (1).
 */
export function scanPassed(progress: number, partX: number, width = 0.4) {
  const [start, end] = SCAN_STAGE_RANGE;
  if (progress < start) return 0;
  if (progress > end) return 1;
  const scanX = scanPositionX(progress);
  return THREE.MathUtils.clamp((partX - scanX) / width + 0.5, 0, 1);
}
