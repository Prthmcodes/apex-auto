"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { theme } from "./theme";
import { layout } from "./layout";
import { siteContent } from "@/content/site";
import { add, group, mergeByMaterial } from "./buildTree";
import { exteriorTexture, makeLightSprite } from "./exteriorTextures";
import { isLowEndDevice } from "@/lib/deviceQuality";

/**
 * The ground outside the building, and enough of the surroundings that the
 * garage isn't a lit box floating in a void: a concrete apron in front of
 * the shutter, the clutter a working forecourt collects, a palisade fence
 * and the silhouettes of the units either side, and a street lamp.
 *
 * PLACEMENT RULE, checked against the camera curve rather than guessed.
 * The camera comes in from (2.4, 1.45, 13) to (0, 1.55, 3) and then
 * through the door, so outside the building it only ever occupies roughly
 * x -0.2 to 2.5, z 3 to 13. Nothing solid goes in that corridor: the
 * forecourt clutter all sits at x < -3.5 or x > 4.5, and anything inside
 * the corridor is painted flat on the ground, where it can't get in the
 * way. See PROGRESS.md for the measured figures.
 */

const { z: FACE, minX, maxX } = layout.facade;
const bay = layout.secondBay;

// ---------------------------------------------------------------------------

const geometry = {
  tyre: new THREE.TorusGeometry(0.32, 0.11, 8, 20),
  bollard: new THREE.CylinderGeometry(0.085, 0.095, 0.92, 10),
  bollardBand: new THREE.CylinderGeometry(0.092, 0.092, 0.11, 10),
  bollardBase: new THREE.CylinderGeometry(0.14, 0.15, 0.06, 10),
  signBoard: new THREE.PlaneGeometry(0.6, 0.75),
  signBack: new THREE.BoxGeometry(0.62, 0.77, 0.035),
  signHinge: new THREE.CylinderGeometry(0.022, 0.022, 0.6, 8).rotateZ(Math.PI / 2),
  grateFrame: new THREE.BoxGeometry(0.56, 0.05, 0.4),
  grateBar: new THREE.BoxGeometry(0.46, 0.02, 0.025),
  blob: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
  pool: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),

  fencePale: new THREE.BoxGeometry(0.045, 1.95, 0.03),
  fenceRail: new THREE.BoxGeometry(0.04, 0.07, 1),
  fencePost: new THREE.BoxGeometry(0.09, 2.15, 0.09),

  lampColumn: new THREE.CylinderGeometry(0.07, 0.095, 6.1, 8),
  lampArm: new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8).rotateZ(Math.PI / 2),
  lampHead: new THREE.BoxGeometry(0.52, 0.14, 0.26),
  lampLens: new THREE.PlaneGeometry(0.44, 0.2).rotateX(Math.PI / 2),
};

function buildMaterials() {
  const blob = exteriorTexture.blobMask();

  return {
    apron: new THREE.MeshStandardMaterial({
      color: theme.apron,
      roughness: 0.86,
      metalness: 0,
    }),
    // A puddle is a hole in the tarmac full of sky. Nearly smooth, so it
    // picks up the dusk environment map as a reflection; the blob mask
    // gives it an edge instead of the perfect circle of a bare disc.
    // Part see-through and not quite black: fully opaque near-black, the
    // dusk reflection was too dim to show, and the one at the right edge of
    // the opening shot read as a black hole cut in the frame.
    puddle: new THREE.MeshStandardMaterial({
      color: "#1a212c",
      roughness: 0.12,
      metalness: 0.2,
      alphaMap: blob,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
    oil: new THREE.MeshStandardMaterial({
      color: "#17181a",
      roughness: 0.34,
      metalness: 0.1,
      alphaMap: blob,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    }),
    rubber: new THREE.MeshStandardMaterial({ color: theme.rubber, roughness: 0.92 }),
    yellow: new THREE.MeshStandardMaterial({ color: theme.safetyYellow, roughness: 0.68 }),
    dark: new THREE.MeshStandardMaterial({ color: theme.chestCharcoal, roughness: 0.72 }),
    steel: new THREE.MeshStandardMaterial({
      color: theme.fenceSteel,
      roughness: 0.6,
      metalness: 0.45,
    }),
    reflective: new THREE.MeshStandardMaterial({
      color: "#dfe4ea",
      roughness: 0.35,
      metalness: 0.2,
    }),
    signBoard: new THREE.MeshStandardMaterial({
      map: exteriorTexture.pavementSign(
        siteContent.exterior.pavementSign.line1,
        siteContent.exterior.pavementSign.line2
      ),
      roughness: 0.78,
    }),
    lampPost: new THREE.MeshStandardMaterial({
      color: theme.lampPost,
      roughness: 0.68,
      metalness: 0.3,
    }),
    lamp: new THREE.MeshStandardMaterial({
      color: theme.floodLens,
      emissive: new THREE.Color(theme.floodLens),
      emissiveIntensity: 1.4,
      toneMapped: false,
    }),
    // Near-background boxes. They exist to break the horizon, not to be
    // looked at, so they are barely lighter than the sky behind them.
    neighbour: new THREE.MeshStandardMaterial({
      color: theme.neighbourUnit,
      roughness: 0.95,
    }),
    pool: makeLightSprite(theme.floodLens, 0.34),
  };
}

type Materials = ReturnType<typeof buildMaterials>;

// ---------------------------------------------------------------------------

/** The oil-stained concrete apron in front of the doors. */
function buildApron(root: THREE.Object3D, m: Materials, detailed: boolean) {
  const depth = 5.2;
  add(root, geometry.blob, m.apron, {
    position: [(minX + maxX) / 2, 0.005, FACE + depth / 2],
    scale: [maxX - minX, 1, depth],
  });

  // Years of cars standing in the same two places.
  const stains: [number, number, number][] = [
    [0.3, 1.5, 2.1],
    [-1.2, 2.9, 1.5],
    [1.6, 3.4, 1.1],
    [bay.shutter.centerX, 1.9, 1.6],
  ];
  // The big one in front of the door earns its place on any device; the
  // smaller ones are detail you only read standing still.
  for (const [x, z, size] of detailed ? stains : stains.slice(0, 1)) {
    add(root, geometry.blob, m.oil, {
      position: [x, 0.007, FACE + z],
      scale: [size, 1, size * 0.78],
    });
  }
}

/** The apron ends; beyond it the tarmac is wet and holding a few puddles. */
function buildPuddles(root: THREE.Object3D, m: Materials, detailed: boolean) {
  const puddles: [number, number, number][] = [
    [-3.8, 7.4, 2.6],
    [6.6, 6.8, 2.2],
    [-6.6, 11.0, 3.1],
    [8.8, 10.4, 2.4],
    [-1.4, 13.6, 1.8],
  ];
  // On a phone, keep only the big ones: a small puddle at this distance is
  // a few pixels of dark, and every transparent surface costs a pass.
  for (const [x, z, size] of puddles.filter((p) => detailed || p[2] >= 2.5)) {
    add(root, geometry.blob, m.puddle, {
      position: [x, 0.009, z],
      scale: [size, 1, size * 0.62],
    });
  }
}

function buildTyreStack(root: THREE.Object3D, m: Materials) {
  // Against the wall on the left, well clear of the door and the camera.
  for (let i = 0; i < 4; i += 1) {
    add(root, geometry.tyre, m.rubber, {
      position: [-4.3, 0.12 + i * 0.21, FACE + 0.8],
      rotation: [Math.PI / 2, 0, i * 0.7],
    });
  }
  add(root, geometry.tyre, m.rubber, {
    position: [-3.6, 0.33, FACE + 1.15],
    rotation: [Math.PI / 2, 0.25, 0.9],
  });
}

function buildBollards(root: THREE.Object3D, m: Materials) {
  // One either side of the main shutter, where they stop a reversing car
  // taking the jamb off.
  for (const x of [-4.55, 4.7]) {
    const g = group(root, { position: [x, 0, FACE + 1.35] });
    add(g, geometry.bollardBase, m.dark, { position: [0, 0.03, 0] });
    add(g, geometry.bollard, m.yellow, { position: [0, 0.52, 0] });
    add(g, geometry.bollardBand, m.reflective, { position: [0, 0.82, 0] });
  }
}

/** The A-frame board on the forecourt. */
function buildPavementSign(root: THREE.Object3D, m: Materials) {
  // Turned a little towards the street so it can actually be read.
  const g = group(root, { position: [5.35, 0, FACE + 2.7], rotation: [0, -0.3, 0] });
  for (const side of [1, -1]) {
    const leaf = group(g, { position: [0, 0.42, side * 0.12], rotation: [side * 0.16, 0, 0] });
    add(leaf, geometry.signBack, m.dark);
    // Only the street-facing leaf carries the artwork; the back of an
    // A-frame is just a board.
    add(leaf, geometry.signBoard, side === 1 ? m.signBoard : m.dark, {
      position: [0, 0, side * 0.02],
      rotation: [0, side === 1 ? 0 : Math.PI, 0],
    });
  }
  add(g, geometry.signHinge, m.dark, { position: [0, 0.82, 0] });
}

function buildDrain(root: THREE.Object3D, m: Materials) {
  const g = group(root, { position: [6.4, 0.012, FACE + 3.8] });
  add(g, geometry.grateFrame, m.dark);
  for (let i = 0; i < 5; i += 1) {
    add(g, geometry.grateBar, m.steel, { position: [0, 0.02, -0.14 + i * 0.07] });
  }
}

/**
 * A palisade fence down the left-hand boundary.
 *
 * The pales are an InstancedMesh rather than merged geometry: there are
 * 130-odd identical ones, and instancing draws them all in a single call
 * while storing the shape exactly once. Note this has to stay OUT of the
 * merge tree — `mergeByMaterial` would bake the base geometry once and
 * silently throw every instance away.
 */
function buildFencePales(material: THREE.Material) {
  const x = -7.4;
  const startZ = -2;
  const endZ = 21;
  const pitch = 0.17;
  const count = Math.floor((endZ - startZ) / pitch);

  const mesh = new THREE.InstancedMesh(geometry.fencePale, material, count);
  mesh.name = "palisade pales";
  const transform = new THREE.Matrix4();
  for (let i = 0; i < count; i += 1) {
    transform.makeTranslation(x, 0.98, startZ + i * pitch);
    mesh.setMatrixAt(i, transform);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

/** The fence's rails and posts, which aren't repeated often enough to instance. */
function buildFenceFrame(root: THREE.Object3D, m: Materials) {
  const x = -7.4;
  for (const y of [0.45, 1.5]) {
    add(root, geometry.fenceRail, m.steel, {
      position: [x, y, 9.5],
      scale: [1, 1, 23],
    });
  }
  for (let z = -2; z <= 21; z += 2.6) {
    add(root, geometry.fencePost, m.steel, { position: [x, 1.07, z] });
  }
}

/** The units either side, as flat dark shapes on the horizon. */
function buildNeighbours(root: THREE.Object3D, m: Materials) {
  // Next door on the right: a taller unit, seen end-on.
  add(root, new THREE.BoxGeometry(13.5, 5.4, 13), m.neighbour, {
    position: [17.4, 2.7, -4.5],
  });
  // And the terrace continuing away on the left, behind the fence.
  add(root, new THREE.BoxGeometry(13, 4.6, 11), m.neighbour, {
    position: [-15.5, 2.3, -6.5],
  });
}

function buildStreetLamp(root: THREE.Object3D, m: Materials) {
  const x = -6.1;
  const z = 7.2;
  const g = group(root, { position: [x, 0, z] });
  add(g, geometry.lampColumn, m.lampPost, { position: [0, 3.05, 0] });
  add(g, geometry.lampArm, m.lampPost, { position: [0.58, 6.0, 0], rotation: [0, 0, 0.22] });
  add(g, geometry.lampHead, m.lampPost, { position: [1.16, 6.05, 0] });
  add(g, geometry.lampLens, m.lamp, { position: [1.16, 5.96, 0] });

  // The pool it throws, which is most of why it's here: it puts a lit
  // patch of wet tarmac between the camera and the building.
  add(root, geometry.pool, m.pool, {
    position: [x + 1.16, 0.015, z],
    scale: [9.5, 1, 9.5],
  });
}

// ---------------------------------------------------------------------------

export default function Forecourt() {
  const built = useMemo(() => {
    const detailed = !isLowEndDevice();
    const m = buildMaterials();
    const root = new THREE.Group();

    buildApron(root, m, detailed);
    buildPuddles(root, m, detailed);
    buildTyreStack(root, m);
    buildBollards(root, m);
    buildPavementSign(root, m);
    buildNeighbours(root, m);
    buildStreetLamp(root, m);
    if (detailed) {
      buildDrain(root, m);
      buildFenceFrame(root, m);
    }

    const merged = mergeByMaterial(root, "forecourt (merged)");
    if (detailed) merged.add(buildFencePales(m.steel));
    return merged;
  }, []);

  return <primitive object={built} />;
}
