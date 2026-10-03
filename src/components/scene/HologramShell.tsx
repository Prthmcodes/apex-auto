"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import scrollState from "@/lib/scrollState";
import { siteContent } from "@/content/site";
import { theme } from "./theme";
import { GlowEdges } from "./HologramPart";

// The reveal is complete by the start of the diagnostics stage, so the car
// reads as "fully built" once the diagnostics beat begins.
const SOLIDIFY_COMPLETE_AT = siteContent.stages[4].range[0];

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uGlowColor;
  uniform vec3 uSolidColor;
  uniform float uSolidify;

  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    float rim = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.0);

    vec3 color = mix(uGlowColor, uSolidColor, uSolidify);
    color += uGlowColor * rim * (1.0 - uSolidify * 0.6);

    float baseAlpha = mix(0.07, 0.88, uSolidify);
    float alpha = clamp(baseAlpha + rim * 0.15, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`;

/**
 * The car's main body/cabin "shell": the same glowing teal edges as every
 * other hologram piece, but a custom shader fill that solidifies from a
 * faint translucent hologram into a dark, solid-looking surface as the
 * page scrolls — so the car looks "fully built" by the diagnostics stage.
 */
export default function HologramShell({
  geometry,
  dimRange,
  brightenAtX,
}: {
  geometry: THREE.BufferGeometry;
  dimRange?: readonly [number, number];
  brightenAtX?: number;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const uniforms = useMemo(
    () => ({
      uGlowColor: { value: new THREE.Color(theme.primary) },
      uSolidColor: { value: new THREE.Color(theme.carSolid) },
      uSolidify: { value: 0 },
    }),
    []
  );

  useFrame(() => {
    const solidify = THREE.MathUtils.clamp(
      scrollState.progress / SOLIDIFY_COMPLETE_AT,
      0,
      1
    );
    // Mutate through the ref, not the `uniforms` variable itself — three.js
    // uniforms are an inherently mutable, per-frame-updated object.
    materialRef.current.uniforms.uSolidify.value = solidify;
    // Once mostly solid, let it occlude things behind it like a real body panel.
    materialRef.current.depthWrite = solidify > 0.5;
  });

  return (
    <group>
      <mesh geometry={geometry}>
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <GlowEdges geometry={geometry} dimRange={dimRange} brightenAtX={brightenAtX} />
    </group>
  );
}
