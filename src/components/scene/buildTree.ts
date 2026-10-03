// Shared helpers for the scene's static dressing.
//
// The dressing (the workshop props inside, the building and forecourt
// outside) is laid out as a plain three.js tree rather than as JSX, so that
// once it is built every mesh sharing a material can be baked into a single
// merged mesh. None of it ever moves, so there is no reason to pay for
// hundreds of separate draw calls on every frame.
//
// This was lifted out of WorkshopProps.tsx when the exterior needed exactly
// the same machinery — one copy, so the two can't drift apart.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Place = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
};

function place(object: THREE.Object3D, at: Place) {
  if (at.position) object.position.fromArray(at.position);
  if (at.rotation) object.rotation.fromArray(at.rotation);
  if (typeof at.scale === "number") object.scale.setScalar(at.scale);
  else if (at.scale) object.scale.fromArray(at.scale);
  return object;
}

/** Adds one mesh to `parent`, in the same shape as the JSX it replaced. */
export function add(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  at: Place = {}
) {
  const mesh = place(new THREE.Mesh(geometry, material), at) as THREE.Mesh;
  parent.add(mesh);
  return mesh;
}

/** A child group, for things that are easier to position as a unit. */
export function group(parent: THREE.Object3D, at: Place = {}) {
  const node = place(new THREE.Group(), at) as THREE.Group;
  parent.add(node);
  return node;
}

/**
 * An upright wall panel whose UVs are measured in METRES rather than
 * 0-to-1, so a tiling texture keeps a consistent real-world size however
 * big or small the panel is. `tile` is how much of the wall one repeat of
 * the texture covers.
 *
 * Without this, a 1.8m pillar and a 14m elevation sharing one texture would
 * show blocks of wildly different sizes — the usual giveaway that a
 * building was textured by someone in a hurry.
 */
export function panelGeometry(
  width: number,
  height: number,
  tile: { width: number; height: number },
  offset: { u?: number; v?: number } = {}
) {
  const geometry = new THREE.PlaneGeometry(width, height);
  const uv = geometry.attributes.uv;
  const su = width / tile.width;
  const sv = height / tile.height;
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, uv.getX(i) * su + (offset.u ?? 0), uv.getY(i) * sv + (offset.v ?? 0));
  }
  uv.needsUpdate = true;
  return geometry;
}

/**
 * Bakes a built tree down to one mesh per material, with every transform
 * already applied to the vertices.
 *
 * This matters far more than the triangle count ever did: as separate
 * meshes a hundred little props are a hundred extra draw calls every
 * frame, and per-draw cost is exactly what dominates when there is no GPU
 * and the browser is rasterising on the CPU, as in the headless QA runs.
 */
export function mergeByMaterial(root: THREE.Object3D, name: string) {
  root.updateWorldMatrix(true, true);

  const byMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const baked = child.geometry.clone().applyMatrix4(child.matrixWorld);
    // Merging needs every geometry to carry exactly the same attributes.
    for (const attribute of Object.keys(baked.attributes)) {
      if (attribute !== "position" && attribute !== "normal" && attribute !== "uv") {
        baked.deleteAttribute(attribute);
      }
    }
    const list = byMaterial.get(child.material as THREE.Material);
    if (list) list.push(baked);
    else byMaterial.set(child.material as THREE.Material, [baked]);
  });

  const merged = new THREE.Group();
  merged.name = name;
  for (const [material, geometries] of byMaterial) {
    const combined = mergeGeometries(geometries, false);
    for (const geometry of geometries) geometry.dispose();
    if (!combined) continue;
    const mesh = new THREE.Mesh(combined, material);
    // Static dressing: it never moves, so three.js can skip its matrix work.
    mesh.matrixAutoUpdate = false;
    // Neither casting nor receiving shadows. These are background objects,
    // and shadow sampling is a per-pixel cost across a lot of screen for
    // something nobody looks at. The car and the bay it stands in still
    // cast and receive normally.
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    merged.add(mesh);
  }
  return merged;
}
