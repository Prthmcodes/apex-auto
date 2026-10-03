// Every colour used anywhere in the 3D scene, the HTML overlays, and the
// /book page lives here, as one of a handful of named presets. Switching
// `ACTIVE_THEME_NAME` below re-skins the entire site in one line — nothing
// else should ever hard-code a colour.

const TEAL = {
  background: "#060912",
  primary: "#19e3d0",
  accent: "#ffb347",
  ground: "#04050b",
  wall: "#11141c",
  roof: "#0a0c13",
  pillar: "#171b26",
  fog: { color: "#060912", near: 18, far: 55 },
  ambientSky: "#2b3a55",
  ambientGround: "#05060a",
  ambientSun: "#9db4d8",
  carSolid: "#05070d",
};

const AMBER_RED = {
  background: "#120805",
  primary: "#ff8a3d",
  accent: "#e0383f",
  ground: "#0c0603",
  wall: "#1c130c",
  roof: "#150e09",
  pillar: "#241710",
  fog: { color: "#120805", near: 18, far: 55 },
  ambientSky: "#4a2a1a",
  ambientGround: "#0a0503",
  ambientSun: "#d99a66",
  carSolid: "#140a06",
};

const ICE_BLUE = {
  background: "#070b14",
  primary: "#5ecbff",
  accent: "#d8f0ff",
  ground: "#050810",
  wall: "#111a26",
  roof: "#0a0f18",
  pillar: "#17212f",
  fog: { color: "#070b14", near: 18, far: 55 },
  ambientSky: "#2d4a6b",
  ambientGround: "#05080f",
  ambientSun: "#bfe6ff",
  carSolid: "#060a12",
};

export const THEME_PRESETS = {
  teal: TEAL,
  "amber-red": AMBER_RED,
  "ice-blue": ICE_BLUE,
};

export type ThemeName = keyof typeof THEME_PRESETS;
export type Theme = typeof TEAL;

// The one line to change to re-skin the whole site.
export const ACTIVE_THEME_NAME: ThemeName = "teal";

// Exported as a plain mutable object (a copy of the active preset, not the
// preset itself) so the dev-only query-param override below can swap its
// values in place — every file imports this same object by reference.
export const theme: Theme = { ...THEME_PRESETS[ACTIVE_THEME_NAME] };

/**
 * Dev-only live preview: swaps `theme`'s values in place for a different
 * preset. Only ever called from SceneGate's module scope (client-only,
 * never server-rendered), so this never runs on the shared Node.js server
 * process — mutating shared module state from a server request would leak
 * across users, which is why this isn't wired up anywhere SSR-reachable.
 */
export function applyThemeOverride(name: string | null): void {
  if (!name || !(name in THEME_PRESETS)) return;
  Object.assign(theme, THEME_PRESETS[name as ThemeName]);
}
