# Credits

Everything in this project is either generated in code or one of the
following third-party assets.

## 3D car model (credit required)

**"Range Rover Sport 2018"** by **diw3d** — the car in the home page's 3D
scene (`public/models/car.glb`).
- Author: [diw3d on Sketchfab](https://sketchfab.com/diwdiw)
- Source: [sketchfab.com/3d-models/range-rover-sport-2018-d1fe581b3baf4af89275e9aa9a1392e2](https://sketchfab.com/3d-models/range-rover-sport-2018-d1fe581b3baf4af89275e9aa9a1392e2)
- License: [Creative Commons Attribution 4.0 (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
- Changes made: compressed with gltf-transform (Draco geometry, WebP
  textures; 29.4 MB down to 1.2 MB), and its materials re-tuned in code
  (paint colour, glass, tyres, the see-through bonnet and light sweep).
  The unmodified original is kept locally in `source-assets/`, which is
  not committed.
- Attribution: **required** by CC BY 4.0. It's shown as a small credit
  line on the home page's final screen (text in `src/content/site.ts` →
  `carModelCredit`). Keep it there as long as this model is used.
- Note: this is a model of a real, trademarked car, and its bonnet badge
  reads "RANGE ROVER". The CC BY licence covers the 3D model's copyright,
  not the car maker's trademarks. Worth a second thought before using it
  on a paying client's live site (see PROGRESS.md).

The author/title/licence above were read from the credit metadata
Sketchfab embeds inside the downloaded file itself.

## HDR environment map

**"Modern Evening Street"** by **Grzegorz Wronkowski**, from
[Poly Haven](https://polyhaven.com/a/modern_evening_street) — the dusk
lighting and reflections on the car (`public/hdr/dusk.exr`).
- License: **CC0 1.0** (public domain, no attribution legally required)
- Downsized from the 4K original to 1024×512 (box-filtered, the sun
  clamped so it can't overflow) to keep it under 2 MB. The original is in
  `source-assets/`. The name was read from the file's own header.

## Draco decoder

`public/draco/` holds Google's Draco mesh decoder, copied unchanged from
three.js (`three/examples/jsm/libs/draco/gltf/`), so the site decodes the
compressed car model itself instead of fetching the decoder from Google's
CDN. Licence: Apache 2.0 (Google).

## Font

**Rajdhani** (Bold) — used for the neon sign and the "APEX AUTO" loading
text.
- Author: Indian Type Foundry
- License: SIL Open Font License, Version 1.1
- Source: [Google Fonts](https://fonts.google.com/specimen/Rajdhani) /
  [google/fonts on GitHub](https://github.com/google/fonts/tree/main/ofl/rajdhani)
- Files: `public/fonts/Rajdhani-Bold.ttf`, with the full license text at
  `public/fonts/Rajdhani-OFL.txt`
- Attribution: not required by the SIL OFL for ordinary use (the license
  file travels with the font, which is all it requires), but credited here
  for traceability.

## Textures

All three texture sets below are from [ambientCG](https://ambientcg.com),
licensed **CC0 1.0 Universal** (public domain — no attribution legally
required). Each was downloaded at 1K resolution, then resized to 512×512
and re-compressed to keep the site light for phones (see
`public/textures/`, ~300 KB total for all nine files combined, down from
~20 MB as originally downloaded).

- **Asphalt012** — the forecourt ground. Its colour map was also
  desaturated in Phase 8B (its red cracks read oddly from above).
  [ambientcg.com/view?id=Asphalt012](https://ambientcg.com/view?id=Asphalt012)
- **Concrete034** — the garage's walls and roof.
  [ambientcg.com/view?id=Concrete034](https://ambientcg.com/view?id=Concrete034)
- **Bricks090** — the brick-faced door pillars.
  [ambientcg.com/view?id=Bricks090](https://ambientcg.com/view?id=Bricks090)

No visible on-page credit line is required for the font or textures (SIL
OFL and CC0 both allow use without one). The car model above is the one
asset that does need one.

## Everything else

The garage's structural geometry, the line markings, the engine bay, the
floating tools, and all lighting/materials/animation are procedural —
generated in code, not downloaded. See `PROGRESS.md` for the build history
and `CLAUDE.md` for the project rules that keep it that way.
