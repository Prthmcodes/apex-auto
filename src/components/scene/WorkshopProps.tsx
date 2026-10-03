"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { theme } from "./theme";
import { layout } from "./layout";
import { isLowEndDevice } from "@/lib/deviceQuality";

// Dressing for the workshop: the things a real garage has lying around.
//
// Placement rule, checked against the actual camera curve rather than
// guessed: inside the garage the camera only ever occupies x 0 to 3.51,
// z -6.5 to -1.6. So the whole left-hand side is free, anything past
// z = -7 is free whatever its x, and the right-hand wall gets only flat,
// shallow things kept above or below the camera's eyeline.
//
// Everything here is procedural and deliberately a little duller and
// softer-edged than the car, so the car stays the brightest, sharpest
// thing on screen.

const { width: garageWidth, height: garageHeight, backZ, frontZ } = layout.garage;
const wallThickness = 0.3;
const LEFT = -garageWidth / 2 + wallThickness; // inner face of the left wall
const RIGHT = garageWidth / 2 - wallThickness; // inner face of the right wall
const BACK = backZ + wallThickness / 2;

// ---------------------------------------------------------------------------
// Shared geometry and materials, built once at module load.

const geometry = {
  panel: new THREE.BoxGeometry(0.04, 1.5, 2.4),
  benchTop: new THREE.BoxGeometry(0.72, 0.06, 2.1),
  benchLeg: new THREE.BoxGeometry(0.07, 0.86, 0.07),
  benchShelf: new THREE.BoxGeometry(0.6, 0.04, 1.9),
  viceBody: new THREE.BoxGeometry(0.16, 0.13, 0.2),
  viceJaw: new THREE.BoxGeometry(0.05, 0.11, 0.21),
  viceScrew: new THREE.CylinderGeometry(0.014, 0.014, 0.26, 10).rotateZ(Math.PI / 2),
  lampArm: new THREE.CylinderGeometry(0.012, 0.012, 0.5, 8),
  lampShade: new THREE.ConeGeometry(0.11, 0.13, 16, 1, true),
  lampBulb: new THREE.SphereGeometry(0.035, 10, 8),

  tyre: new THREE.TorusGeometry(0.31, 0.105, 10, 24),
  rackUpright: new THREE.BoxGeometry(0.07, 1.9, 0.07),
  rackBar: new THREE.BoxGeometry(0.05, 0.05, 2.3),

  drum: new THREE.CylinderGeometry(0.29, 0.29, 0.86, 20),
  drumRib: new THREE.TorusGeometry(0.292, 0.018, 6, 20).rotateX(Math.PI / 2),
  drumLabel: new THREE.CylinderGeometry(0.295, 0.295, 0.3, 20, 1, true),

  jackBody: new THREE.BoxGeometry(0.72, 0.13, 0.3),
  jackArm: new THREE.BoxGeometry(0.5, 0.07, 0.16),
  jackHandle: new THREE.CylinderGeometry(0.018, 0.018, 0.78, 10),
  jackWheel: new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12).rotateX(Math.PI / 2),
  standLeg: new THREE.CylinderGeometry(0.014, 0.014, 0.42, 6),
  standPost: new THREE.BoxGeometry(0.045, 0.3, 0.045),
  standSaddle: new THREE.BoxGeometry(0.1, 0.03, 0.12),

  liftPost: new THREE.BoxGeometry(0.22, 2.9, 0.26),
  liftBase: new THREE.BoxGeometry(0.46, 0.08, 0.5),
  liftArm: new THREE.BoxGeometry(0.9, 0.09, 0.12),

  stripHousing: new THREE.BoxGeometry(0.17, 0.07, 3.0),
  stripTube: new THREE.BoxGeometry(0.12, 0.03, 2.84),

  reelDrum: new THREE.CylinderGeometry(0.17, 0.17, 0.16, 18).rotateZ(Math.PI / 2),
  reelCheek: new THREE.CylinderGeometry(0.21, 0.21, 0.02, 18).rotateZ(Math.PI / 2),
  hoseCoil: new THREE.TorusGeometry(0.19, 0.022, 8, 22),

  extBody: new THREE.CylinderGeometry(0.075, 0.075, 0.42, 14),
  extNeck: new THREE.CylinderGeometry(0.03, 0.045, 0.07, 10),
  extBracket: new THREE.BoxGeometry(0.03, 0.1, 0.17),

  clockFace: new THREE.CylinderGeometry(0.16, 0.16, 0.035, 20).rotateZ(Math.PI / 2),
  frame: new THREE.BoxGeometry(0.03, 0.56, 0.42),
  framePaper: new THREE.PlaneGeometry(0.46, 0.33),

  hangingTool: new THREE.BoxGeometry(0.012, 0.3, 0.05),
  floorStripe: new THREE.PlaneGeometry(0.16, 1).rotateX(-Math.PI / 2),
  stain: new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2),
  trayBase: new THREE.BoxGeometry(0.5, 0.025, 0.36),
  signPlate: new THREE.BoxGeometry(1.5, 0.3, 0.04),
  grime: new THREE.PlaneGeometry(1, 1),
};

const material = {
  pegboard: new THREE.MeshStandardMaterial({ color: theme.pegboard, roughness: 0.9 }),
  bench: new THREE.MeshStandardMaterial({ color: theme.benchTop, roughness: 0.78 }),
  frameSteel: new THREE.MeshStandardMaterial({
    color: theme.chestCharcoal,
    roughness: 0.55,
    metalness: 0.5,
  }),
  steel: new THREE.MeshStandardMaterial({
    color: theme.toolSteel,
    roughness: 0.4,
    metalness: 0.85,
  }),
  rubber: new THREE.MeshStandardMaterial({ color: theme.rubber, roughness: 0.92 }),
  drumBlue: new THREE.MeshStandardMaterial({ color: theme.drumBlue, roughness: 0.6, metalness: 0.3 }),
  drumRed: new THREE.MeshStandardMaterial({ color: theme.drumRed, roughness: 0.62, metalness: 0.3 }),
  // A faded, wordless label band — a generic drum, not a real oil brand.
  drumLabel: new THREE.MeshStandardMaterial({ color: "#b9b2a4", roughness: 0.85, opacity: 0.75, transparent: true }),
  red: new THREE.MeshStandardMaterial({ color: theme.chestRed, roughness: 0.5, metalness: 0.3 }),
  yellow: new THREE.MeshStandardMaterial({ color: theme.safetyYellow, roughness: 0.7 }),
  dark: new THREE.MeshStandardMaterial({ color: theme.chestCharcoal, roughness: 0.7 }),
  lampShade: new THREE.MeshStandardMaterial({
    color: theme.lampShade,
    roughness: 0.6,
    metalness: 0.4,
    side: THREE.DoubleSide,
  }),
  // Lit fittings only — emissive, never a real light. The scene's shadow
  // budget is already spent on the one directional key light.
  lit: new THREE.MeshStandardMaterial({
    color: theme.workshopLight,
    emissive: new THREE.Color(theme.workshopLight),
    emissiveIntensity: 1.1,
    toneMapped: false,
  }),
  accent: new THREE.MeshStandardMaterial({
    color: theme.primary,
    emissive: new THREE.Color(theme.primary),
    emissiveIntensity: 0.5,
    roughness: 0.5,
    toneMapped: false,
  }),
  paper: new THREE.MeshStandardMaterial({ color: "#cdc5b4", roughness: 0.9 }),
  // Oil: not quite black, slightly glossy, so it reads as a wet patch.
  oil: new THREE.MeshStandardMaterial({
    color: "#17181a",
    roughness: 0.3,
    metalness: 0.1,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  }),
  grime: new THREE.MeshBasicMaterial({
    color: theme.wallGrime,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  }),
};

// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Building the props.
//
// These are laid out as a plain three.js tree rather than as JSX, so that
// once it's built every mesh sharing a material can be baked into a single
// merged mesh (see mergeByMaterial below). The dressing is completely
// static — nothing here moves, ever — so there is no reason to pay for a
// hundred separate draw calls every frame.

type Place = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
};

/** Adds one mesh to `parent`, in the same shape as the JSX it replaced. */
function add(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  place: Place = {}
) {
  const mesh = new THREE.Mesh(geometry, material);
  if (place.position) mesh.position.fromArray(place.position);
  if (place.rotation) mesh.rotation.fromArray(place.rotation);
  if (typeof place.scale === "number") mesh.scale.setScalar(place.scale);
  else if (place.scale) mesh.scale.fromArray(place.scale);
  parent.add(mesh);
  return mesh;
}

/** A child group, for things that are easier to place as a unit. */
function group(parent: THREE.Object3D, place: Place = {}) {
  const node = new THREE.Group();
  if (place.position) node.position.fromArray(place.position);
  if (place.rotation) node.rotation.fromArray(place.rotation);
  if (typeof place.scale === "number") node.scale.setScalar(place.scale);
  else if (place.scale) node.scale.fromArray(place.scale);
  parent.add(node);
  return node;
}

function buildPegboard(root: THREE.Object3D, detailed: boolean) {
  const g = group(root, { position: [LEFT + 0.02, 2.0, -4.6] });
  add(g, geometry.panel, material.pegboard);
  if (!detailed) return;
  [-1.0, -0.72, -0.44, -0.12, 0.2, 0.52, 0.84].forEach((z, i) => {
    add(g, geometry.hangingTool, material.frameSteel, {
      position: [0.05, 0.25 - ((i * 53) % 4) * 0.04, z],
      scale: [1, 0.8 + ((i * 37) % 5) * 0.1, 1],
      rotation: [((i % 3) - 1) * 0.08, 0, 0],
    });
  });
}

function buildWorkbench(root: THREE.Object3D, detailed: boolean) {
  const topY = 0.89;
  const g = group(root, { position: [LEFT + 0.4, 0, -4.6] });
  add(g, geometry.benchTop, material.bench, { position: [0, topY, 0] });
  add(g, geometry.benchShelf, material.frameSteel, { position: [0, 0.26, 0] });
  ([[-0.28, -0.95], [0.28, -0.95], [-0.28, 0.95], [0.28, 0.95]] as const).forEach(([x, z]) =>
    add(g, geometry.benchLeg, material.frameSteel, { position: [x, 0.43, z] })
  );

  const vice = group(g, { position: [0.06, topY + 0.07, -0.72] });
  add(vice, geometry.viceBody, material.frameSteel);
  add(vice, geometry.viceJaw, material.steel, { position: [0.1, 0.01, 0] });
  add(vice, geometry.viceScrew, material.steel, { position: [0.2, 0.01, 0] });

  if (!detailed) return;
  add(g, geometry.standSaddle, material.steel, {
    position: [-0.05, topY + 0.05, 0.3],
    rotation: [0, 0.4, 0],
  });
  add(g, geometry.viceJaw, material.frameSteel, {
    position: [0.1, topY + 0.08, 0.62],
    rotation: [0, 0, 0.3],
  });

  const lamp = group(g, { position: [-0.2, topY, 0.95] });
  add(lamp, geometry.lampArm, material.frameSteel, {
    position: [0, 0.25, 0],
    rotation: [0.25, 0, 0.2],
  });
  add(lamp, geometry.lampShade, material.lampShade, {
    position: [0.1, 0.49, 0.12],
    rotation: [Math.PI - 0.5, 0, -0.3],
  });
  add(lamp, geometry.lampBulb, material.lit, { position: [0.1, 0.45, 0.12] });
}

function buildTyres(root: THREE.Object3D) {
  for (let i = 0; i < 4; i += 1) {
    add(root, geometry.tyre, material.rubber, {
      position: [LEFT + 0.55, 0.11 + i * 0.2, -7.0],
      rotation: [Math.PI / 2, 0, i * 0.5],
    });
  }
  for (let i = 0; i < 2; i += 1) {
    add(root, geometry.tyre, material.rubber, {
      position: [LEFT + 0.5, 1.12, BACK + 0.55 + i * 0.75],
      rotation: [Math.PI / 2, 0, i * 0.9],
    });
  }

  const rack = group(root, { position: [LEFT + 0.45, 0, BACK + 0.9] });
  [-0.75, 0.75].forEach((z) =>
    add(rack, geometry.rackUpright, material.frameSteel, { position: [0, 0.95, z] })
  );
  add(rack, geometry.rackBar, material.frameSteel, { position: [0, 0.78, 0] });
  add(rack, geometry.rackBar, material.frameSteel, { position: [0, 1.5, 0] });
}

function buildDrums(root: THREE.Object3D) {
  const g = group(root, { position: [LEFT + 0.42, 0, -9.3] });
  add(g, geometry.drum, material.drumBlue, { position: [0, 0.43, 0] });
  add(g, geometry.drumRib, material.drumBlue, { position: [0, 0.58, 0] });
  add(g, geometry.drumRib, material.drumBlue, { position: [0, 0.28, 0] });
  add(g, geometry.drum, material.drumRed, { position: [0.1, 0.43, 0.68] });
  add(g, geometry.drumLabel, material.drumLabel, { position: [0.1, 0.46, 0.68] });
  add(g, geometry.drumRib, material.drumRed, { position: [0.1, 0.72, 0.68] });
}

function buildJackAndStands(root: THREE.Object3D, detailed: boolean) {
  const g = group(root, { position: [-2.75, 0, -5.3], rotation: [0, 0.35, 0] });
  add(g, geometry.jackBody, material.red, { position: [0, 0.17, 0] });
  add(g, geometry.jackArm, material.frameSteel, {
    position: [0.08, 0.27, 0],
    rotation: [0, 0, 0.12],
  });
  add(g, geometry.jackHandle, material.frameSteel, {
    position: [-0.5, 0.42, 0],
    rotation: [0, 0, 1.15],
  });
  ([[-0.3, -0.13], [-0.3, 0.13], [0.3, -0.13], [0.3, 0.13]] as const).forEach(([x, z]) =>
    add(g, geometry.jackWheel, material.rubber, { position: [x, 0.05, z] })
  );
  if (!detailed) return;

  [0.75, 1.15].forEach((x, i) => {
    const stand = group(g, { position: [x, 0, 0.5 + i * 0.1] });
    add(stand, geometry.standPost, material.steel, { position: [0, 0.34, 0] });
    add(stand, geometry.standSaddle, material.steel, { position: [0, 0.5, 0] });
    for (let leg = 0; leg < 3; leg += 1) {
      const angle = (leg / 3) * Math.PI * 2;
      add(stand, geometry.standLeg, material.frameSteel, {
        position: [Math.cos(angle) * 0.1, 0.2, Math.sin(angle) * 0.1],
        rotation: [Math.sin(angle) * 0.28, 0, -Math.cos(angle) * 0.28],
      });
    }
  });
}

function buildLiftPosts(root: THREE.Object3D) {
  [-1, 1].forEach((side) => {
    const g = group(root, { position: [side * 4.0, 0, -8.2] });
    add(g, geometry.liftBase, material.frameSteel, { position: [0, 0.04, 0] });
    add(g, geometry.liftPost, material.yellow, { position: [0, 1.5, 0] });
    add(g, geometry.liftArm, material.frameSteel, {
      position: [-side * 0.55, 0.42, 0.3],
      rotation: [0, side * 0.5, 0],
    });
  });
}

function buildCeilingStrips(root: THREE.Object3D) {
  const y = garageHeight - 0.12;
  [-3.4, -9.4].forEach((z) => {
    [-0.75, 0.75].forEach((x) => {
      const g = group(root, { position: [x, y, z] });
      add(g, geometry.stripHousing, material.frameSteel);
      add(g, geometry.stripTube, material.lit, { position: [0, -0.04, 0] });
    });
  });
}

function buildRightWallDetails(root: THREE.Object3D, detailed: boolean) {
  const wall = group(root, { position: [RIGHT - 0.02, 0, 0], rotation: [0, -Math.PI / 2, 0] });

  const reel = group(wall, { position: [-5.5, 2.5, 0] });
  add(reel, geometry.reelCheek, material.red, { position: [0, 0, 0.09] });
  add(reel, geometry.reelDrum, material.frameSteel);
  add(reel, geometry.reelCheek, material.red, { position: [0, 0, -0.09] });
  add(reel, geometry.hoseCoil, material.dark, { rotation: [0, Math.PI / 2, 0] });

  if (!detailed) return;
  const ext = group(wall, { position: [-3.2, 1.0, 0] });
  add(ext, geometry.extBracket, material.dark, { position: [0, 0, 0.06] });
  add(ext, geometry.extBody, material.red);
  add(ext, geometry.extNeck, material.dark, { position: [0, 0.24, 0] });

  add(wall, geometry.clockFace, material.paper, {
    position: [-8.0, 2.8, 0],
    rotation: [0, 0, Math.PI / 2],
  });

  const poster = group(wall, { position: [-9.3, 2.1, 0] });
  add(poster, geometry.frame, material.dark, { rotation: [0, Math.PI / 2, 0] });
  add(poster, geometry.framePaper, material.paper, { position: [0, 0, 0.02] });
}

function buildFloorDetails(root: THREE.Object3D, detailed: boolean) {
  const y = 0.006;
  for (let i = 0; i < 14; i += 1) {
    add(root, geometry.floorStripe, material.yellow, {
      position: [-2.25, y, -4.0 - i * 0.42],
      rotation: [0, 0.6, 0],
      scale: [1, 1, 0.52],
    });
  }
  add(root, geometry.floorStripe, material.yellow, {
    position: [2.25, y, -6.4],
    scale: [0.7, 1, 5.2],
  });

  if (!detailed) return;
  add(root, geometry.stain, material.oil, {
    position: [-2.9, y - 0.001, -6.6],
    scale: [0.5, 1, 0.34],
  });
  add(root, geometry.stain, material.oil, {
    position: [-3.4, y - 0.001, -5.5],
    scale: [0.26, 1, 0.3],
  });
  add(root, geometry.stain, material.oil, {
    position: [3.2, y - 0.001, -8.6],
    scale: [0.33, 1, 0.26],
  });

  const tray = group(root, { position: [-2.1, 0, -7.4], rotation: [0, 0.2, 0] });
  add(tray, geometry.trayBase, material.dark, { position: [0, 0.012, 0] });
  add(tray, geometry.stain, material.oil, { position: [0, 0.027, 0], scale: [0.18, 1, 0.13] });
}

function buildSign(root: THREE.Object3D) {
  const g = group(root, { position: [-2.6, 2.6, BACK + 0.06] });
  add(g, geometry.signPlate, material.dark);
  add(g, geometry.signPlate, material.accent, {
    scale: [0.92, 0.42, 0.9],
    position: [0, 0, 0.012],
  });
}

function buildWallGrime(root: THREE.Object3D) {
  add(root, geometry.grime, material.grime, {
    position: [LEFT + 0.015, 0.42, (frontZ + backZ) / 2],
    rotation: [0, Math.PI / 2, 0],
    scale: [8.6, 0.85, 1],
  });
  add(root, geometry.grime, material.grime, {
    position: [RIGHT - 0.015, 0.42, (frontZ + backZ) / 2],
    rotation: [0, -Math.PI / 2, 0],
    scale: [8.6, 0.85, 1],
  });
}

/**
 * Bakes a tree of static meshes down to one merged mesh per material.
 *
 * Each mesh's geometry is cloned, its full world transform baked into the
 * vertices, and everything sharing a material welded into a single
 * buffer. A hundred-odd little props become about a dozen draw calls.
 *
 * This matters far more here than the triangle count ever did: the props
 * are only ~5,800 triangles, barely 1% of the car's, but as separate
 * meshes they were a hundred extra draw calls on every frame — and
 * per-draw cost is exactly what dominates when there's no GPU and the
 * browser is rasterising on the CPU, as in the headless QA runs.
 */
function mergeByMaterial(root: THREE.Object3D) {
  root.updateWorldMatrix(true, true);

  const byMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const baked = child.geometry.clone().applyMatrix4(child.matrixWorld);
    // Merging needs every geometry to carry exactly the same attributes.
    for (const name of Object.keys(baked.attributes)) {
      if (name !== "position" && name !== "normal" && name !== "uv") {
        baked.deleteAttribute(name);
      }
    }
    const list = byMaterial.get(child.material as THREE.Material);
    if (list) list.push(baked);
    else byMaterial.set(child.material as THREE.Material, [baked]);
  });

  const merged = new THREE.Group();
  merged.name = "workshop props (merged)";
  for (const [mat, geometries] of byMaterial) {
    const combined = mergeGeometries(geometries, false);
    for (const geo of geometries) geo.dispose();
    if (!combined) continue;
    const mesh = new THREE.Mesh(combined, mat);
    // Static dressing: it never moves, so three.js can skip its matrix work.
    mesh.matrixAutoUpdate = false;
    // Neither casting nor receiving shadows. These are background objects
    // lit mostly by the warm point lights, and shadow sampling is a
    // per-pixel cost across a lot of screen for something nobody looks at.
    // The car and the room it stands in still cast and receive normally.
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    merged.add(mesh);
  }
  return merged;
}

/**
 * Everything that makes the bay look like a working garage rather than an
 * empty box: pegboard and bench, tyres and a rack, oil drums, a trolley
 * jack and axle stands, two lift posts, extra ceiling strips, a cable
 * reel, floor markings and stains, a few wall details and a service-bay
 * sign.
 *
 * On a low-end device the smaller, fiddlier props are skipped — the big
 * silhouettes that actually sell the room are kept, the detail that only
 * reads up close is dropped.
 */
export default function WorkshopProps() {
  const props = useMemo(() => {
    // Settled once: this only ever runs in the browser (the whole scene is
    // loaded with ssr:false) and the answer can't change mid-session.
    const detailed = !isLowEndDevice();
    const root = new THREE.Group();
    buildPegboard(root, detailed);
    buildWorkbench(root, detailed);
    buildTyres(root);
    buildDrums(root);
    buildJackAndStands(root, detailed);
    buildLiftPosts(root);
    buildCeilingStrips(root);
    buildRightWallDetails(root, detailed);
    buildFloorDetails(root, detailed);
    buildSign(root);
    buildWallGrime(root);
    return mergeByMaterial(root);
  }, []);

  return <primitive object={props} />;
}
