"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { theme } from "./theme";
import { exteriorTexture } from "./exteriorTextures";

/**
 * A dusk sky behind everything.
 *
 * The scene used to be a flat background colour, which is fine when the
 * only thing on screen is a lit garage a long way off, and much less fine
 * once you are standing in the street looking at a roofline: the top
 * third of the frame was dead black. This is one big sphere with a
 * vertical gradient painted on it — dark overhead, lighter towards the
 * horizon, and a faint warm band where a town sits just out of sight.
 *
 * Two details that matter. The gradient's bottom end is the fog colour,
 * because distant ground fades to exactly that and any disagreement shows
 * up as a hard line across the horizon. And the sphere ignores fog itself
 * — fogging the sky would wash the whole gradient to a flat colour, which
 * is the thing it exists to avoid.
 */
function SkyDome() {
  const sky = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({
      map: exteriorTexture.sky(),
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(92, 24, 16), material);
    // Drawn first, so everything else lands in front of it.
    mesh.renderOrder = -1;
    mesh.matrixAutoUpdate = false;
    mesh.frustumCulled = false;
    return mesh;
  }, []);

  return <primitive object={sky} />;
}

export default function Atmosphere() {
  return (
    <>
      <color attach="background" args={[theme.background]} />
      <fog attach="fog" args={[theme.fog.color, theme.fog.near, theme.fog.far]} />
      <SkyDome />
      <hemisphereLight args={[theme.ambientSky, theme.ambientGround, 0.5]} />
      {/* The one soft key light, low and warm-cool for dusk — casts the
          scene's only real-time shadows (skipped renderer-wide on
          low-end devices via Canvas's `shadows` prop in Experience.tsx). */}
      <directionalLight
        position={[-14, 10, 12]}
        intensity={0.45}
        color={theme.ambientSun}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0015}
      />
    </>
  );
}
