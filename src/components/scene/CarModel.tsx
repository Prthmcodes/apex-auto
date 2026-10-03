"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { layout } from "./layout";
import { siteContent } from "@/content/site";
import { theme } from "./theme";
import scrollState from "@/lib/scrollState";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { bandOpacity } from "./stageFade";
import EngineBay from "./EngineBay";

const MODEL_URL = "/models/car.glb";
useGLTF.preload(MODEL_URL);

// How many full turns the wheels make over the entire page scroll. Tied to
// scroll progress, not elapsed time, so it never spins on its own — matches
// the old procedural car's convention.
const WHEEL_SPIN_TURNS = 4;
const AXLE_AXIS = new THREE.Vector3(0, 0, 1);

// Node names from the optimised car.glb (logged via gltf-transform inspect
// — Sketchfab's export leaves meshes generically named "Object_N", but each
// wheel's own node translation sits exactly at that wheel's hub centre, so
// spinning is a rotation around local Z applied in the node's own parent
// space, not a hand-placed pivot). The front, -Z wheel is the one the
// "wheels" stage camera and cameraPath.ts's FRONT_WHEEL focus on.
const WHEELS = [
  { tyre: "Object_4", spinWith: ["Object_34", "Object_36"], caliper: "Object_35" },
  { tyre: "Object_28", spinWith: ["Object_31", "Object_30"], caliper: "Object_32" },
  { tyre: "Object_24", spinWith: [], caliper: null },
  { tyre: "Object_26", spinWith: [], caliper: null },
] as const;

const WHEELS_STAGE_RANGE = siteContent.stages[2].range;

// The real hub centre of the front, -Z wheel (Object_4's own translation —
// see WHEELS above), in the model's original local space. Used to place
// the brake-disc highlight ring without needing the runtime centre offset.
const FOCUS_WHEEL_LOCAL: [number, number, number] = [1.607, 0.428, -1.171];

// The bonnet region, in the model's own untransformed local space (the GLB
// has no separate hood node — confirmed via gltf-transform inspect, every
// mesh is a generic flattened "Object_N" — so instead of hinging a hood,
// the paint shader fades to translucent over this box so the procedural
// x-ray engine bay (EngineBay.tsx) reads as visible underneath it).
const BONNET_LOCAL = { xMin: 1.05, xMax: 2.3, yMin: 0.92, yMax: 1.38 };

function applyBonnetXray(material: THREE.MeshPhysicalMaterial) {
  material.transparent = true;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "varying vec3 vLocalPosition;\n#include <common>"
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvLocalPosition = position;"
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "varying vec3 vLocalPosition;\n#include <common>"
      )
      .replace(
        "#include <output_fragment>",
        `
        float bonnetX = smoothstep(${BONNET_LOCAL.xMin.toFixed(2)}, ${(BONNET_LOCAL.xMin + 0.35).toFixed(2)}, vLocalPosition.x)
          * (1.0 - smoothstep(${(BONNET_LOCAL.xMax - 0.35).toFixed(2)}, ${BONNET_LOCAL.xMax.toFixed(2)}, vLocalPosition.x));
        float bonnetY = smoothstep(${BONNET_LOCAL.yMin.toFixed(2)}, ${(BONNET_LOCAL.yMin + 0.1).toFixed(2)}, vLocalPosition.y)
          * (1.0 - smoothstep(${(BONNET_LOCAL.yMax - 0.1).toFixed(2)}, ${BONNET_LOCAL.yMax.toFixed(2)}, vLocalPosition.y));
        float bonnetMask = bonnetX * bonnetY;
        diffuseColor.a = mix(diffuseColor.a, 0.22, bonnetMask);
        #include <output_fragment>
        `
      );
  };
}

/**
 * Loads the real car.glb, auto-centres and grounds it, applies the realism
 * material pass (gloss black clearcoat paint with a translucent bonnet
 * patch, true see-through glass, dark tyres), and spins the wheels with
 * scroll. See PROGRESS.md's Phase 8B entry for the node/material names
 * logged while building this.
 */
export default function CarModel() {
  const { scene, nodes, materials } = useGLTF(MODEL_URL);
  const reducedMotion = useReducedMotion();
  const wheelBases = useRef<Map<string, THREE.Quaternion>>(new Map());

  // Auto-centre on X/Z and rest the lowest point (the tyres) on Y=0, so the
  // car sits correctly regardless of how the source model happened to be
  // authored — computed from the model's own geometry, never hard-coded.
  const centerOffset = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    return [-center.x, -box.min.y, -center.z] as [number, number, number];
  }, [scene]);

  useEffect(() => {
    console.log(
      "[CarModel] nodes:",
      Object.keys(nodes).join(", ")
    );
    console.log(
      "[CarModel] materials:",
      Object.keys(materials).join(", ")
    );

    const paint = materials.Car_Paint as THREE.MeshPhysicalMaterial | undefined;
    if (paint) {
      paint.color = new THREE.Color(siteContent.carColor);
      paint.roughness = 0.35;
      paint.metalness = 0.6;
      paint.clearcoat = 1;
      paint.clearcoatRoughness = 0.05;
      paint.envMapIntensity = 1.2;
      applyBonnetXray(paint);
      paint.needsUpdate = true;
    }

    const tyre = materials.Tyre as THREE.MeshStandardMaterial | undefined;
    if (tyre) {
      tyre.roughness = Math.max(tyre.roughness, 0.85);
      tyre.envMapIntensity = 0.4;
    }

    // Replace the glass-family materials with true transmissive glass —
    // the file has no KHR_materials_transmission, so without this they're
    // opaque surfaces that only read as "glass" via reflections, which go
    // solid black with no environment map lighting them.
    const glassNames = ["Glass", "Trasnsparent_Glass", "Yellow_Glass"];
    const glassMaterials = new Map<string, THREE.MeshPhysicalMaterial>();
    for (const name of glassNames) {
      const existing = materials[name];
      if (!existing) continue;
      const tint = name === "Yellow_Glass" ? "#3a3a28" : "#1a1d22";
      const glass = new THREE.MeshPhysicalMaterial({
        color: tint,
        transmission: 0.88,
        roughness: 0.12,
        thickness: 0.4,
        ior: 1.5,
        metalness: 0,
        clearcoat: 0.4,
        clearcoatRoughness: 0.1,
        side: THREE.DoubleSide,
      });
      glassMaterials.set(name, glass);
    }
    if (glassMaterials.size > 0) {
      scene.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const replacement = glassMaterials.get(child.material?.name);
        if (replacement) child.material = replacement;
      });
    }
  }, [nodes, materials, scene]);

  // Capture each spinning wheel node's original (static) orientation once,
  // so every frame can set an absolute spin angle from scroll progress
  // instead of accumulating a delta — consistent with the rest of the
  // scene, and correct when the user scrolls backward.
  useEffect(() => {
    for (const wheel of WHEELS) {
      for (const name of [wheel.tyre, ...wheel.spinWith]) {
        const node = nodes[name];
        if (node && !wheelBases.current.has(name)) {
          wheelBases.current.set(name, node.quaternion.clone());
        }
      }
    }
  }, [nodes]);

  useFrame(() => {
    const angle = reducedMotion.current
      ? 0
      : -scrollState.progress * WHEEL_SPIN_TURNS * Math.PI * 2;

    for (const wheel of WHEELS) {
      for (const name of [wheel.tyre, ...wheel.spinWith]) {
        const node = nodes[name];
        const base = wheelBases.current.get(name);
        if (!node || !base) continue;
        node.quaternion.copy(base);
        node.rotateOnWorldAxis(AXLE_AXIS, angle);
      }
    }
  });

  return (
    <group position={layout.car.position} rotation={layout.car.rotation}>
      <group position={centerOffset}>
        <primitive object={scene} />
        <EngineBay />
        <BrakeDiscHighlight />
      </group>
    </group>
  );
}

const discRingGeometry = new THREE.TorusGeometry(0.17, 0.012, 8, 32);

/**
 * A thin glowing ring laid over the front wheel's real brake disc during
 * the "wheels" stage — an accent on top of the GLB's own geometry rather
 * than a material swap, so it doesn't depend on guessing which THREE
 * material class the model's disc node happened to load as.
 */
function BrakeDiscHighlight() {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null!);
  const reducedMotion = useReducedMotion();

  useFrame(() => {
    const opacity = reducedMotion.current
      ? bandOpacity(scrollState.progress, WHEELS_STAGE_RANGE, 0.001)
      : bandOpacity(scrollState.progress, WHEELS_STAGE_RANGE);
    materialRef.current.opacity = opacity * 0.9;
  });

  return (
    <mesh
      position={FOCUS_WHEEL_LOCAL}
      rotation={[0, Math.PI / 2, 0]}
      geometry={discRingGeometry}
    >
      <meshBasicMaterial
        ref={materialRef}
        color={theme.primary}
        transparent
        opacity={0}
        toneMapped={false}
      />
    </mesh>
  );
}
