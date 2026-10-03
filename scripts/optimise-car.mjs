#!/usr/bin/env node
// Rebuilds public/models/car.glb from the untouched original in
// source-assets/car-original.glb.
//
// Usage:
//   node scripts/optimise-car.mjs
//
// Why this exists as a script rather than a one-off command: the first pass
// at this used `gltf-transform optimize`, whose defaults run `simplify` —
// mesh decimation that threw away ~72% of the car's triangles. On organic
// shapes you'd never notice; on a car it collapses the big, gently curved
// panels (doors, front wing, bonnet) into visible dents and creases. The
// car looked like it had been in a crash.
//
// So: NO simplify here, deliberately. Every step below is either lossless
// or touches textures only. Size is won back with Draco compression and
// smaller textures instead, which cost nothing visible.

import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  draco,
  prune,
  textureCompress,
  weld,
} from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import sharp from "sharp";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const INPUT = path.join(ROOT, "source-assets", "car-original.glb");
const OUTPUT = path.join(ROOT, "public", "models", "car.glb");

// Textures: the original ships three 4096px maps, which is far more detail
// than a car filling part of the screen can show. 1024 is the point where
// shrinking further starts to be visible on the paint flake and panel seams.
const MAX_TEXTURE_SIZE = 1024;

// Draco quantisation, in bits per value. Higher = more precise = bigger file.
// These sit above gltf-transform's defaults (position 14, normal 10) because
// the defaults are tuned for general meshes, and a car's near-flat panels are
// the worst case for both:
//   - position 16 over a ~5m car is ~0.07mm per step, well below anything
//     the eye can pick up as a kink along a door shut line.
//   - normal 12 matters most: smooth panels are large areas of very slowly
//     changing normals, and at 10 bits the steps show up as faint banding in
//     the reflections, exactly where a car's paint is supposed to look glassy.
const DRACO_QUANTIZATION = {
  quantizePosition: 16,
  quantizeNormal: 12,
  quantizeTexcoord: 14,
  quantizeGeneric: 16,
};

async function fileSizeMB(file) {
  const { size } = await stat(file);
  return size / 1024 / 1024;
}

async function main() {
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      "draco3d.decoder": await draco3d.createDecoderModule(),
      "draco3d.encoder": await draco3d.createEncoderModule(),
    });

  console.log(`Reading ${path.relative(ROOT, INPUT)} …`);
  const document = await io.read(INPUT);
  const before = await fileSizeMB(INPUT);

  await document.transform(
    // Lossless clean-up: drop duplicate accessors/materials/textures, then
    // anything left unreferenced.
    dedup(),
    prune(),

    // Merges only bitwise-identical vertices, so it changes no shape at all —
    // it just lets Draco share data between triangles. This is where the
    // vertex count legitimately drops; nothing is approximated.
    weld(),

    // Textures down to 1024 and into WebP. This is the only lossy step, and
    // it only affects image detail, never the shape of the panels.
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      resize: [MAX_TEXTURE_SIZE, MAX_TEXTURE_SIZE],
      quality: 85,
    }),

    // Geometry compression. Full triangle count kept — see the note at the top.
    draco(DRACO_QUANTIZATION)
  );

  await io.write(OUTPUT, document);
  const after = await fileSizeMB(OUTPUT);

  console.log(
    `\nWrote ${path.relative(ROOT, OUTPUT)}\n` +
      `  ${before.toFixed(2)} MB  ->  ${after.toFixed(2)} MB`
  );
  if (after > 3) {
    console.warn(
      `  NOTE: over the 3 MB budget. Lower MAX_TEXTURE_SIZE or the ` +
        `quantisation bits above — do not add simplify().`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
