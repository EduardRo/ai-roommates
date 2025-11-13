export const characterRenderConfig = {
  aria: {
    x: 1000,
    y: 500,
    //scale: 0.3,
    anchor: { x: 0.86, y: 0.43 }, // Bottom center anchor
    position: { x: 1.5, y: 1.2 }, // Fraction of canvas width/height (0-1)
    scale: { x: 0.54, y: 0.54 }, // Adjust scale as needed
    mouthParam: 'ParamMouthOpenY',
  },
  sera: {
    //astea x si y nu fac nimic in realitate
    x: 1000,
    y: 550,
    //scale: 0.25,
    anchor: { x: 0.3, y: 1.0 }, // Example: same anchor
    position: { x: 0.1, y: 2.5 }, // Example: center, slightly higher
    scale: { x: 0.18, y: 0.18 }, // Example: different scale
    mouthParam: 'ParamMouthForm',
  },
  eidon: {
    x: 1000,
    y: 550,
    //scale: 0.35,
    anchor: { x: 0.5, y: 1.0 }, // Example: same anchor
    position: { x: 0.5, y: 1.0 }, // Example: right, slightly lower
    scale: { x: 0.12, y: 0.12 }, // Example: different scale
    mouthParam: 'ParamMouthOpen',
  },
}
