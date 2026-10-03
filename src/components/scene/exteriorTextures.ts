// Every surface on the outside of the building, drawn in code on a <canvas>
// at load time. No image files: the project's rule is that shapes and
// materials are generated, and a canvas painted by a few lines of
// JavaScript is still generated (same approach as the WORKSHOP sign inside
// the bay, see WorkshopProps.tsx).
//
// The tiling textures here each come with a REAL-WORLD TILE SIZE in metres.
// Panels scale their own UVs by that size (see `panelGeometry` in
// GarageExterior.tsx), so a block course is the same size on a 1.8m pillar
// as it is on a 14m elevation. Setting `repeat` on a shared texture cannot
// do that — one texture, one repeat, so every panel would need its own copy.

import * as THREE from "three";
import { theme } from "./theme";

/** The size, in metres, that one tile of each repeating texture covers. */
export const TILE = {
  cladding: { width: 0.8, height: 2.0 },
  blockwork: { width: 1.76, height: 0.645 },
  shutter: { width: 1.0, height: 0.4 },
};

function canvasOf(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext("2d")! };
}

function finish(canvas: HTMLCanvasElement, { srgb = true, repeat = true } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

/** Scatters a little noise over whatever has just been painted. */
function weather(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  { count = 160, alpha = 0.05, size = 3 } = {}
) {
  ctx.fillStyle = "#000000";
  for (let i = 0; i < count; i += 1) {
    ctx.globalAlpha = alpha * (0.4 + Math.random() * 0.6);
    const w = size * (0.5 + Math.random() * 1.5);
    ctx.fillRect(Math.random() * width, Math.random() * height, w, w * (0.4 + Math.random()));
  }
  ctx.globalAlpha = 1;
}

function rgba(color: string, alpha: number) {
  const c = new THREE.Color(color);
  const to255 = (v: number) => Math.round(v * 255);
  return `rgba(${to255(c.r)},${to255(c.g)},${to255(c.b)},${alpha})`;
}

// ---------------------------------------------------------------------------
// Profiled metal cladding: the upper half of the building.

const CLADDING_RIBS = 8; // across one 0.8m tile, so a 100mm rib pitch

function buildCladding() {
  const width = 256;
  const height = 256;
  const { canvas, ctx } = canvasOf(width, height);

  const light = new THREE.Color(theme.cladding);
  const dark = new THREE.Color(theme.claddingRib);
  for (let x = 0; x < width; x += 1) {
    // Each rib is bright on the crown and dark in the valley. A cosine is
    // close enough to a trapezoidal profile at this distance.
    const phase = (x / width) * CLADDING_RIBS * Math.PI * 2;
    const lit = (Math.cos(phase) + 1) / 2;
    const colour = dark.clone().lerp(light, lit * lit);
    ctx.fillStyle = `#${colour.getHexString()}`;
    ctx.fillRect(x, 0, 1, height);
  }

  // Vertical dirt streaks, which is how cladding actually ages.
  for (let i = 0; i < 26; i += 1) {
    ctx.globalAlpha = 0.03 + Math.random() * 0.05;
    ctx.fillStyle = "#15171a";
    ctx.fillRect(Math.random() * width, Math.random() * height * 0.5, 1 + Math.random() * 3, height);
  }
  ctx.globalAlpha = 1;
  weather(ctx, width, height, { count: 90, alpha: 0.04 });

  return finish(canvas);
}

/** The matching normal map, so the ribs catch light from the side too. */
function buildCladdingNormal() {
  const width = 256;
  const height = 8;
  const { canvas, ctx } = canvasOf(width, height);
  const strength = 1.6;

  for (let x = 0; x < width; x += 1) {
    const phase = (x / width) * CLADDING_RIBS * Math.PI * 2;
    const slope = -Math.sin(phase) * strength; // slope across the rib
    const normal = new THREE.Vector3(slope, 0, 1).normalize();
    const channel = (v: number) => Math.round((v * 0.5 + 0.5) * 255);
    ctx.fillStyle = `rgb(${channel(normal.x)},${channel(normal.y)},${channel(normal.z)})`;
    ctx.fillRect(x, 0, 1, height);
  }

  // Normal maps hold vectors, not colour: tagging this sRGB would have the
  // renderer "correct" the numbers and bend the light the wrong way.
  return finish(canvas, { srgb: false });
}

// ---------------------------------------------------------------------------
// Blockwork: the lower half, and the pillars either side of the shutter.

function buildBlockwork() {
  const width = 352; // 1.76m at 200px/m — four 440mm blocks
  const height = 129; // three 215mm courses
  const { canvas, ctx } = canvasOf(width, height);

  ctx.fillStyle = theme.blockMortar;
  ctx.fillRect(0, 0, width, height);

  const courses = 3;
  const perCourse = 4;
  const courseHeight = height / courses;
  const blockWidth = width / perCourse;
  const base = new THREE.Color(theme.blockwork);

  for (let row = 0; row < courses; row += 1) {
    // Stretcher bond: every other course offset by half a block.
    const offset = row % 2 === 0 ? 0 : blockWidth / 2;
    for (let col = -1; col <= perCourse; col += 1) {
      const shade = base.clone();
      // Breeze blocks are never one flat colour; vary each one a little.
      shade.offsetHSL(0, 0, (((row * 7 + col * 13) % 5) - 2) * 0.022);
      ctx.fillStyle = `#${shade.getHexString()}`;
      ctx.fillRect(
        col * blockWidth + offset + 1.5,
        row * courseHeight + 1.5,
        blockWidth - 3,
        courseHeight - 3
      );
    }
  }

  weather(ctx, width, height, { count: 200, alpha: 0.05, size: 4 });
  return finish(canvas);
}

// ---------------------------------------------------------------------------
// Roller shutter curtain.

function buildShutter(base: string, grubbiness: number) {
  const width = 64;
  const height = 80; // 0.4m of curtain: five 80mm slats
  const { canvas, ctx } = canvasOf(width, height);

  const light = new THREE.Color(base);
  const dark = new THREE.Color(base).offsetHSL(0, 0, -0.14);
  const slats = 5;
  const slatHeight = height / slats;

  for (let i = 0; i < slats; i += 1) {
    for (let y = 0; y < slatHeight; y += 1) {
      // Each slat is a shallow curve: bright across the middle, with a
      // dark seam where it laps over the one below.
      const lit = Math.sin((y / slatHeight) * Math.PI) ** 0.6;
      const colour = dark.clone().lerp(light, lit);
      ctx.fillStyle = `#${colour.getHexString()}`;
      ctx.fillRect(0, i * slatHeight + y, width, 1);
    }
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, i * slatHeight, width, 1.5);
  }

  weather(ctx, width, height, { count: 70, alpha: 0.05 * grubbiness, size: 2 });
  return finish(canvas);
}

// ---------------------------------------------------------------------------
// Signage. Drawn big, because this is the one thing a visitor reads.

/**
 * The fascia board: business name, the services line, and a phone number.
 *
 * Painted as a backlit box rather than as glowing letters on nothing: the
 * panel has its own dark face, the letters sit on it, and the same image
 * drives the emissive channel so only the lettering and a soft wash behind
 * it actually glow. Floating neon text reads as a video-game HUD, not as a
 * sign a signwriter made.
 */
function buildFascia(lines: { name: string; services: string; phone: string }) {
  // Sized to the board it goes on: 14.8m by 1.03m, at 138 pixels per metre.
  // Matching the real aspect ratio matters — a square-ish canvas stretched
  // across a long board gives you letters a metre wide and half a metre
  // tall, which is the thing that makes 3D signage look fake.
  const width = 2048;
  const height = 142;
  const { canvas, ctx } = canvasOf(width, height);

  ctx.fillStyle = theme.fasciaPanel;
  ctx.fillRect(0, 0, width, height);

  // A faint lighter wash down the middle, as though the tubes behind the
  // panel are brightest in the centre.
  const wash = ctx.createLinearGradient(0, 0, 0, height);
  wash.addColorStop(0, "rgba(255,255,255,0.03)");
  wash.addColorStop(0.5, "rgba(255,255,255,0.09)");
  wash.addColorStop(1, "rgba(255,255,255,0.02)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // The name, with wide tracking to match the headings on the page.
  ctx.fillStyle = theme.primary;
  ctx.font = "700 76px Rajdhani, system-ui, sans-serif";
  const name = lines.name;
  const spacing = 16;
  const widths = [...name].map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (name.length - 1);
  let x = width / 2 - total / 2;
  for (let i = 0; i < name.length; i += 1) {
    ctx.fillText(name[i], x + widths[i] / 2, 50);
    x += widths[i] + spacing;
  }

  // Services and phone share the second row. The board is 14.8m wide and
  // only a metre tall, so there is plenty of width and no room at all for
  // a third line of text.
  ctx.font = "500 30px Rajdhani, system-ui, sans-serif";
  const gap = 46;
  const servicesWidth = ctx.measureText(lines.services).width;
  const phoneWidth = ctx.measureText(lines.phone).width;
  const rowStart = width / 2 - (servicesWidth + gap + phoneWidth) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = "#d6dce6";
  ctx.fillText(lines.services, rowStart, 112);
  ctx.fillStyle = "#8fa2b8";
  ctx.fillText("·", rowStart + servicesWidth + gap / 2 - 4, 112);
  ctx.fillStyle = "#b9c6d6";
  ctx.fillText(lines.phone, rowStart + servicesWidth + gap, 112);

  return finish(canvas, { repeat: false });
}

/** A generic blue trade sign. Wording only — no official logo or crest. */
function buildMotSign(label: string) {
  const width = 1024;
  const height = 256;
  const { canvas, ctx } = canvasOf(width, height);

  ctx.fillStyle = theme.motSignBlue;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = theme.motSignText;
  ctx.lineWidth = 10;
  ctx.strokeRect(18, 18, width - 36, height - 36);

  ctx.fillStyle = theme.motSignText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // "MOT" big on its own line, the rest smaller underneath.
  const words = label.split(" ");
  ctx.font = "700 96px Rajdhani, system-ui, sans-serif";
  ctx.fillText(words[0], width / 2, height * 0.37);
  ctx.font = "600 52px Rajdhani, system-ui, sans-serif";
  ctx.fillText(words.slice(1).join(" "), width / 2, height * 0.71);

  weather(ctx, width, height, { count: 120, alpha: 0.05, size: 6 });
  return finish(canvas, { repeat: false });
}

/** The A-frame board on the forecourt. */
function buildPavementSign(line1: string, line2: string) {
  const width = 512;
  const height = 640;
  const { canvas, ctx } = canvasOf(width, height);

  ctx.fillStyle = "#e4e0d5";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#2c2f33";
  ctx.lineWidth = 14;
  ctx.strokeRect(24, 24, width - 48, height - 48);

  ctx.fillStyle = "#1d2024";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 150px Rajdhani, system-ui, sans-serif";
  ctx.fillText(line1, width / 2, height * 0.38);
  ctx.font = "500 72px Rajdhani, system-ui, sans-serif";
  ctx.fillText(line2, width / 2, height * 0.62);

  weather(ctx, width, height, { count: 120, alpha: 0.05, size: 5 });
  return finish(canvas, { repeat: false });
}

// ---------------------------------------------------------------------------
// Faked light.

/**
 * A soft round gradient, used for the pool a floodlight throws on the
 * ground and the wash it leaves on the wall. These are flat sprites, not
 * lights: the scene's one real shadow-casting light is already spent, and
 * every extra light is a per-pixel cost across a lot of screen for
 * something a gradient does just as convincingly at this distance.
 */
function buildLightPool() {
  const size = 256;
  const { canvas, ctx } = canvasOf(size, size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  // The falloff has to be gentle all the way out. The first version
  // dropped to a tenth by 70% and then ran out, and on a pale concrete
  // apron that last stretch read as a visible elliptical rim around the
  // pool — a shape on the ground rather than light on it.
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.2, "rgba(255,255,255,0.74)");
  gradient.addColorStop(0.42, "rgba(255,255,255,0.4)");
  gradient.addColorStop(0.64, "rgba(255,255,255,0.17)");
  gradient.addColorStop(0.84, "rgba(255,255,255,0.05)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return finish(canvas, { repeat: false });
}

/**
 * A soft-edged blob, used as an alpha mask for puddles and oil stains.
 *
 * Unlike the light pool above it stays almost solid most of the way out
 * and only fades over the last third, because a puddle has an edge and a
 * gradient doesn't. The wobble stops them all looking like perfect discs.
 */
function buildBlobMask() {
  const size = 256;
  const { canvas, ctx } = canvasOf(size, size);

  // Opaque black base — black is "not there" for an alpha map.
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, size, size);

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.58, "#f7f7f7");
  gradient.addColorStop(0.82, "#6e6e6e");
  gradient.addColorStop(1, "#000000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Bite a few soft notches out of the rim so the outline isn't a circle.
  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * Math.PI * 2 + Math.random();
    const radius = size * (0.4 + Math.random() * 0.16);
    const cx = size / 2 + Math.cos(angle) * radius;
    const cy = size / 2 + Math.sin(angle) * radius;
    const notch = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * (0.1 + Math.random() * 0.12));
    notch.addColorStop(0, "rgba(0,0,0,0.85)");
    notch.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = notch;
    ctx.fillRect(0, 0, size, size);
  }

  return finish(canvas, { srgb: false, repeat: false });
}

/** The dusk sky: dark overhead, lighter at the horizon, a faint town glow. */
function buildSky() {
  const width = 16;
  const height = 1024;
  const { canvas, ctx } = canvasOf(width, height);

  // Wrapped on a sphere, this image runs pole to pole, so the HORIZON is
  // halfway down it and everything below that is under the ground. The
  // camera only ever looks about 25 degrees up on desktop, 45 on a phone,
  // which is the top 14% to 25% of the upper half — so all of the gradient
  // that anyone will ever see is squeezed into `elevation` 0 to 45.
  // Spreading the stops evenly over the whole image instead (the obvious
  // thing to do) puts the entire sky transition out of shot and leaves the
  // visible band one flat colour.
  const at = (elevation: number) => 0.5 - elevation / 180;

  const blend = (amount: number) =>
    new THREE.Color(theme.skyTop).lerp(new THREE.Color(theme.skyHorizon), amount).getStyle();

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, theme.skyTop);
  sky.addColorStop(at(70), theme.skyTop);
  sky.addColorStop(at(30), blend(0.35));
  sky.addColorStop(at(12), blend(0.82));
  sky.addColorStop(at(3), theme.skyHorizon);
  sky.addColorStop(at(0), theme.fog.color);
  sky.addColorStop(1, theme.fog.color);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // The glow of a town just out of sight: a band a few degrees above the
  // horizon, not a wash over the whole sky.
  const glow = ctx.createLinearGradient(0, height * at(20), 0, height * at(0));
  glow.addColorStop(0, rgba(theme.cityGlow, 0));
  glow.addColorStop(0.68, rgba(theme.cityGlow, 0.62));
  glow.addColorStop(1, rgba(theme.cityGlow, 0.15));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  return finish(canvas, { repeat: false });
}

// ---------------------------------------------------------------------------
// Built on first use and kept, so a texture is only ever painted once even
// though several components ask for the same one.

const cache: Record<string, THREE.Texture> = {};
function once(key: string, build: () => THREE.Texture) {
  cache[key] ??= build();
  return cache[key];
}

export const exteriorTexture = {
  cladding: () => once("cladding", buildCladding),
  claddingNormal: () => once("claddingNormal", buildCladdingNormal),
  blockwork: () => once("blockwork", buildBlockwork),
  shutterOpen: () => once("shutterOpen", () => buildShutter(theme.shutterSlat, 1)),
  shutterClosed: () => once("shutterClosed", () => buildShutter(theme.shutterClosed, 2.2)),
  fascia: (lines: { name: string; services: string; phone: string }) =>
    once("fascia", () => buildFascia(lines)),
  motSign: (label: string) => once("motSign", () => buildMotSign(label)),
  pavementSign: (line1: string, line2: string) =>
    once("pavementSign", () => buildPavementSign(line1, line2)),
  lightPool: () => once("lightPool", buildLightPool),
  blobMask: () => once("blobMask", buildBlobMask),
  sky: () => once("sky", buildSky),
};

/**
 * A faked pool or wash of light: an additive gradient sprite, never a real
 * light. The scene's lighting budget is one shadow-casting directional
 * light plus the warm point light in the doorway, and every extra light is
 * a per-pixel cost across a lot of screen for something a gradient does
 * just as convincingly at this distance.
 */
export function makeLightSprite(color: string, opacity: number) {
  return new THREE.MeshBasicMaterial({
    map: exteriorTexture.lightPool(),
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
}
