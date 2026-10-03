import * as THREE from "three";
import { siteContent } from "@/content/site";
import { bandOpacity, hardBand } from "./stageFade";

// Scroll timing for everything that happens on or around the car, in one
// place so the paint shader, engine bay, labels and tools stay in sync.
export const WHEELS_RANGE = siteContent.stages[2].range;
export const ENGINE_RANGE = siteContent.stages[3].range;
export const DIAGNOSTICS_RANGE = siteContent.stages[4].range;

/** 0 to 1: how see-through the bonnet is (and so how visible the bay is). */
export function engineReveal(progress: number, reducedMotion: boolean) {
  return reducedMotion
    ? hardBand(progress, ENGINE_RANGE)
    : bandOpacity(progress, ENGINE_RANGE, 0.05);
}

/**
 * 0 to 1: how strongly check point `index` (of `count`) is highlighted.
 * The engine stage is split into equal slots, one per check, each ramping
 * up and back down in turn, so they light up one after another as you
 * scroll. Driven by scroll position, not time, so it never plays by itself.
 */
export function checkHighlight(progress: number, index: number, count: number) {
  const [start, end] = ENGINE_RANGE;
  const t = (progress - start) / (end - start);
  const first = 0.08;
  const slot = (1 - first * 2) / count;
  const centre = first + slot * (index + 0.5);
  const distance = Math.abs(t - centre) / (slot * 0.75);
  return THREE.MathUtils.smoothstep(1 - distance, 0, 1);
}
