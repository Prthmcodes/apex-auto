// When the tools come out, as plain numbers with no three.js import.
//
// Kept apart from toolReveal.ts because the HTML tool-story overlay needs
// RISE_START too, and that overlay is loaded by SceneGate BEFORE the WebGL
// check runs. Anything it imports that pulls in three.js downloads the
// whole 3D bundle even for a visitor whose device can't show it — which is
// exactly what `npm run qa:fallback` checks for.

// The six tools come out one after another as the camera comes into the
// workshop — roughly the back half of "inspect" through to the start of
// "engine", so they're all out and on their way by the time the engine
// stage needs them beside the car.
export const RISE_FIRST_START = 0.21;
export const RISE_STAGGER = 0.022;
export const RISE_LENGTH = 0.1;

/** The scroll point at which the first drawer starts to move. */
export const RISE_START = RISE_FIRST_START;
