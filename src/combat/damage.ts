// Pure combat maths (weapon.md §5). No three.js here so it is unit-tested directly.
export type Shape = 'sac' | 'mui' | 'cun' | 'khoi'

export const BASE = 3, VREF = 4, K0 = 2660, I0 = 0.2, VMAX = 9
export const SHAPE_MULT: Record<Shape, number> = { sac: 1, mui: 1.25, cun: 0.8, khoi: 1 }
export const WEAK_MULT = 2

export interface HitInput {
  /** voxel count within 2 cells of the contact voxel (mass proxy) */
  mContact: number
  /** tip speed, m/s (from the simulated weapon) */
  v: number
  shape: Shape
  /** charge 0..1 for vừa/nặng weapons; omit for nhẹ/Khối (lực = 1) */
  charge?: number
  matMult?: number
  weak?: boolean
}

export const luc = (charge: number) => 0.2 + 0.8 * Math.min(1, Math.max(0, charge)) ** 2

export function damage(h: HitInput): number {
  const speed = Math.min(2, Math.max(0.2, h.v / VREF))
  const l = h.charge === undefined ? 1 : luc(h.charge)
  return BASE * Math.sqrt(Math.max(0, h.mContact)) * speed * SHAPE_MULT[h.shape] * l * (h.matMult ?? 1) * (h.weak ? WEAK_MULT : 1)
}

/** Finger-follow spring: k = K0/(I+I0), damping = critical × 0.8. Returns k, c (and natural freq Hz). */
export function swingSpring(inertia: number) {
  const k = K0 / (inertia + I0), c = 0.8 * 2 * Math.sqrt(k)
  return { k, c, freq: Math.sqrt(k) / (2 * Math.PI) }
}

/** Tip speed cap: VMAX/√(I+I0) — a heavy weapon cannot be whipped fast. */
export const speedCap = (inertia: number) => VMAX / Math.sqrt(inertia + I0)

/** Seconds for the lực charge to refill: 0.25 s·√(I/I1). */
export const chargeTime = (inertia: number, I1 = 1) => 0.25 * Math.sqrt(Math.max(inertia, 0.0001) / I1)
