"use client";

import { useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { layout } from "./layout";
import { siteContent } from "@/content/site";
import { theme } from "./theme";
import scrollState from "@/lib/scrollState";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { bandOpacity } from "./stageFade";
import { WHEELS_RANGE, engineReveal } from "./carStages";
import EngineBay from "./EngineBay";

export const MODEL_URL = "/models/car.glb";
// The Draco decoder is served from this site (copied from three.js into
// public/draco/), not from Google's CDN, which drei would use by default.
export const DRACO_PATH = "/draco/";
useGLTF.preload(MODEL_URL, DRACO_PATH);

// How many full turns the wheels make over the entire page scroll. Tied to
// scroll progress, not elapsed time, so it never spins on its own.
const WHEEL_SPIN_TURNS = 4;
// The wheels' axle direction in the model's own space.
const AXLE_AXIS = new THREE.Vector3(0, 0, 1);

// Node names from car.glb. Sketchfab's export names meshes generically
// ("Object_N"), but each wheel node's own origin sits exactly at that
// wheel's hub, so spinning a node in place spins the wheel. Each front
// wheel is four parts (tyre, tyre wall, silver brake disc, black spokes);
// each rear wheel is one. The red brake calipers are part of the body and
// stay still, as real ones do. The front wheel on the -Z side is the one
// the "wheels" camera looks at.
const SPINNING_NODES = [
  "Object_4", "Object_34", "Object_35", "Object_36", // front, -Z (focus wheel)
  "Object_28", "Object_30", "Object_31", "Object_32", // front, +Z
  "Object_24", // rear, -Z
  "Object_26", // rear, +Z
];
// The focus wheel's hub centre and the plane of its outer face, in the
// model's own space (measured from Object_4's geometry). The brake-disc
// highlight ring sits here, just proud of the wheel.
const FOCUS_HUB: [number, number, number] = [1.607, 0.428, -1.29];
const discRingGeometry = new THREE.TorusGeometry(0.27, 0.0035, 8, 64);
const discHaloGeometry = new THREE.RingGeometry(0.25, 0.29, 64);

// The bonnet, in the model's own space (X is front to back, Y is up). The
// paint turns see-through above BONNET_MIN_Y and forward of BONNET_REAR_X
// during the "engine" stage, revealing the engine bay (EngineBay.tsx).
// The model has no separate bonnet part, so it can't swing open; this is
// the fallback agreed in the Phase 8B brief.
const BONNET_REAR_X = 1.08;
const BONNET_MIN_Y = 0.92;

const GLASS_MATERIALS = ["Glass", "Trasnsparent_Glass", "Yellow_Glass"];
// Everything that can sit on top of the bonnet (paint, the carbon bonnet
// panel itself, the badge lettering, grille trim) fades with the x-ray.
// Headlights are left solid so the car's face stays recognisable.
const XRAY_MATERIALS = ["Car_Paint", "Carbon", "Plastic", "Metalic", "Black_Metal", "Red_Metal", "Reflectors"];

type CarUniforms = {
  uSceneInverse: { value: THREE.Matrix4 };
  uXray: { value: number };
  uXrayColor: { value: THREE.Color };
};

/** Adds the see-through-bonnet effect to a material's built-in shader. */
function addBonnetXray(material: THREE.MeshStandardMaterial, uniforms: CarUniforms) {
  material.transparent = true;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "uniform mat4 uSceneInverse;\nvarying vec3 vCarPos;\n#include <common>"
      )
      .replace(
        "#include <project_vertex>",
        // The vertex's position in the car model's own space, whatever
        // scaling/rotation each individual mesh node carries.
        "#include <project_vertex>\nvCarPos = (uSceneInverse * modelMatrix * vec4(transformed, 1.0)).xyz;"
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "uniform float uXray;\nuniform vec3 uXrayColor;\nvarying vec3 vCarPos;\n#include <common>"
      )
      .replace(
        "#include <opaque_fragment>",
        `
        float bonnet = smoothstep(${BONNET_REAR_X.toFixed(3)}, ${(BONNET_REAR_X + 0.2).toFixed(3)}, vCarPos.x)
          * smoothstep(${BONNET_MIN_Y.toFixed(3)}, ${(BONNET_MIN_Y + 0.08).toFixed(3)}, vCarPos.y);
        float xray = bonnet * uXray;
        // A faint accent tint along the edge of the see-through area, so it
        // reads as a deliberate cut-away rather than a rendering glitch.
        float rim = xray * (1.0 - xray) * 4.0;
        outgoingLight += uXrayColor * rim * 0.06;
        diffuseColor.a = mix(diffuseColor.a, 0.1, xray);
        #include <opaque_fragment>
        `
      );
  };
  // Stops three.js reusing a cached copy of the plain shader for this one.
  material.customProgramCacheKey = () => "car-bonnet-xray";
}

/** Swaps one of the model's materials for a tuned, realistic copy. */
function tuneMaterial(source: THREE.Material, uniforms: CarUniforms): THREE.Material {
  const name = source.name;

  if (GLASS_MATERIALS.includes(name)) {
    // Plain tinted glass rather than true "transmission" glass, which costs
    // an extra full render of the scene every frame. Dark privacy glass
    // suits a black SUV and still shows the HDR's reflections.
    const isHeadlamp = name === "Trasnsparent_Glass";
    const isIndicator = name === "Yellow_Glass";
    return new THREE.MeshPhysicalMaterial({
      name,
      color: isHeadlamp
        ? theme.headlampGlass
        : isIndicator
          ? theme.indicatorGlass
          : theme.glassTint,
      metalness: 0,
      roughness: 0.04,
      transparent: true,
      opacity: isHeadlamp ? 0.18 : isIndicator ? 0.55 : 0.72,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      envMapIntensity: 1.6,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }

  const material = source.clone() as THREE.MeshStandardMaterial;

  switch (name) {
    case "Car_Paint": {
      const paint = new THREE.MeshPhysicalMaterial({
        name,
        color: siteContent.carColor,
        metalness: 0.35,
        roughness: 0.4,
        clearcoat: 1,
        // A touch of softness hides the model's slightly uneven panels,
        // which a perfect mirror finish shows up as crinkles.
        clearcoatRoughness: 0.14,
        envMapIntensity: 1.4,
      });
      addBonnetXray(paint, uniforms);
      return paint;
    }
    case "Tyre":
      material.color.set(theme.tyreTint);
      material.metalness = 0;
      material.roughness = 0.88;
      material.envMapIntensity = 0.35;
      break;
    case "Carbon":
      // The model's carbon-fibre bonnet: keep its weave, lose the odd
      // fully-metallic setting it was exported with.
      material.metalness = 0.3;
      material.roughness = 0.45;
      break;
    case "Reflectors":
      material.metalness = 0.25;
      break;
    case "Metalic":
      // Wheel spokes and trim: polished alloy rather than a perfect mirror.
      material.roughness = 0.18;
      material.envMapIntensity = 1.3;
      break;
    case "Head_Light":
      material.emissive.set(theme.headlampGlow);
      material.emissiveIntensity = 0.35;
      break;
    case "Tail_Light":
      material.emissive.set(theme.tailLampGlow);
      material.emissiveIntensity = 0.5;
      break;
  }
  if (XRAY_MATERIALS.includes(name)) addBonnetXray(material, uniforms);
  return material;
}

/**
 * Makes this component's own copy of the loaded model (the copy useGLTF
 * returns is shared and cached, so it must never be edited directly), with
 * tuned materials and handles on the parts that move.
 */
function prepareCar(source: THREE.Object3D) {
  const root = source.clone(true);
  const uniforms: CarUniforms = {
    uSceneInverse: { value: new THREE.Matrix4() },
    uXray: { value: 0 },
    uXrayColor: { value: new THREE.Color(theme.primary) },
  };

  const tuned = new Map<THREE.Material, THREE.Material>();
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    const original = child.material as THREE.Material;
    let replacement = tuned.get(original);
    if (!replacement) {
      replacement = tuneMaterial(original, uniforms);
      tuned.set(original, replacement);
    }
    child.material = replacement;
    // Draw glass after the paint, so the see-through bonnet and the glass
    // never fight over which one is in front.
    if (GLASS_MATERIALS.includes(original.name)) child.renderOrder = 1;
  });

  const wheels = SPINNING_NODES.flatMap((name) => {
    const node = root.getObjectByName(name);
    return node ? [{ node, rest: node.quaternion.clone() }] : [];
  });

  // Centre on X/Z and rest the lowest point (the tyres) on Y=0, computed
  // from the model's own geometry, never hard-coded.
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const offset: [number, number, number] = [-centre.x, -box.min.y, -centre.z];
  const scale = layout.car.length / size.x;

  return { root, uniforms, wheels, offset, scale };
}

type PreparedCar = ReturnType<typeof prepareCar>;

/** Per-frame update: bonnet see-through and wheel spin. */
function updateCar(car: PreparedCar, progress: number, reduced: boolean) {
  const { root, uniforms, wheels } = car;

  uniforms.uSceneInverse.value.copy(root.matrixWorld).invert();
  uniforms.uXray.value = engineReveal(progress, reduced);

  const angle = reduced ? 0 : -progress * WHEEL_SPIN_TURNS * Math.PI * 2;
  for (const { node, rest } of wheels) {
    node.quaternion.copy(rest);
    // Rotates around the axle in the model's own space (the node's
    // parent), not the node's own tilted axes.
    node.rotateOnWorldAxis(AXLE_AXIS, angle);
  }
}

/**
 * The real car: loads car.glb, centres and grounds it, applies the realism
 * material pass (gloss black clearcoat paint, dark glass, rubber tyres),
 * spins the wheels with scroll, rings the front brake disc during "wheels",
 * and turns the bonnet see-through over the engine bay during "engine".
 */
export default function CarModel() {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH);
  const car = useMemo(() => prepareCar(scene), [scene]);
  const reducedMotion = useReducedMotion();

  useFrame(() => {
    updateCar(car, scrollState.progress, reducedMotion.current);
  });

  return (
    <group
      position={layout.car.position}
      rotation={layout.car.rotation}
      scale={car.scale}
    >
      <group position={car.offset}>
        <primitive object={car.root} />
        <EngineBay />
        <BrakeDiscHighlight />
      </group>
    </group>
  );
}

/**
 * A thin glowing ring and soft halo over the front wheel's brake disc
 * during the "wheels" stage, like a configurator hotspot. Sits on top of
 * the model rather than recolouring it: the disc, spokes and tyre are all
 * one textured mesh in this model, so there's no separate disc to light.
 */
function BrakeDiscHighlight() {
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null!);
  const haloMaterial = useRef<THREE.MeshBasicMaterial>(null!);
  const reducedMotion = useReducedMotion();

  useFrame(() => {
    const amount = bandOpacity(
      scrollState.progress,
      WHEELS_RANGE,
      reducedMotion.current ? 0.001 : 0.04
    );
    ringMaterial.current.opacity = 0.55 * amount;
    haloMaterial.current.opacity = 0.04 * amount;
  });

  return (
    <group position={FOCUS_HUB} rotation={[Math.PI, 0, 0]}>
      <mesh geometry={discHaloGeometry} renderOrder={2}>
        <meshBasicMaterial
          ref={haloMaterial}
          color={theme.primary}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh geometry={discRingGeometry} renderOrder={2}>
        <meshBasicMaterial
          ref={ringMaterial}
          color={theme.primary}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
