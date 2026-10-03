export const layout = {
  ground: { size: 200 },

  garage: {
    width: 10,
    depth: 9,
    height: 4.2,
    frontZ: -2,
    backZ: -11,
    door: { width: 4.4, height: 3.4 },
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
