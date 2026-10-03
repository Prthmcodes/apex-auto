"use client";

import { useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { theme } from "./theme";
import { layout } from "./layout";
import { exteriorTexture } from "./exteriorTextures";

const { width, depth, height, frontZ, backZ, door } = layout.garage;
const halfWidth = width / 2;
const wallThickness = 0.3;
const pillarWidth = (width - door.width) / 2;
const midZ = (frontZ + backZ) / 2;

function useRepeatingTexture(paths: { map: string; normalMap: string; roughnessMap: string }, repeat: number) {
  const maps = useTexture(paths);
  useEffect(() => {
    for (const texture of Object.values(maps)) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeat, repeat);
      texture.needsUpdate = true;
    }
  }, [maps, repeat]);
  return maps;
}

// The workshop floor: a polished concrete slab, laid over the asphalt
// across the garage footprint and a little way out past the door.
//
// Two numbers do all the work of making it read as flat polished concrete
// rather than water. FLOOR_REPEAT is deliberately small, so one tile
// covers several metres and the grain stays large and calm. FLOOR_NORMAL
// is near-zero, because a polished floor IS flat — its shine comes from
// low roughness, not from bumps. Bumps plus shine is what reads as
// ripples, which is what the forecourt-style asphalt was doing here.
const FLOOR_REPEAT = 2;
const FLOOR_NORMAL = new THREE.Vector2(0.08, 0.08);
// A hair above the asphalt (y=0) so the two planes can't z-fight, but far
// enough below the car's tyres (and the bay markings at y=0.006) to stay
// out of their way.
const FLOOR_Y = 0.003;

function WorkshopFloor() {
  // Deliberately NOT useRepeatingTexture: drei's useTexture caches by URL,
  // so the floor would be handed the very same texture objects as the
  // walls, and whichever effect ran last would win the `repeat` for both.
  // Cloning gives the floor its own tiling while still sharing the
  // decoded image.
  const shared = useTexture({
    map: "/textures/concrete/color.jpg",
    normalMap: "/textures/concrete/normal.jpg",
    roughnessMap: "/textures/concrete/roughness.jpg",
  });

  const concrete = useMemo(() => {
    const clones = {
      map: shared.map.clone(),
      normalMap: shared.normalMap.clone(),
      roughnessMap: shared.roughnessMap.clone(),
    };
    for (const texture of Object.values(clones)) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(FLOOR_REPEAT, FLOOR_REPEAT);
      texture.needsUpdate = true;
    }
    return clones;
  }, [shared]);

  // The clones own their own GPU handles, so they have to be released.
  useEffect(() => {
    return () => {
      for (const texture of Object.values(concrete)) texture.dispose();
    };
  }, [concrete]);

  return (
    <mesh
      position={[0, FLOOR_Y, midZ + 0.6]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[width, depth + 1.2]} />
      <meshStandardMaterial
        map={concrete.map}
        normalMap={concrete.normalMap}
        normalScale={FLOOR_NORMAL}
        roughnessMap={concrete.roughnessMap}
        // Low enough to pick up a soft sheen from the strip lights, high
        // enough that it never turns into a mirror. At 0.42 the ceiling
        // lights burned a hot streak into the floor right where the stage
        // caption sits; this spreads the same light into a broad sheen.
        roughness={0.58}
        metalness={0}
        color="#5f6368"
      />
    </mesh>
  );
}

/**
 * The frosted pane itself, drawn in code as a small gradient image.
 *
 * The window used to be one flat emissive rectangle, which read as a
 * yellow sticker on the brickwork. Real frosted glass with a light behind
 * it is brightest near the fitting and falls away towards the edges, and
 * it's never one single colour. This paints that: a warm pool of light
 * sitting high in the pane, fading down and out to a much dimmer, cooler
 * edge. Used as both the colour and the emissive map, so the glow follows
 * the gradient instead of blazing evenly across the whole pane.
 */
function makeFrostedPaneTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Dim base tone — the parts of the glass the light barely reaches.
  ctx.fillStyle = "#4a3a28";
  ctx.fillRect(0, 0, size, size);

  // The warm pool of light, centred a little above the middle of the pane
  // as though the fitting inside hangs high on the wall.
  const glow = ctx.createRadialGradient(
    size * 0.5, size * 0.36, size * 0.04,
    size * 0.5, size * 0.46, size * 0.62
  );
  glow.addColorStop(0, "#ffd9a3");
  glow.addColorStop(0.45, "#e8a862");
  glow.addColorStop(1, "#3d2f20");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // A few soft horizontal bands, so it reads as textured/reeded glass
  // rather than a clean gradient.
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = "#000000";
  for (let y = 0; y < size; y += 6) ctx.fillRect(0, y, size, 2);
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A small frosted, warmly lit window in the right-hand pillar. */
function LitWindow() {
  const x = door.width / 2 + pillarWidth / 2;
  // Proud of the exterior cladding (GarageExterior.tsx, which stands 0.05
  // off the wall face). Set flush with the wall, as it was, the cladding
  // hid the window and only its glow halo leaked out over the blockwork,
  // as a stray tan strip across the pier.
  const z = layout.facade.z + 0.075;

  const paneTexture = useMemo(() => makeFrostedPaneTexture(), []);
  useEffect(() => () => paneTexture.dispose(), [paneTexture]);

  const paneWidth = 0.7;
  const paneHeight = 0.9;
  const barThickness = 0.028;

  return (
    <group position={[x, height * 0.6, z]}>
      {/* Outer frame: a flat surround with a rebate, rather than one slab,
          so the glass sits back inside it the way real glazing does. */}
      <mesh position={[0, 0, -0.012]}>
        <boxGeometry args={[0.9, 1.1, 0.05]} />
        <meshStandardMaterial color="#231d17" roughness={0.75} metalness={0.1} />
      </mesh>
      {/* a lighter inner reveal, catching a little of the glow */}
      <mesh position={[0, 0, 0.016]}>
        <boxGeometry args={[0.8, 1.0, 0.03]} />
        <meshStandardMaterial color="#3a3029" roughness={0.65} />
      </mesh>

      {/* the frosted pane */}
      <mesh position={[0, 0, 0.034]}>
        <planeGeometry args={[paneWidth, paneHeight]} />
        <meshStandardMaterial
          map={paneTexture}
          emissiveMap={paneTexture}
          emissive="#ffffff"
          // Well below the old 1.4: the gradient now carries the brightness,
          // so the pane glows without flaring into a solid block.
          emissiveIntensity={0.55}
          roughness={0.85}
          metalness={0}
        />
      </mesh>

      {/* glazing bars: one upright, one cross — a four-pane window */}
      <mesh position={[0, 0, 0.04]}>
        <boxGeometry args={[barThickness, paneHeight, 0.012]} />
        <meshStandardMaterial color="#231d17" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.06, 0.04]}>
        <boxGeometry args={[paneWidth, barThickness, 0.012]} />
        <meshStandardMaterial color="#231d17" roughness={0.8} />
      </mesh>

      {/* a faint halo on the wall, so the light looks like it spills.
          Uses the exterior's soft round light-pool gradient: a flat-colour
          plane showed up as a hard tan rectangle on the dark cladding. */}
      <mesh position={[0, 0, 0.046]}>
        <planeGeometry args={[1.7, 1.9]} />
        <meshBasicMaterial
          map={exteriorTexture.lightPool()}
          color={theme.workshopLight}
          transparent
          opacity={0.14}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export default function Garage() {
  const concrete = useRepeatingTexture(
    {
      map: "/textures/concrete/color.jpg",
      normalMap: "/textures/concrete/normal.jpg",
      roughnessMap: "/textures/concrete/roughness.jpg",
    },
    3
  );
  const bricks = useRepeatingTexture(
    {
      map: "/textures/bricks/color.jpg",
      normalMap: "/textures/bricks/normal.jpg",
      roughnessMap: "/textures/bricks/roughness.jpg",
    },
    4
  );

  const concreteProps = {
    map: concrete.map,
    normalMap: concrete.normalMap,
    roughnessMap: concrete.roughnessMap,
    roughness: 0.9,
  };
  const brickProps = {
    map: bricks.map,
    normalMap: bricks.normalMap,
    roughnessMap: bricks.roughnessMap,
    roughness: 0.85,
  };

  return (
    <group>
      <WorkshopFloor />

      {/* left side wall */}
      <mesh
        position={[-halfWidth + wallThickness / 2, height / 2, midZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[wallThickness, height, depth]} />
        <meshStandardMaterial {...concreteProps} />
      </mesh>

      {/* right side wall */}
      <mesh
        position={[halfWidth - wallThickness / 2, height / 2, midZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[wallThickness, height, depth]} />
        <meshStandardMaterial {...concreteProps} />
      </mesh>

      {/* back wall */}
      <mesh position={[0, height / 2, backZ]} receiveShadow>
        <boxGeometry args={[width, height, wallThickness]} />
        <meshStandardMaterial {...concreteProps} />
      </mesh>

      {/* flat roof */}
      <mesh position={[0, height + wallThickness / 2, midZ]} castShadow>
        <boxGeometry args={[width, wallThickness, depth]} />
        <meshStandardMaterial {...concreteProps} />
      </mesh>

      {/* front wall: left door pillar, brick-faced lower band */}
      <mesh
        position={[-(door.width / 2 + pillarWidth / 2), height / 2, frontZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[pillarWidth, height, wallThickness]} />
        <meshStandardMaterial {...brickProps} />
      </mesh>

      {/* front wall: right door pillar, brick-faced lower band */}
      <mesh
        position={[door.width / 2 + pillarWidth / 2, height / 2, frontZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[pillarWidth, height, wallThickness]} />
        <meshStandardMaterial {...brickProps} />
      </mesh>
      <LitWindow />

      {/* lintel above the open roller door */}
      <mesh
        position={[0, door.height + (height - door.height) / 2, frontZ]}
        castShadow
      >
        <boxGeometry args={[door.width, height - door.height, wallThickness]} />
        <meshStandardMaterial {...concreteProps} />
      </mesh>

      {/* warm amber strip light on the inside of the lintel */}
      <mesh position={[0, door.height - 0.15, frontZ - 0.5]}>
        <boxGeometry args={[door.width - 0.3, 0.1, 0.1]} />
        <meshStandardMaterial
          color={theme.accent}
          emissive={theme.accent}
          emissiveIntensity={2.5}
          toneMapped={false}
        />
      </mesh>

      {/* Amber light spilling out of the open bay onto the forecourt. Low
          and just outside the opening, so it comes out UNDER the
          two-thirds-open shutter and lands on the apron, rather than
          lighting the outside face of the curtain. */}
      <pointLight
        position={[0, 1.7, frontZ + 1.0]}
        color={theme.accent}
        intensity={7}
        distance={12}
        decay={2}
      />
    </group>
  );
}
