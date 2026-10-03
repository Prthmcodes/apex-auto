# Progress

Phase-by-phase checklist for the Apex Auto demo site. See CLAUDE.md → "Apex Auto project brief" for the full plan and rules. One phase is built, reviewed, and committed at a time.

- [x] **Phase 0 — Setup**: Next.js + TypeScript project scaffolded; 3D and animation libraries installed (three, @react-three/fiber, @react-three/drei, @react-three/postprocessing, gsap, lenis).
- [x] **Phase 1 — Skeleton**: Fixed full-screen canvas with a placeholder cube; camera driven along a straight path by scroll progress via GSAP ScrollTrigger + Lenis; 600vh scroll track.
- [x] **Phase 2 — World**: Static procedural world — dark ground with a glowing teal grid, a boxy garage with an amber-lit open roller door, a teal neon "APEX AUTO" sign (Rajdhani Bold, SIL OFL), dusk fog/lighting, and a code-built hologram car inside. Camera path retargeted from outside the garage toward the door (choreography still comes in Phase 3).
- [ ] **Phase 3 — Fly-through**: Scroll-driven "under the bonnet" camera sequence.
  - [x] 3A — Camera path, six named stages, HTML captions, stage indicator (1–6), and glowing marker dots on the car for stages 3–4. Camera follows a `CatmullRomCurve3` through hand-placed points in `scene/cameraPath.ts`, eased with `THREE.MathUtils.damp`; look-at target follows a second, gentler curve. `prefers-reduced-motion` disables the easing and cuts straight between stage shots. Rotated the hologram car 90° so it's nose-out toward the door (needed for the wheel/bonnet/side-view framing to make sense — noted here since it wasn't an explicit ask). Stage scroll ranges and captions live in `src/content/site.ts` as placeholder-flavoured UI copy, not business claims. Known tweak-later item: the Inspect→Wheels curve segment passes close to the right door pillar — worth an eyeball check once you can view it, may need an extra control point if it clips. Could not visually verify at 390px/1440px in-session (browser automation tool wasn't connected); layout uses responsive Tailwind sizing and should be checked by hand.
  - [ ] 3B — Wheels & engine
  - [ ] 3C — Diagnostics & done
- [ ] **Phase 4 — Look**: Visual polish — theme colours, materials, postprocessing, lighting pass.
- [ ] **Phase 5 — Book page**: Plain, fast `/book` page (no 3D).
- [ ] **Phase 6 — Phones and speed**: Light mode for phones, `prefers-reduced-motion` support (camera movement disabled), performance pass.
- [ ] **Phase 7 — Ship**: Final QA, build check, deployment readiness.
