@AGENTS.md

## Apex Auto project brief

A demo 3D garage website, built to pitch to garages in East London.

Two pages:
- **Home** — a procedural 3D scroll fly-through themed "under the bonnet": arrive, inspect, wheels, engine, diagnostics, done.
- **/book** — a plain, fast booking page. No 3D.

**Stack:** Next.js, TypeScript, three, React Three Fiber, drei, GSAP ScrollTrigger, Lenis, postprocessing.

**Rules:**
- Work one phase at a time (see PROGRESS.md) and stop for review before starting the next.
- Explain changes in plain English — the owner is not a front-end developer.
- No `.glb` models or other 3D asset files — every shape is generated in code.
- All business details live in `src/content/site.ts` as clearly marked PLACEHOLDER values. Never invent reviews, prices, or contact details.
- "Call now" and "Book now" are real HTML buttons, rendered outside the canvas (not drawn in the 3D scene).
- Scene code lives in `src/components/scene`, with all colours defined in one theme file.
- Light mode on phones. No camera movement when `prefers-reduced-motion` is set.
- No backend features.
- After each phase: run the build, update PROGRESS.md, and commit as `phase N: description`.
