// P16 touch feel: every number for finger→weapon mapping, reach and contact lives here.
export const FEEL = {
  // finger → weapon target (aim.ts). The finger is measured in cm on the glass, not as a fraction of the screen.
  pxPerCm: 63,           // CSS px per cm on a typical Android phone (160 css dpi)
  mPerCm: 0.057,         // weapon target metres per finger cm at gain 1
  gainSlow: 1.6, gainFast: 3.2,
  speedSlow: 10, speedFast: 60, // finger cm/s where the gain curve starts / tops out (smoothstep between)
  speedSmooth: 0.03,     // s: finger speed low-pass
  anchor: { x: 0.36, y: 0.21, y0: -0.03 }, // touch-down point: where the finger lands sets the start (old 1:1 map)
  range: { x: 0.55, yMin: -0.2, yMax: 0.35 },
  // swing arc: horizontal motion turns the weapon around the hand
  arcMax: 70 * Math.PI / 180, // rad, yaw and roll caps
  yawPerMps: 0.26,       // rad per m/s of hand velocity
  rollPerMps: 0.32,
  // reach
  extend: 0.45,          // m forward at full tip speed
  extendV: 7,            // tip speed (m/s) for full extension
  capsule: 1.15,         // enemy hit capsule / head radius multiplier
  tipForgive: 0.25,      // m: extra tip test point ahead along the slash direction
  stopGap: 1.35,         // m: where enemies stand to fight (was 1.05)
  // smear
  smearN: 64, smearLife: 0.16, smearStep: 0.05, // trail samples, s, m between inserted sub-samples
  // contact with hard bodies (contact.ts)
  pushMax: 0.35,         // m: deeper than this the camera itself is inside; ignore
  sparkN: 7, sparkEvery: 0.05, scratchW: 0.025, scratchMax: 48,
} as const
