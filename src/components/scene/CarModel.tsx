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

// The four wheel groups in car.glb.
//
// These are the model's own named groups, one per wheel. An earlier
// version of this file span ten "Object_N" mesh nodes instead, which
// worked only by accident: the old, over-compressed car.glb had been run
// through gltf-transform's `flatten`, which collapsed the hierarchy and
// left every mesh node carrying its wheel's hub position. Rebuilding the
// model without that step (see scripts/optimise-car.mjs) restored the
// real hierarchy — the mesh nodes now sit at the model's origin inside
// these groups — so spinning them swung each wheel out flat around the
// middle of the car. Spinning the named groups is what was always meant.
//
// The brake groups ("FR Brake_29", "FL Brake_30" — disc and caliper) are
// deliberately left out: they stay still.
const WHEEL_NODES = [
  "FL Wheel_24", // front, -Z (the wheel the "wheels" camera looks at)
  "FR Wheel_28", // front, +Z
  "BL Wheel_26", // rear, -Z
  "BR Wheel_27", // rear, +Z
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
  uSweepLightPosition: { value: THREE.Vector3 };
  uSweepLightColor: { value: THREE.Color };
};

// Where the diagnostics sweep's light sits, in the model's own space:
// level with the windows, out on the side the diagnostics camera views.
const SWEEP_LIGHT_HEIGHT = 1.25;
const SWEEP_LIGHT_SIDE_Z = -2.3;
const SWEEP_LIGHT_INTENSITY = 5;
// How far the sweep light reaches, in metres (the reach of the real point
// light it replaces).
const SWEEP_LIGHT_DISTANCE = 4;

/**
 * Adds the car's own effects to a material's built-in shader:
 *
 * - the diagnostics sweep light, on every car material. It used to be a
 *   real three.js point light, but a real light is paid for on every lit
 *   pixel of the whole scene (walls, floor, props) in every stage, even at
 *   zero brightness — for something that only ever lights the car, and
 *   only during "diagnostics". This evaluates the very same point-light
 *   maths three.js uses (getDistanceAttenuation and RE_Direct), but only
 *   here, and skips it entirely while the sweep is off.
 * - for the x-ray materials only (`xray`): the see-through bonnet (engine
 *   stage) and a soft vertical band of light that travels along the body
 *   (diagnostics stage).
 */
function addCarShader(
  material: THREE.MeshStandardMaterial,
  uniforms: CarUniforms,
  xray: boolean
) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    let fragment = shader.fragmentShader
      .replace(
        "#include <common>",
        "uniform vec3 uSweepLightPosition;\nuniform vec3 uSweepLightColor;\n#include <common>"
      )
      .replace(
        "#include <lights_fragment_begin>",
        `#include <lights_fragment_begin>
        if ( uSweepLightColor != vec3( 0.0 ) ) {
          vec3 sweepVector = uSweepLightPosition - geometryPosition;
          directLight.direction = normalize( sweepVector );
          directLight.color = uSweepLightColor * getDistanceAttenuation( length( sweepVector ), ${SWEEP_LIGHT_DISTANCE.toFixed(1)}, 2.0 );
          directLight.visible = true;
          RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
        }`
      );

    if (xray) {
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
      fragment = fragment
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
    }
    shader.fragmentShader = fragment;
  };
  // Stops three.js reusing a cached copy of the plain shader for these.
  const key = xray ? "car-xray-sweep" : "car-sweep";
  material.customProgramCacheKey = () => key;
}

/**
 * Swaps one of the model's materials for a tuned, realistic copy.
 * `transparent` only matters for the x-ray materials: true for the copy
 * used on the bonnet's triangles, false for the rest of the car.
 */
function tuneMaterial(
  source: THREE.Material,
  uniforms: CarUniforms,
  envMap: THREE.Texture,
  transparent = false
): THREE.Material {
  const material = tuneMaterialType(source);
  if (material instanceof THREE.MeshStandardMaterial) {
    // The car gets its own reference to the HDR, so its reflections can be
    // stronger than the scene-wide environment light (three.js ignores a
    // material's envMapIntensity when it relies on the scene's environment).
    material.envMap = envMap;
    const xray = XRAY_MATERIALS.includes(source.name);
    // Only the bonnet's own triangles get a transparent copy (see
    // splitOutBonnet). Everything else is drawn opaque: same shader, same
    // look, but depth-sorted front to back with no blending, instead of the
    // half-million-triangle car being sorted and blended every frame.
    if (xray) material.transparent = transparent;
    addCarShader(material, uniforms, xray);
  }
  return material;
}

function tuneMaterialType(source: THREE.Material): THREE.Material {
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
  return material;
}

/**
 * Splits a mesh's triangles into the ones the bonnet x-ray can reach and
 * the rest, so only the first group needs to be drawn transparent.
 *
 * The x-ray in the shader only ever affects points forward of
 * BONNET_REAR_X and above BONNET_MIN_Y (in the car model's own space): its
 * smoothsteps are exactly zero everywhere else. So a triangle whose
 * bounding box doesn't reach into that corner can never turn see-through,
 * and can be drawn opaque with no visible difference. Measured on bounding
 * boxes rather than vertices so a triangle that merely straddles the
 * corner still counts as bonnet.
 *
 * Returns two new geometries that SHARE the original's vertex data (only
 * the triangle lists differ), so this costs no extra GPU memory for
 * vertices. The cached model's own geometry is never modified.
 */
function splitOutBonnet(mesh: THREE.Mesh, toCarSpace: THREE.Matrix4) {
  const geometry = mesh.geometry;
  if (geometry.groups.length > 0) return null;
  const position = geometry.attributes.position;
  const index = geometry.index;
  const triangleCount = (index ? index.count : position.count) / 3;

  // Every vertex in car space, once.
  const carX = new Float32Array(position.count);
  const carY = new Float32Array(position.count);
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i).applyMatrix4(toCarSpace);
    carX[i] = v.x;
    carY[i] = v.y;
  }

  const bonnet: number[] = [];
  const rest: number[] = [];
  for (let t = 0; t < triangleCount; t += 1) {
    const a = index ? index.getX(t * 3) : t * 3;
    const b = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const c = index ? index.getX(t * 3 + 2) : t * 3 + 2;
    const maxX = Math.max(carX[a], carX[b], carX[c]);
    const maxY = Math.max(carY[a], carY[b], carY[c]);
    const target = maxX > BONNET_REAR_X && maxY > BONNET_MIN_Y ? bonnet : rest;
    target.push(a, b, c);
  }
  if (bonnet.length === 0) return null;

  const withIndex = (list: number[]) => {
    const part = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(geometry.attributes)) {
      part.setAttribute(name, attribute);
    }
    part.setIndex(list);
    part.computeBoundingBox();
    part.computeBoundingSphere();
    return part;
  };
  return {
    bonnet: withIndex(bonnet),
    rest: rest.length ? withIndex(rest) : null,
  };
}

// Raycasting the car would mean testing half a million triangles, so its
// meshes opt out of pointer picking entirely; only the tools are
// clickable. (R3F only raycasts objects with pointer handlers today, so
// this is a guard against a future handler higher up the tree.)
const noRaycast: THREE.Object3D["raycast"] = () => {};

/**
 * Hangs one wheel off a new pivot group placed exactly at the centre of
 * that wheel, so rotating the pivot turns the wheel on the spot.
 *
 * The centre is measured from the wheel's own geometry rather than read
 * off the node, so this keeps working whatever a future model file does
 * with its node origins — that assumption is precisely what broke the
 * last time the car was recompressed.
 *
 * The pivot inherits the model's own axes, in which X runs front to back,
 * Y is up and Z is the car's left-right (axle) direction — so turning the
 * pivot about its local Z is turning the wheel about its axle.
 */
function makeWheelPivot(node: THREE.Object3D) {
  const parent = node.parent!;
  parent.updateWorldMatrix(true, true);

  // setFromObject reports world space, so bring the centre back into the
  // frame the pivot will actually live in.
  const centre = new THREE.Box3()
    .setFromObject(node)
    .getCenter(new THREE.Vector3());
  parent.worldToLocal(centre);

  const pivot = new THREE.Group();
  pivot.name = `${node.name} pivot`;
  pivot.position.copy(centre);
  parent.add(pivot);

  // add() re-parents, so the wheel's position is now read relative to the
  // pivot: take the pivot's own offset back out to leave the wheel
  // standing exactly where it already was.
  pivot.add(node);
  node.position.sub(centre);

  return pivot;
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
    uSweepLightPosition: { value: new THREE.Vector3() },
    uSweepLightColor: { value: new THREE.Color(0, 0, 0) },
  };

  // Two tuned copies per x-ray material: opaque for most of the car,
  // transparent for the bonnet's own triangles.
  const tuned = new Map<THREE.Material, THREE.Material>();
  const tunedSeeThrough = new Map<THREE.Material, THREE.Material>();
  const tunedFor = (original: THREE.Material, transparent: boolean) => {
    const cache = transparent ? tunedSeeThrough : tuned;
    let replacement = cache.get(original);
    if (!replacement) {
      replacement = tuneMaterial(original, uniforms, envMap, transparent);
      cache.set(original, replacement);
    }
    return replacement;
  };

  root.updateWorldMatrix(true, true);
  const toCarSpace = new THREE.Matrix4();
  const rootInverse = root.matrixWorld.clone().invert();

  const meshes: THREE.Mesh[] = [];
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) meshes.push(child);
  });
  for (const child of meshes) {
    child.castShadow = true;
    child.receiveShadow = true;
    child.raycast = noRaycast;
    const original = child.material as THREE.Material;
    child.material = tunedFor(original, false);
    // Draw glass after the paint, so the see-through bonnet and the glass
    // never fight over which one is in front.
    if (GLASS_MATERIALS.includes(original.name)) child.renderOrder = 1;

    if (!XRAY_MATERIALS.includes(original.name)) continue;
    toCarSpace.multiplyMatrices(rootInverse, child.matrixWorld);
    const parts = splitOutBonnet(child, toCarSpace);
    if (!parts) continue;

    // The bonnet's triangles: a sibling with exactly the same transform,
    // drawn with the transparent copy of the material.
    const bonnet = new THREE.Mesh(parts.bonnet, tunedFor(original, true));
    bonnet.name = `${child.name} (bonnet)`;
    bonnet.position.copy(child.position);
    bonnet.quaternion.copy(child.quaternion);
    bonnet.scale.copy(child.scale);
    bonnet.castShadow = true;
    bonnet.receiveShadow = true;
    bonnet.renderOrder = child.renderOrder;
    bonnet.raycast = noRaycast;
    child.parent!.add(bonnet);

    if (parts.rest) child.geometry = parts.rest;
    else child.visible = false;
  }

  const wheels = WHEEL_NODES.flatMap((name) => {
    const node = root.getObjectByName(name);
    if (!node?.parent) return [];
    return [makeWheelPivot(node)];
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

const sweepLightColor = new THREE.Color(theme.rimLight);

/** Per-frame update: bonnet see-through, light sweep and wheel spin. */
function updateCar(car: PreparedCar, progress: number, reduced: boolean, camera: THREE.Camera) {
  const { root, uniforms, wheels } = car;

  uniforms.uSceneInverse.value.copy(root.matrixWorld).invert();
  uniforms.uXray.value = engineReveal(progress, reduced);
  uniforms.uSweepX.value = sweepX(progress);
  uniforms.uSweep.value = sweepStrength(progress, reduced);

  // The sweep light: placed in the car's own space, then taken to the
  // camera's view space, which is the space three.js lights its pixels in.
  // Zero colour switches it off in the shader.
  const sweep = sweepStrength(progress, reduced);
  uniforms.uSweepLightColor.value
    .copy(sweepLightColor)
    .multiplyScalar(SWEEP_LIGHT_INTENSITY * sweep);
  uniforms.uSweepLightPosition.value
    .set(sweepX(progress), SWEEP_LIGHT_HEIGHT, SWEEP_LIGHT_SIDE_Z)
    .applyMatrix4(root.matrixWorld)
    .applyMatrix4(camera.matrixWorldInverse);

  const angle = reduced ? 0 : -progress * WHEEL_SPIN_TURNS * Math.PI * 2;
  for (const pivot of wheels) {
    // Each pivot sits at its wheel's centre and starts unrotated, so this
    // one assignment turns the wheel about its axle and nothing else.
    // Setting the angle outright (rather than adding to it) keeps the
    // wheels tied to scroll position, so scrolling back unwinds them.
    pivot.rotation.z = angle;
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

  useFrame(({ camera }) => {
    updateCar(car, scrollState.progress, reducedMotion.current, camera);
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
