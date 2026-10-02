# Progress

Phase-by-phase checklist for the Apex Auto demo site. See CLAUDE.md → "Apex Auto project brief" for the full plan and rules. One phase is built, reviewed, and committed at a time.

- [x] **Phase 0 — Setup**: Next.js + TypeScript project scaffolded; 3D and animation libraries installed (three, @react-three/fiber, @react-three/drei, @react-three/postprocessing, gsap, lenis).
- [x] **Phase 1 — Skeleton**: Fixed full-screen canvas with a placeholder cube; camera driven along a straight path by scroll progress via GSAP ScrollTrigger + Lenis; 600vh scroll track.
- [x] **Phase 2 — World**: Static procedural world — dark ground with a glowing teal grid, a boxy garage with an amber-lit open roller door, a teal neon "APEX AUTO" sign (Rajdhani Bold, SIL OFL), dusk fog/lighting, and a code-built hologram car inside. Camera path retargeted from outside the garage toward the door (choreography still comes in Phase 3).
- [ ] **Phase 3 — Fly-through**: Scroll-driven "under the bonnet" camera sequence.
  - [ ] 3A — Arrive & inspect
  - [ ] 3B — Wheels & engine
  - [ ] 3C — Diagnostics & done
- [ ] **Phase 4 — Look**: Visual polish — theme colours, materials, postprocessing, lighting pass.
- [ ] **Phase 5 — Book page**: Plain, fast `/book` page (no 3D).
- [ ] **Phase 6 — Phones and speed**: Light mode for phones, `prefers-reduced-motion` support (camera movement disabled), performance pass.
- [ ] **Phase 7 — Ship**: Final QA, build check, deployment readiness.
