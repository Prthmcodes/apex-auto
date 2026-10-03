"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { theme } from "./theme";
import { layout } from "./layout";
import { siteContent } from "@/content/site";
import { add, group, mergeByMaterial, panelGeometry } from "./buildTree";
import { TILE, exteriorTexture, makeLightSprite } from "./exteriorTextures";
import { isLowEndDevice } from "@/lib/deviceQuality";

/**
 * The outside of the building: what a visitor sees for the first second or
 * two, before the camera goes in.
 *
 * It used to be a plain brick box with the business name floating over the
 * roof in glowing letters, which read as "a building" and not as "a
 * garage". A real independent garage on an East London industrial estate is
 * a cheap steel-framed unit: profiled metal cladding over blockwork, a flat
 * roof with a galvanised edge trim, a big roller shutter, and a lit fascia
 * board with the name and the services on it. That is what this builds.
 *
 * Everything is procedural — shapes in code, surfaces painted onto a
 * canvas (see exteriorTextures.ts) — and completely static, so it is all
 * baked down to one mesh per material before it ever reaches the renderer.
 */

const { height: wallHeight, door } = layout.garage;
const bay = layout.secondBay;
const { z: FACE, minX, maxX, parapetY, parapetTopY } = layout.facade;

// How far each layer stands off the wall face. Small, consistent steps:
// they stop surfaces fighting over the same pixels, and they are also how
// a real elevation is built up — cladding on rails over the blockwork, the
// sign board off the cladding, the roof trim capping the lot.
const OFFSET = {
  blockwork: 0.03,
  cladding: 0.05,
  shutter: 0.08,
  sign: 0.06,
  signFace: 0.285,
  trim: 0.3,
};

const BLOCKWORK_TOP = 1.9; // where blockwork gives way to cladding
const DOOR_HALF = door.width / 2;
const SHUTTER_BOTTOM = door.height * layout.garage.shutterOpenFraction;

const bay2Shutter = {
  left: bay.shutter.centerX - bay.shutter.width / 2,
  right: bay.shutter.centerX + bay.shutter.width / 2,
};
const bay2Door = {
  left: bay.personnelDoor.centerX - bay.personnelDoor.width / 2,
  right: bay.personnelDoor.centerX + bay.personnelDoor.width / 2,
};

// ---------------------------------------------------------------------------
// Materials. Built on first use, because the canvas textures they wrap need
// a browser; the whole scene is client-only, but this keeps it honest.

type Materials = ReturnType<typeof buildMaterials>;

function buildMaterials() {
  const phone = siteContent.business.phone.startsWith("PLACEHOLDER")
    ? siteContent.exterior.fasciaPhonePlaceholder
    : siteContent.business.phone;

  const fascia = exteriorTexture.fascia({
    name: siteContent.business.name.toUpperCase(),
    services: siteContent.exterior.fasciaServices,
    phone,
  });
  const motSign = exteriorTexture.motSign(siteContent.exterior.motSign);

  return {
    cladding: new THREE.MeshStandardMaterial({
      map: exteriorTexture.cladding(),
      normalMap: exteriorTexture.claddingNormal(),
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughness: 0.68,
      metalness: 0.38,
    }),
    blockwork: new THREE.MeshStandardMaterial({
      map: exteriorTexture.blockwork(),
      roughness: 0.93,
      metalness: 0,
    }),
    shutterOpen: new THREE.MeshStandardMaterial({
      map: exteriorTexture.shutterOpen(),
      roughness: 0.52,
      metalness: 0.55,
    }),
    shutterClosed: new THREE.MeshStandardMaterial({
      map: exteriorTexture.shutterClosed(),
      roughness: 0.62,
      metalness: 0.45,
    }),
    trim: new THREE.MeshStandardMaterial({
      color: theme.roofTrim,
      roughness: 0.42,
      metalness: 0.7,
    }),
    drainpipe: new THREE.MeshStandardMaterial({
      color: theme.drainpipe,
      roughness: 0.62,
      metalness: 0.2,
    }),
    // The second bay's solid mass, and anything else that only ever shows
    // as a dark edge.
    structure: new THREE.MeshStandardMaterial({
      color: theme.claddingRib,
      roughness: 0.9,
    }),
    signSurround: new THREE.MeshStandardMaterial({
      color: theme.fasciaSurround,
      roughness: 0.6,
      metalness: 0.3,
    }),
    // Backlit, not neon: the panel's own artwork drives the glow, so the
    // lettering lights up and the dark panel around it stays a panel.
    // Kept well under the bloom threshold — twice now on this project a
    // bright emissive panel has flared into a solid white block.
    signFace: new THREE.MeshStandardMaterial({
      map: fascia,
      emissiveMap: fascia,
      emissive: new THREE.Color("#ffffff"),
      emissiveIntensity: 0.6,
      roughness: 0.55,
      toneMapped: false,
    }),
    motSign: new THREE.MeshStandardMaterial({
      map: motSign,
      emissiveMap: motSign,
      emissive: new THREE.Color("#ffffff"),
      // Barely lit: a real trade sign isn't illuminated, it just catches
      // the floodlights. Without a touch of emissive it vanishes at dusk.
      emissiveIntensity: 0.22,
      roughness: 0.7,
    }),
    floodHousing: new THREE.MeshStandardMaterial({
      color: theme.floodHousing,
      roughness: 0.55,
      metalness: 0.4,
    }),
    floodLens: new THREE.MeshStandardMaterial({
      color: theme.floodLens,
      emissive: new THREE.Color(theme.floodLens),
      emissiveIntensity: 1.5,
      toneMapped: false,
    }),
    personnelDoor: new THREE.MeshStandardMaterial({
      color: theme.personnelDoor,
      roughness: 0.6,
      metalness: 0.3,
    }),
    poolCool: makeLightSprite(theme.floodLens, 0.42),
  };
}

// ---------------------------------------------------------------------------
// Shared geometry.

const geometry = {
  parapet: new THREE.BoxGeometry(1, parapetTopY - parapetY, 0.34),
  drainpipe: new THREE.CylinderGeometry(0.055, 0.055, 1, 10),
  drainShoe: new THREE.BoxGeometry(0.13, 0.22, 0.17),
  guideRail: new THREE.BoxGeometry(0.1, 1, 0.17),
  shutterRail: new THREE.BoxGeometry(1, 0.1, 0.13),
  signSurround: new THREE.BoxGeometry(1, 1, 0.22),
  signBracket: new THREE.BoxGeometry(0.07, 0.07, 0.24),
  floodHousing: new THREE.BoxGeometry(0.36, 0.14, 0.22),
  floodLens: new THREE.PlaneGeometry(0.3, 0.17),
  canopy: new THREE.BoxGeometry(1.34, 0.07, 0.56),
  canopyStay: new THREE.BoxGeometry(0.05, 0.05, 0.5),
  canopyLamp: new THREE.BoxGeometry(0.14, 0.06, 0.14),
  doorLeaf: new THREE.BoxGeometry(1, 1, 0.07),
  doorFrameSide: new THREE.BoxGeometry(0.07, 1, 0.1),
  doorFrameTop: new THREE.BoxGeometry(1, 0.07, 0.1),
  handle: new THREE.BoxGeometry(0.04, 0.16, 0.04),
  pool: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
};

// ---------------------------------------------------------------------------
// Placing an upright, textured rectangle on the elevation by its EDGES
// rather than its centre, because that is how the elevation is actually
// described: this pier runs from x to x, that band from y to y.

function faceRect(
  parent: THREE.Object3D,
  material: THREE.Material,
  tile: { width: number; height: number },
  box: { x0: number; x1: number; y0: number; y1: number },
  offset: number
) {
  const width = box.x1 - box.x0;
  const height = box.y1 - box.y0;
  if (width <= 0 || height <= 0) return;
  add(parent, panelGeometry(width, height, tile), material, {
    position: [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, FACE + offset],
  });
}

// ---------------------------------------------------------------------------
// The elevation.

function buildCladdingAndBlockwork(root: THREE.Object3D, m: Materials) {
  const block = { width: TILE.blockwork.width, height: TILE.blockwork.height };
  const clad = { width: TILE.cladding.width, height: TILE.cladding.height };

  // Blockwork: the lower band, wherever there isn't an opening.
  const lower = [
    { x0: minX, x1: -DOOR_HALF }, // main bay, left pillar
    { x0: DOOR_HALF, x1: bay.startX }, // main bay, right pillar
    { x0: bay.startX, x1: bay2Shutter.left }, // second bay piers
    { x0: bay2Shutter.right, x1: bay2Door.left },
    { x0: bay2Door.right, x1: maxX },
  ];
  for (const span of lower) {
    faceRect(root, m.blockwork, block, { ...span, y0: 0, y1: BLOCKWORK_TOP }, OFFSET.blockwork);
  }

  // Cladding: the upper band, including the strips over each opening.
  const upper = [
    { x0: minX, x1: -DOOR_HALF, y0: BLOCKWORK_TOP, y1: parapetY },
    { x0: DOOR_HALF, x1: bay.startX, y0: BLOCKWORK_TOP, y1: parapetY },
    { x0: -DOOR_HALF, x1: DOOR_HALF, y0: door.height, y1: parapetY },
    { x0: bay.startX, x1: bay2Shutter.left, y0: BLOCKWORK_TOP, y1: parapetY },
    { x0: bay2Shutter.right, x1: bay2Door.left, y0: BLOCKWORK_TOP, y1: parapetY },
    { x0: bay2Door.right, x1: maxX, y0: BLOCKWORK_TOP, y1: parapetY },
    { x0: bay2Shutter.left, x1: bay2Shutter.right, y0: bay.shutter.height, y1: parapetY },
    { x0: bay2Door.left, x1: bay2Door.right, y0: bay.personnelDoor.height, y1: parapetY },
  ];
  for (const span of upper) {
    faceRect(root, m.cladding, clad, span, OFFSET.cladding);
  }
}

/** The second bay: a solid block with a roof, because you never see inside. */
function buildSecondBayMass(root: THREE.Object3D, m: Materials) {
  const depth = layout.garage.depth;
  const backZ = layout.garage.backZ;
  const width = maxX - bay.startX;
  const centreX = (bay.startX + maxX) / 2;
  const centreZ = (backZ + FACE) / 2;

  add(root, new THREE.BoxGeometry(width, wallHeight, FACE - backZ - 0.05), m.structure, {
    position: [centreX, wallHeight / 2, centreZ],
  });
  // Its share of the flat roof, level with the main bay's.
  add(root, new THREE.BoxGeometry(width, parapetY - wallHeight, depth), m.structure, {
    position: [centreX, (wallHeight + parapetY) / 2, centreZ],
  });
}

/** Flat roof edge trim, right along the front, plus a short return each end. */
function buildRoofTrim(root: THREE.Object3D, m: Materials) {
  const width = maxX - minX + 0.3;
  const y = (parapetY + parapetTopY) / 2;
  add(root, geometry.parapet, m.trim, {
    position: [(minX + maxX) / 2, y, FACE + OFFSET.trim - 0.17],
    scale: [width, 1, 1],
  });
  // The ends, so the trim doesn't look like a board stuck on the front.
  for (const x of [minX - 0.15, maxX + 0.15]) {
    add(root, geometry.parapet, m.trim, {
      position: [x, y, FACE - 1.2],
      rotation: [0, Math.PI / 2, 0],
      scale: [2.6, 1, 1],
    });
  }
}

function buildDrainpipes(root: THREE.Object3D, m: Materials, detailed: boolean) {
  // One at each end of the elevation, and one on the joint between the two
  // bays — which is where two units in a terrace actually share a pipe.
  for (const x of [minX + 0.12, bay.startX, maxX - 0.12]) {
    const height = parapetY - 0.12;
    add(root, geometry.drainpipe, m.drainpipe, {
      position: [x, height / 2 + 0.12, FACE + 0.09],
      scale: [1, height, 1],
    });
    if (detailed) {
      add(root, geometry.drainShoe, m.drainpipe, {
        position: [x, 0.11, FACE + 0.14],
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Shutters.

function buildMainShutter(root: THREE.Object3D, m: Materials) {
  // The curtain, rolled up two thirds so the bay is open for business and
  // you can see the car inside. The camera passes under it on the way in,
  // with 1.1m to spare — see the doorway figures in PROGRESS.md.
  const curtainHeight = door.height - SHUTTER_BOTTOM;
  add(
    root,
    panelGeometry(door.width - 0.1, curtainHeight, TILE.shutter),
    m.shutterOpen,
    { position: [0, SHUTTER_BOTTOM + curtainHeight / 2, FACE + OFFSET.shutter] }
  );
  // The weighted bottom rail.
  add(root, geometry.shutterRail, m.trim, {
    position: [0, SHUTTER_BOTTOM, FACE + OFFSET.shutter],
    scale: [door.width - 0.05, 1, 1],
  });
  // Guide rails up both jambs.
  for (const side of [-1, 1]) {
    add(root, geometry.guideRail, m.trim, {
      position: [side * (DOOR_HALF - 0.04), door.height / 2, FACE + OFFSET.shutter - 0.02],
      scale: [1, door.height, 1],
    });
  }
}

function buildSecondBayShutter(root: THREE.Object3D, m: Materials, detailed: boolean) {
  const { width, height, centerX } = bay.shutter;
  add(root, panelGeometry(width - 0.08, height - 0.05, TILE.shutter), m.shutterClosed, {
    position: [centerX, (height - 0.05) / 2, FACE + OFFSET.shutter],
  });
  add(root, geometry.shutterRail, m.trim, {
    position: [centerX, 0.06, FACE + OFFSET.shutter],
    scale: [width - 0.04, 1, 1],
  });
  if (!detailed) return;
  for (const side of [-1, 1]) {
    add(root, geometry.guideRail, m.trim, {
      position: [centerX + side * (width / 2 - 0.03), height / 2, FACE + OFFSET.shutter - 0.02],
      scale: [1, height, 1],
    });
  }
}

// ---------------------------------------------------------------------------
// Signage.

function buildFasciaSign(root: THREE.Object3D, m: Materials) {
  const y0 = 3.45;
  const y1 = 4.48;
  const centreY = (y0 + y1) / 2;

  // The box the sign lives in, a little bigger than its face all round.
  add(root, geometry.signSurround, m.signSurround, {
    position: [(minX + maxX) / 2, centreY, FACE + OFFSET.sign + 0.11],
    scale: [maxX - minX + 0.32, y1 - y0 + 0.12, 1],
  });
  // The lit face itself.
  add(root, new THREE.PlaneGeometry(maxX - minX, y1 - y0), m.signFace, {
    position: [(minX + maxX) / 2, centreY, FACE + OFFSET.signFace],
  });
}

function buildMotSign(root: THREE.Object3D, m: Materials) {
  // On the left-hand pillar, where it is clear of the lit window on the
  // right and still square-on to anyone walking up to the door.
  const x = (minX - DOOR_HALF) / 2;
  const width = 1.6;
  const height = 0.4; // 4:1, matching the artwork, so nothing is stretched

  add(root, geometry.signSurround, m.signSurround, {
    position: [x, 2.62, FACE + OFFSET.cladding + 0.03],
    scale: [width + 0.1, height + 0.1, 0.18],
  });
  add(root, new THREE.PlaneGeometry(width, height), m.motSign, {
    position: [x, 2.62, FACE + OFFSET.cladding + 0.08],
  });
}

// ---------------------------------------------------------------------------
// Light, all of it faked. No new real lights: the scene's one
// shadow-casting directional light and the warm point light inside the
// doorway are the whole lighting budget.

function buildFloodlights(root: THREE.Object3D, m: Materials) {
  // Mounted under the sign board, above each door — clear of the lettering
  // so they don't sit across the business name.
  const lamps = [
    { x: -2.4, reach: 3.3 },
    { x: 2.4, reach: 3.3 },
    { x: bay.shutter.centerX, reach: 2.5 },
  ];

  for (const lamp of lamps) {
    const fitting = group(root, { position: [lamp.x, 3.36, FACE + 0.26] });
    add(fitting, geometry.signBracket, m.floodHousing, { position: [0, 0.08, -0.12] });
    // Tilted 34 degrees down, and the lens sits flat on the housing's
    // front face with the same tilt. Both rotations are the same number on
    // purpose: a plane's normal starts out as +z, so rotating it by +0.6
    // about X points it down and forward, which is where the forecourt is.
    // Getting the sign wrong here aims a floodlight at the sky.
    add(fitting, geometry.floodHousing, m.floodHousing, { rotation: [0.6, 0, 0] });
    add(fitting, geometry.floodLens, m.floodLens, {
      position: [0, -0.07, 0.1],
      rotation: [0.6, 0, 0],
    });

    // The pool it throws on the forecourt.
    add(root, geometry.pool, m.poolCool, {
      position: [lamp.x, 0.02, FACE + lamp.reach * 0.95],
      scale: [lamp.reach * 2.1, 1, lamp.reach * 2.1],
    });
  }
}

function buildPersonnelDoor(root: THREE.Object3D, m: Materials, detailed: boolean) {
  const { width, height, centerX } = bay.personnelDoor;
  const g = group(root, { position: [centerX, 0, FACE] });

  add(g, geometry.doorLeaf, m.personnelDoor, {
    position: [0, height / 2, 0.04],
    scale: [width - 0.12, height - 0.08, 1],
  });
  for (const side of [-1, 1]) {
    add(g, geometry.doorFrameSide, m.trim, {
      position: [side * (width / 2 - 0.03), height / 2, 0.07],
      scale: [1, height, 1],
    });
  }
  add(g, geometry.doorFrameTop, m.trim, {
    position: [0, height - 0.03, 0.07],
    scale: [width, 1, 1],
  });

  // A small canopy over it, with a lamp underneath.
  add(g, geometry.canopy, m.trim, { position: [0, height + 0.14, 0.28] });
  add(g, geometry.canopyLamp, m.floodLens, { position: [0, height + 0.07, 0.2] });
  add(root, geometry.pool, m.poolCool, {
    position: [centerX, 0.02, FACE + 1.0],
    scale: [2.6, 1, 2.8],
  });

  if (!detailed) return;
  for (const side of [-1, 1]) {
    add(g, geometry.canopyStay, m.trim, {
      position: [side * 0.6, height + 0.06, 0.24],
      rotation: [0.5, 0, 0],
    });
  }
  add(g, geometry.handle, m.trim, { position: [width / 2 - 0.22, height * 0.47, 0.09] });
}

// ---------------------------------------------------------------------------

/**
 * Warm light flooding out of the open bay onto the apron. This is the one
 * that sells "they're open" — a cold forecourt with a lit sign looks shut.
 *
 * Its own component, rendered by Scene.tsx OUTSIDE the group of street-side
 * things that is hidden while the camera is in the bay: the pool is 9.6m
 * deep and reaches a couple of metres in across the workshop floor, where
 * the tall phone engine shot can see it without seeing the doorway.
 */
export function DoorwayLightSpill() {
  const spill = useMemo(() => {
    const mesh = new THREE.Mesh(
      geometry.pool,
      makeLightSprite(theme.workshopLight, 0.38)
    );
    mesh.position.set(0, 0.025, FACE + 2.6);
    mesh.scale.set(door.width * 1.9, 1, 9.6);
    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
    mesh.raycast = () => {};
    return mesh;
  }, []);

  return <primitive object={spill} />;
}

export default function GarageExterior() {
  const built = useMemo(() => {
    // Settled once: this only ever runs in the browser (the scene is loaded
    // with ssr:false) and the answer can't change mid-session.
    const detailed = !isLowEndDevice();
    const m = buildMaterials();
    const root = new THREE.Group();

    buildSecondBayMass(root, m);
    buildCladdingAndBlockwork(root, m);
    buildRoofTrim(root, m);
    buildDrainpipes(root, m, detailed);
    buildMainShutter(root, m);
    buildSecondBayShutter(root, m, detailed);
    buildFasciaSign(root, m);
    buildMotSign(root, m);
    buildPersonnelDoor(root, m, detailed);
    buildFloodlights(root, m);

    return mergeByMaterial(root, "garage exterior (merged)");
  }, []);

  return <primitive object={built} />;
}
