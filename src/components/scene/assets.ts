// Paths to the few real asset files the 3D scene loads (everything else is
// generated in code). See CREDITS.md for where each one came from.

/** The car model (Draco-compressed GLB). */
export const MODEL_URL = "/models/car.glb";

/**
 * The Draco decoder, served from this site (copied from three.js into
 * public/draco/) rather than Google's CDN, which drei would use by default.
 */
export const DRACO_PATH = "/draco/";

/** The dusk HDR used for reflections and soft fill light. */
export const ENVIRONMENT_URL = "/hdr/dusk.exr";
