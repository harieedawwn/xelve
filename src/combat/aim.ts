// Finger → weapon target with a speed-dependent gain (P16). Pure: no three.js, unit-tested.
import { FEEL } from './feel'

export interface Aim { x: number; y: number; px: number; py: number; speed: number; down: boolean }
export const newAim = (): Aim => ({ x: 0, y: 0, px: 0, py: 0, speed: 0, down: false })

const smoothstep = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t) }
/** gain from finger speed (cm/s): slow 1.6 → fast 3.2, smooth */
export const gainAt = (cmPerS: number) => FEEL.gainSlow + (FEEL.gainFast - FEEL.gainSlow) * smoothstep(FEEL.speedSlow, FEEL.speedFast, cmPerS)

const R = FEEL.range
const clampX = (v: number) => Math.min(R.x, Math.max(-R.x, v))
const clampY = (v: number) => Math.min(R.yMax, Math.max(R.yMin, v))

/** fx, fy: finger in NDC; w, h: view in CSS px. Returns the weapon target offset (metres, camera space) in a.x / a.y. */
export function stepAim(a: Aim, down: boolean, fx: number, fy: number, w: number, h: number, dt: number) {
  const px = fx * w / 2, py = fy * h / 2
  if (down && !a.down) { // touch-down: start where the finger lands (old absolute map), then motion is amplified
    a.x = clampX(fx * FEEL.anchor.x); a.y = clampY(fy * FEEL.anchor.y + FEEL.anchor.y0); a.speed = 0
  } else if (down && dt > 0) {
    const dcx = (px - a.px) / FEEL.pxPerCm, dcy = (py - a.py) / FEEL.pxPerCm
    const inst = Math.hypot(dcx, dcy) / dt
    a.speed += (inst - a.speed) * (1 - Math.exp(-dt / FEEL.speedSmooth))
    const g = gainAt(Math.max(a.speed, inst)) * FEEL.mPerCm
    a.x = clampX(a.x + dcx * g); a.y = clampY(a.y + dcy * g)
  }
  a.down = down; a.px = px; a.py = py
  return a
}
