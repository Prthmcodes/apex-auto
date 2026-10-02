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
  },

  camera: {
    start: [0, 1.5, 24] as [number, number, number],
    end: [0, 1.5, 6] as [number, number, number],
    lookAt: [0, 1.4, -6] as [number, number, number],
  },
};
