"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import scrollState from "@/lib/scrollState";
import { qualityState } from "@/lib/qualityState";
import { perfStats, stageIndexFor } from "./perfStats";

/**
 * Measures every frame of the 3D scene, for the ?perf overlay. Only ever
 * loaded when the URL has ?perf (see Experience.tsx).
 *
 * Two frame callbacks bracket the whole frame: one at the very lowest
 * priority (runs first) and one at the very highest (runs after the
 * post-processing composer has drawn everything). The gap between them is
 * the JavaScript time of the frame; the gap between two "firsts" is the
 * frame's real length, which is what fps is made of.
 *
 * It also keeps a much more detailed per-frame breakdown on
 * window.__apexPerf for the headless measurement script
 * (scripts/qa-perf.mjs): how many draws were transparent, how many went
 * into the shadow map, and how many times the car itself was drawn.
 */

// The car model's own top node (from car.glb), used to tell car draws
// apart from everything else.
const CAR_NODE = "Sketchfab_model";

type Detail = {
  draws: number;
  transparentDraws: number;
  shadowDraws: number;
  shadowTriangles: number;
  carDraws: number;
  carTriangles: number;
  carShadowDraws: number;
  carShadowTriangles: number;
};

function emptyDetail(): Detail {
  return {
    draws: 0,
    transparentDraws: 0,
    shadowDraws: 0,
    shadowTriangles: 0,
    carDraws: 0,
    carTriangles: 0,
    carShadowDraws: 0,
    carShadowTriangles: 0,
  };
}

function trianglesOf(geometry: THREE.BufferGeometry, group?: { count: number } | null) {
  if (group) return group.count / 3;
  const count = geometry.index ? geometry.index.count : geometry.attributes.position?.count ?? 0;
  return Math.min(count, geometry.drawRange.count) / 3;
}

/** The name of the object, or of its nearest named ancestor. */
function nearestName(object: THREE.Object3D) {
  let owner: THREE.Object3D | null = object;
  while (owner && !owner.name) owner = owner.parent;
  return owner?.name || "(unnamed)";
}

function countLights(scene: THREE.Scene) {
  let lights = 0;
  let punctual = 0;
  let shadowLights = 0;
  scene.traverseVisible((object) => {
    if (!(object instanceof THREE.Light)) return;
    lights += 1;
    if (!(object instanceof THREE.HemisphereLight) && !(object instanceof THREE.AmbientLight)) {
      punctual += 1;
    }
    if (object.castShadow) shadowLights += 1;
  });
  return { lights, punctual, shadowLights };
}

export default function PerfProbe() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  const frameStart = useRef(0);
  const lastStart = useRef(0);
  const lastJs = useRef(0);
  const counting = useRef(emptyDetail());
  const lastDetail = useRef(emptyDetail());
  const lights = useRef({ lights: 0, punctual: 0, shadowLights: 0 });
  const frameCount = useRef(0);

  useEffect(() => {
    // The post-processing composer calls render() several times a frame,
    // and by default each call wipes the counters, leaving only the last
    // (a full-screen quad). Reset by hand once per frame instead.
    gl.info.autoReset = false;

    const context = gl.getContext();
    const debug = context.getExtension("WEBGL_debug_renderer_info");
    if (debug) {
      perfStats.gpu = String(context.getParameter(debug.UNMASKED_RENDERER_WEBGL));
    }

    const carMeshes = new Set<THREE.Object3D>();
    const findCar = () => {
      carMeshes.clear();
      scene.getObjectByName(CAR_NODE)?.traverse((object) => carMeshes.add(object));
    };
    findCar();

    // Count draws by hooking the per-object callbacks three.js already
    // calls: onBeforeRender for every normal draw, onBeforeShadow for every
    // draw into a shadow map. Patched on the prototype so it covers every
    // object, and put back exactly as found when the probe unmounts.
    const proto = THREE.Object3D.prototype;
    const originalBeforeRender = proto.onBeforeRender;
    const originalBeforeShadow = proto.onBeforeShadow;
    const originalRaycast = THREE.Mesh.prototype.raycast;
    const raycasts = { calls: 0, carCalls: 0 };
    const breakdown = { on: false, triangles: {} as Record<string, number> };

    proto.onBeforeRender = function (this: THREE.Object3D, ...args: unknown[]) {
      const detail = counting.current;
      const geometry = args[3] as THREE.BufferGeometry;
      const material = args[4] as THREE.Material;
      const group = args[5] as { count: number } | null;
      detail.draws += 1;
      if (material?.transparent) detail.transparentDraws += 1;
      if (breakdown.on && (this as THREE.Mesh).isMesh) {
        // Which named thing this draw belongs to, for finding where the
        // triangles go. Only gathered when the QA script asks for it.
        const key = `${nearestName(this)} [${material?.type ?? "?"}]`;
        breakdown.triangles[key] = (breakdown.triangles[key] ?? 0) + trianglesOf(geometry, group);
      }
      if (carMeshes.has(this) && (this as THREE.Mesh).isMesh) {
        detail.carDraws += 1;
        detail.carTriangles += trianglesOf(geometry, group);
      }
    } as typeof proto.onBeforeRender;

    proto.onBeforeShadow = function (this: THREE.Object3D, ...args: unknown[]) {
      const detail = counting.current;
      const geometry = args[4] as THREE.BufferGeometry;
      const group = args[6] as { count: number } | null;
      const triangles = (this as THREE.Mesh).isMesh ? trianglesOf(geometry, group) : 0;
      detail.shadowDraws += 1;
      detail.shadowTriangles += triangles;
      if (carMeshes.has(this)) {
        detail.carShadowDraws += 1;
        detail.carShadowTriangles += triangles;
      }
    } as typeof proto.onBeforeShadow;

    THREE.Mesh.prototype.raycast = function (this: THREE.Mesh, ...args) {
      raycasts.calls += 1;
      if (carMeshes.has(this)) raycasts.carCalls += 1;
      return originalRaycast.apply(this, args);
    };

    // For scripts/qa-perf.mjs. Read-only snapshots; nothing here changes
    // what is drawn.
    (window as unknown as { __apexPerf?: unknown }).__apexPerf = {
      snapshot: () => ({
        ...perfStats.latest,
        ...lastDetail.current,
        ...lights.current,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        programs: gl.info.programs?.length ?? 0,
        shadowAutoUpdate: gl.shadowMap.autoUpdate,
        shadowsEnabled: gl.shadowMap.enabled,
        frame: frameCount.current,
      }),
      raycasts,
      refindCar: findCar,
      // For poking at the live scene from a debugging script.
      gl,
      scene,
      breakdown,
    };

    return () => {
      gl.info.autoReset = true;
      proto.onBeforeRender = originalBeforeRender;
      proto.onBeforeShadow = originalBeforeShadow;
      THREE.Mesh.prototype.raycast = originalRaycast;
      delete (window as unknown as { __apexPerf?: unknown }).__apexPerf;
    };
  }, [gl, scene]);

  // First thing in the frame: close out the previous one.
  useFrame(() => {
    const now = performance.now();
    const interval = lastStart.current ? now - lastStart.current : 0;
    lastStart.current = now;
    frameStart.current = now;
    frameCount.current += 1;

    // Recounted often enough to track lights appearing as the scene loads,
    // rarely enough that the count itself costs nothing measurable.
    if (frameCount.current % 5 === 1) lights.current = countLights(scene);

    const sample = {
      intervalMs: interval,
      jsMs: lastJs.current,
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      stage: stageIndexFor(THREE.MathUtils.clamp(scrollState.progress, 0, 1)),
      pixelRatio: gl.getPixelRatio(),
      quality: qualityState.level,
    };
    perfStats.record(sample);
    perfStats.latest = {
      ...sample,
      lights: lights.current.lights,
      shadowLights: lights.current.shadowLights,
    };

    lastDetail.current = counting.current;
    counting.current = emptyDetail();
    gl.info.reset();
  }, -1000);

  // Last thing in the frame, after everything has been drawn.
  useFrame(() => {
    lastJs.current = performance.now() - frameStart.current;
  }, 1000);

  return null;
}
