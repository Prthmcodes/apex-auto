"use client";

import { useMemo, useState } from "react";
import { Instance, Instances } from "@react-three/drei";
import * as THREE from "three";
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

/** Pegboard with a row of hanging tool silhouettes. */
function Pegboard({ detailed }: { detailed: boolean }) {
  const hooks = useMemo(
    () =>
      [-1.0, -0.72, -0.44, -0.12, 0.2, 0.52, 0.84].map((z, i) => ({
        z,
        length: 0.8 + ((i * 37) % 5) * 0.1,
        drop: ((i * 53) % 4) * 0.04,
      })),
    []
  );

  return (
    <group position={[LEFT + 0.02, 2.0, -4.6]}>
      <mesh geometry={geometry.panel} material={material.pegboard} />
      {detailed ? (
        <Instances geometry={geometry.hangingTool} material={material.frameSteel} limit={12}>
          {hooks.map((hook, i) => (
            <Instance
              key={i}
              position={[0.05, 0.25 - hook.drop, hook.z]}
              scale={[1, hook.length, 1]}
              rotation={[((i % 3) - 1) * 0.08, 0, 0]}
            />
          ))}
        </Instances>
      ) : null}
    </group>
  );
}

/** Workbench with a vice, a couple of parts and a clip-on work lamp. */
function Workbench({ detailed }: { detailed: boolean }) {
  const topY = 0.89;
  return (
    <group position={[LEFT + 0.4, 0, -4.6]}>
      <mesh geometry={geometry.benchTop} material={material.bench} position={[0, topY, 0]} />
      <mesh geometry={geometry.benchShelf} material={material.frameSteel} position={[0, 0.26, 0]} />
      {[
        [-0.28, -0.95], [0.28, -0.95], [-0.28, 0.95], [0.28, 0.95],
      ].map(([x, z], i) => (
        <mesh key={i} geometry={geometry.benchLeg} material={material.frameSteel} position={[x, 0.43, z]} />
      ))}

      {/* vice, bolted to the near end of the top */}
      <group position={[0.06, topY + 0.07, -0.72]}>
        <mesh geometry={geometry.viceBody} material={material.frameSteel} />
        <mesh geometry={geometry.viceJaw} material={material.steel} position={[0.1, 0.01, 0]} />
        <mesh geometry={geometry.viceScrew} material={material.steel} position={[0.2, 0.01, 0]} />
      </group>

      {detailed ? (
        <>
          {/* a few parts left out on the bench */}
          <mesh geometry={geometry.standSaddle} material={material.steel} position={[-0.05, topY + 0.05, 0.3]} rotation={[0, 0.4, 0]} />
          <mesh geometry={geometry.viceJaw} material={material.frameSteel} position={[0.1, topY + 0.08, 0.62]} rotation={[0, 0, 0.3]} />
          {/* clip-on work lamp, lit but not an actual light source */}
          <group position={[-0.2, topY, 0.95]}>
            <mesh geometry={geometry.lampArm} material={material.frameSteel} position={[0, 0.25, 0]} rotation={[0.25, 0, 0.2]} />
            <mesh geometry={geometry.lampShade} material={material.lampShade} position={[0.1, 0.49, 0.12]} rotation={[Math.PI - 0.5, 0, -0.3]} />
            <mesh geometry={geometry.lampBulb} material={material.lit} position={[0.1, 0.45, 0.12]} />
          </group>
        </>
      ) : null}
    </group>
  );
}

/** A stack of tyres and a simple rack against the back-left. */
function Tyres() {
  return (
    <>
      <Instances geometry={geometry.tyre} material={material.rubber} limit={8}>
        {[0, 1, 2, 3].map((i) => (
          <Instance
            key={i}
            position={[LEFT + 0.55, 0.11 + i * 0.2, -7.0]}
            rotation={[Math.PI / 2, 0, i * 0.5]}
          />
        ))}
        {[0, 1].map((i) => (
          <Instance
            key={`rack-${i}`}
            position={[LEFT + 0.5, 1.12, BACK + 0.55 + i * 0.75]}
            rotation={[Math.PI / 2, 0, i * 0.9]}
          />
        ))}
      </Instances>

      {/* the rack itself */}
      <group position={[LEFT + 0.45, 0, BACK + 0.9]}>
        {[-0.75, 0.75].map((z) => (
          <mesh key={z} geometry={geometry.rackUpright} material={material.frameSteel} position={[0, 0.95, z]} />
        ))}
        <mesh geometry={geometry.rackBar} material={material.frameSteel} position={[0, 0.78, 0]} />
        <mesh geometry={geometry.rackBar} material={material.frameSteel} position={[0, 1.5, 0]} />
      </group>
    </>
  );
}

/** Oil drums, one with a faded (wordless) label band. */
function Drums() {
  return (
    <group position={[LEFT + 0.42, 0, -9.3]}>
      <mesh geometry={geometry.drum} material={material.drumBlue} position={[0, 0.43, 0]} />
      <mesh geometry={geometry.drumRib} material={material.drumBlue} position={[0, 0.58, 0]} />
      <mesh geometry={geometry.drumRib} material={material.drumBlue} position={[0, 0.28, 0]} />

      <mesh geometry={geometry.drum} material={material.drumRed} position={[0.1, 0.43, 0.68]} />
      <mesh geometry={geometry.drumLabel} material={material.drumLabel} position={[0.1, 0.46, 0.68]} />
      <mesh geometry={geometry.drumRib} material={material.drumRed} position={[0.1, 0.72, 0.68]} />
    </group>
  );
}

/** Trolley jack and a pair of axle stands, parked to the left of the car. */
function JackAndStands({ detailed }: { detailed: boolean }) {
  return (
    <group position={[-2.75, 0, -5.3]} rotation={[0, 0.35, 0]}>
      <mesh geometry={geometry.jackBody} material={material.red} position={[0, 0.17, 0]} />
      <mesh geometry={geometry.jackArm} material={material.frameSteel} position={[0.08, 0.27, 0]} rotation={[0, 0, 0.12]} />
      <mesh geometry={geometry.jackHandle} material={material.frameSteel} position={[-0.5, 0.42, 0]} rotation={[0, 0, 1.15]} />
      {[[-0.3, -0.13], [-0.3, 0.13], [0.3, -0.13], [0.3, 0.13]].map(([x, z], i) => (
        <mesh key={i} geometry={geometry.jackWheel} material={material.rubber} position={[x, 0.05, z]} />
      ))}

      {detailed
        ? [0.75, 1.15].map((x, i) => (
            <group key={i} position={[x, 0, 0.5 + i * 0.1]}>
              <mesh geometry={geometry.standPost} material={material.steel} position={[0, 0.34, 0]} />
              <mesh geometry={geometry.standSaddle} material={material.steel} position={[0, 0.5, 0]} />
              {[0, 1, 2].map((leg) => (
                <mesh
                  key={leg}
                  geometry={geometry.standLeg}
                  material={material.frameSteel}
                  position={[
                    Math.cos((leg / 3) * Math.PI * 2) * 0.1,
                    0.2,
                    Math.sin((leg / 3) * Math.PI * 2) * 0.1,
                  ]}
                  rotation={[
                    Math.sin((leg / 3) * Math.PI * 2) * 0.28,
                    0,
                    -Math.cos((leg / 3) * Math.PI * 2) * 0.28,
                  ]}
                />
              ))}
            </group>
          ))
        : null}
    </group>
  );
}

/** Two-post lift, standing well back so it frames the bay without blocking it. */
function LiftPosts() {
  return (
    <>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 4.0, 0, -8.2]}>
          <mesh geometry={geometry.liftBase} material={material.frameSteel} position={[0, 0.04, 0]} />
          <mesh geometry={geometry.liftPost} material={material.yellow} position={[0, 1.5, 0]} />
          {/* one arm reaching in toward the bay, parked low */}
          <mesh
            geometry={geometry.liftArm}
            material={material.frameSteel}
            position={[-side * 0.55, 0.42, 0.3]}
            rotation={[0, side * 0.5, 0]}
          />
        </group>
      ))}
    </>
  );
}

/** Extra ceiling strip fittings, matching the two WorkshopLights already has. */
function CeilingStrips() {
  const y = garageHeight - 0.12;
  return (
    <>
      {[-3.4, -9.4].map((z) => (
        <group key={z} position={[0, y, z]}>
          {[-0.75, 0.75].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh geometry={geometry.stripHousing} material={material.frameSteel} />
              <mesh geometry={geometry.stripTube} material={material.lit} position={[0, -0.04, 0]} />
            </group>
          ))}
        </group>
      ))}
    </>
  );
}

/** Flat-to-the-wall details on the right, kept clear of the camera's line. */
function RightWallDetails({ detailed }: { detailed: boolean }) {
  return (
    <group position={[RIGHT - 0.02, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
      {/* cable reel and coiled air hose, up out of the way */}
      <group position={[-5.5, 2.5, 0]}>
        <mesh geometry={geometry.reelCheek} material={material.red} position={[0, 0, 0.09]} />
        <mesh geometry={geometry.reelDrum} material={material.frameSteel} />
        <mesh geometry={geometry.reelCheek} material={material.red} position={[0, 0, -0.09]} />
        <mesh geometry={geometry.hoseCoil} material={material.dark} rotation={[0, Math.PI / 2, 0]} />
      </group>

      {detailed ? (
        <>
          {/* fire extinguisher on its bracket */}
          <group position={[-3.2, 1.0, 0]}>
            <mesh geometry={geometry.extBracket} material={material.dark} position={[0, 0, 0.06]} />
            <mesh geometry={geometry.extBody} material={material.red} />
            <mesh geometry={geometry.extNeck} material={material.dark} position={[0, 0.24, 0]} />
          </group>
          {/* clock */}
          <mesh geometry={geometry.clockFace} material={material.paper} position={[-8.0, 2.8, 0]} rotation={[0, 0, Math.PI / 2]} />
          {/* a framed poster */}
          <group position={[-9.3, 2.1, 0]}>
            <mesh geometry={geometry.frame} material={material.dark} rotation={[0, Math.PI / 2, 0]} />
            <mesh geometry={geometry.framePaper} material={material.paper} position={[0, 0, 0.02]} />
          </group>
        </>
      ) : null}
    </group>
  );
}

/** Yellow/black bay markings, oil stains and a drip tray. */
function FloorDetails({ detailed }: { detailed: boolean }) {
  const y = 0.006;
  return (
    <group>
      {/* hazard hatching down the left edge of the bay */}
      <Instances geometry={geometry.floorStripe} material={material.yellow} limit={28}>
        {Array.from({ length: 14 }).map((_, i) => (
          <Instance
            key={i}
            position={[-2.25, y, -4.0 - i * 0.42]}
            rotation={[0, 0.6, 0]}
            scale={[1, 1, 0.52]}
          />
        ))}
      </Instances>

      {/* a plain bay outline on the other side, so the car reads as parked
          in a marked-out service bay rather than anywhere on the floor */}
      <mesh geometry={geometry.floorStripe} material={material.yellow} position={[2.25, y, -6.4]} scale={[0.7, 1, 5.2]} />

      {detailed ? (
        <>
          {/* old oil stains, kept off to the side of the car */}
          <mesh geometry={geometry.stain} material={material.oil} position={[-2.9, y - 0.001, -6.6]} scale={[0.5, 1, 0.34]} />
          <mesh geometry={geometry.stain} material={material.oil} position={[-3.4, y - 0.001, -5.5]} scale={[0.26, 1, 0.3]} />
          <mesh geometry={geometry.stain} material={material.oil} position={[3.2, y - 0.001, -8.6]} scale={[0.33, 1, 0.26]} />
          {/* drip tray */}
          <group position={[-2.1, 0, -7.4]} rotation={[0, 0.2, 0]}>
            <mesh geometry={geometry.trayBase} material={material.dark} position={[0, 0.012, 0]} />
            <mesh geometry={geometry.stain} material={material.oil} position={[0, 0.027, 0]} scale={[0.18, 1, 0.13]} />
          </group>
        </>
      ) : null}
    </group>
  );
}

/** A small service-bay sign on the back wall, in the brand accent. */
function WorkshopSign() {
  return (
    <group position={[-2.6, 2.6, BACK + 0.06]}>
      <mesh geometry={geometry.signPlate} material={material.dark} />
      <mesh geometry={geometry.signPlate} material={material.accent} scale={[0.92, 0.42, 0.9]} position={[0, 0, 0.012]} />
    </group>
  );
}

/** A faint wash of grime along the bottom of the side walls. */
function WallGrime() {
  return (
    <>
      {[
        { x: LEFT + 0.015, rotation: Math.PI / 2 },
        { x: RIGHT - 0.015, rotation: -Math.PI / 2 },
      ].map(({ x, rotation }) => (
        <mesh
          key={x}
          geometry={geometry.grime}
          material={material.grime}
          position={[x, 0.42, (frontZ + backZ) / 2]}
          rotation={[0, rotation, 0]}
          scale={[8.6, 0.85, 1]}
        />
      ))}
    </>
  );
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
  // Settled once on mount: this only ever runs in the browser (the whole
  // scene is loaded with ssr:false), and the answer can't change mid-session.
  const [detailed] = useState(() => !isLowEndDevice());

  return (
    <group>
      <Pegboard detailed={detailed} />
      <Workbench detailed={detailed} />
      <Tyres />
      <Drums />
      <JackAndStands detailed={detailed} />
      <LiftPosts />
      <CeilingStrips />
      <RightWallDetails detailed={detailed} />
      <FloorDetails detailed={detailed} />
      <WorkshopSign />
      <WallGrime />
    </group>
  );
}
