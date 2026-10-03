export const layout = {
  ground: { size: 200 },

  garage: {
    width: 10,
    depth: 9,
    height: 4.2,
    frontZ: -2,
    backZ: -11,
    // 6.4m, the sort of roller shutter a two-bay workshop actually has.
    // It was 4.4m, which was too narrow for two reasons: you could barely
    // see the car through it from the street, and the camera's route in and
    // out of the bay clipped straight through the right-hand pillar — it
    // crosses this plane at x = 2.6 on the way in and x = 2.8 on the way
    // out, both outside a 4.4m opening. Measured, not guessed: see the
    // doorway-clearance figures in PROGRESS.md.
    door: { width: 6.4, height: 3.4 },
    // How far the shutter is rolled up: 2/3 of the opening is clear, and
    // the curtain hangs down over the top third.
    shutterOpenFraction: 2 / 3,
  },

  // The front of the building is wider than the room behind it: a second
  // bay with its shutter closed sits to the right of the main one, so from
  // the street it reads as a two-bay workshop rather than a single lock-up.
  // It is a solid block — there is no interior, because you never see in.
  secondBay: {
    startX: 5, // the outer face of the main bay's right wall
    width: 4.8,
    shutter: { width: 2.9, height: 3.4, centerX: 6.7 },
    personnelDoor: { width: 1.0, height: 2.1, centerX: 9.0 },
  },

  // Where the building's front face sits, and how wide the whole elevation
  // is. The exterior dressing hangs off these two numbers.
  facade: {
    z: -1.85, // the street-facing face of the front wall
    minX: -5,
    maxX: 9.8,
    // The flat roof's metal edge trim, which sits a little above the slab.
    parapetY: 4.5,
    parapetTopY: 4.68,
  },

  car: {
    position: [0, 0, -6.5] as [number, number, number],
    // Nose toward the door (+Z), so it reads as parked facing out.
    rotation: [0, -Math.PI / 2, 0] as [number, number, number],
    // Bumper-to-bumper length in metres. car.glb is scaled to exactly this,
    // whatever size the model file happens to be authored at.
    length: 4.87,
  },
};
