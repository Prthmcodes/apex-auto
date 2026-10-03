"use client";

import { useMemo, useRef } from "react";
import { useEnvironment, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { layout } from "./layout";
import { siteContent } from "@/content/site";
import { theme } from "./theme";
import scrollState from "@/lib/scrollState";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { bandOpacity } from "./stageFade";
import { WHEELS_RANGE, engineReveal, sweepX, sweepStrength } from "./carStages";
import EngineBay from "./EngineBay";

import { MODEL_URL, DRACO_PATH, ENVIRONMENT_URL } from "./assets";

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
  uSweepX: { value: number };
  uSweep: { value: number };
  uSweepColor: { value: THREE.Color };
};

// Where the diagnostics sweep's real light sits, in the model's own space:
// level with the windows, out on the side the diagnostics camera views.
const SWEEP_LIGHT_HEIGHT = 1.25;
const SWEEP_LIGHT_SIDE_Z = -2.3;

/**
 * Adds two effects to a material's built-in shader: the see-through bonnet
 * (engine stage) and a soft vertical band of light that travels along the
 * body (diagnostics stage).
 */
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
        "uniform float uXray;\nuniform vec3 uXrayColor;\nuniform float uSweepX;\nuniform float uSweep;\nuniform vec3 uSweepColor;\nvarying vec3 vCarPos;\n#include <common>"
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        // The diagnostics sweep: a soft vertical band of light at uSweepX.
        float sweepOffset = (vCarPos.x - uSweepX) / 0.14;
        totalEmissiveRadiance += uSweepColor * exp(-sweepOffset * sweepOffset) * uSweep * 0.16;`
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
  material.customProgramCacheKey = () => "car-xray-sweep";
}

/** Swaps one of the model's materials for a tuned, realistic copy. */
function tuneMaterial(
  source: THREE.Material,
  uniforms: CarUniforms,
  envMap: THREE.Texture
): THREE.Material {
  const material = tuneMaterialType(source, uniforms);
  // The car gets its own reference to the HDR, so its reflections can be
  // stronger than the scene-wide environment light (three.js ignores a
  // material's envMapIntensity when it relies on the scene's environment).
  if (material instanceof THREE.MeshStandardMaterial) material.envMap = envMap;
  return material;
}

function tuneMaterialType(source: THREE.Material, uniforms: CarUniforms): THREE.Material {
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
      clearcoat: 0.5,
      clearcoatRoughness: 0.05,
      // Kept modest: stronger, and the workshop lights flare into a white
      // blob across the windscreen.
      envMapIntensity: 0.9,
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
        // Enough reflection to show the body's shape, not so much that
        // gloss black starts reading as silver.
        envMapIntensity: 0.75,
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
function prepareCar(source: THREE.Object3D, envMap: THREE.Texture) {
  const root = source.clone(true);
  const uniforms: CarUniforms = {
    uSceneInverse: { value: new THREE.Matrix4() },
    uXray: { value: 0 },
    uXrayColor: { value: new THREE.Color(theme.primary) },
    uSweepX: { value: 0 },
    uSweep: { value: 0 },
    uSweepColor: { value: new THREE.Color(theme.primary) },
  };

  const tuned = new Map<THREE.Material, THREE.Material>();
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    const original = child.material as THREE.Material;
    let replacement = tuned.get(original);
    if (!replacement) {
      replacement = tuneMaterial(original, uniforms, envMap);
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

/** Per-frame update: bonnet see-through, light sweep and wheel spin. */
function updateCar(car: PreparedCar, progress: number, reduced: boolean) {
  const { root, uniforms, wheels } = car;

  uniforms.uSceneInverse.value.copy(root.matrixWorld).invert();
  uniforms.uXray.value = engineReveal(progress, reduced);
  uniforms.uSweepX.value = sweepX(progress);
  uniforms.uSweep.value = sweepStrength(progress, reduced);

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
 * turns the bonnet see-through over the engine bay during "engine", and
 * runs a soft light sweep along the body during "diagnostics".
 */
export default function CarModel() {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH);
  const envMap = useEnvironment({ files: ENVIRONMENT_URL });
  const car = useMemo(() => prepareCar(scene, envMap), [scene, envMap]);
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
        <SweepLight />
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

/**
 * The real light that travels with the diagnostics sweep, so the glossy
 * paint, glass and wheels catch a moving reflection as well as the glow.
 * Always present (at zero brightness when idle): adding or removing a
 * light mid-scroll would make three.js rebuild every shader.
 */
function SweepLight() {
  const lightRef = useRef<THREE.PointLight>(null!);
  const reducedMotion = useReducedMotion();

  useFrame(() => {
    const progress = scrollState.progress;
    lightRef.current.position.set(sweepX(progress), SWEEP_LIGHT_HEIGHT, SWEEP_LIGHT_SIDE_Z);
    lightRef.current.intensity = 5 * sweepStrength(progress, reducedMotion.current);
  });

  return (
    <pointLight
      ref={lightRef}
      color={theme.rimLight}
      intensity={0}
      distance={4}
      decay={2}
    />
  );
}
