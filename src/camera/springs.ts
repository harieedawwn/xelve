// Spring helpers. x'' = k(target - x) - c x'  (semi-implicit Euler, substepped)
import * as THREE from 'three'

export class Spring {
  x = 0; v = 0
  constructor(public k = 120, public c = 22) {}
  step(target: number, dt: number) {
    const n = Math.max(1, Math.ceil(dt / (1 / 120)))
    const h = dt / n
    for (let i = 0; i < n; i++) {
      this.v += (this.k * (target - this.x) - this.c * this.v) * h
      this.x += this.v * h
    }
    return this.x
  }
  kick(dv: number) { this.v += dv }
}

/** frequency (Hz) + damping ratio → k, c */
export function springFrom(freq: number, zeta: number): Spring {
  const w = 2 * Math.PI * freq
  return new Spring(w * w, 2 * zeta * w)
}

export class Spring3 {
  x = new THREE.Vector3(); v = new THREE.Vector3()
  private t = new THREE.Vector3()
  constructor(public k = 120, public c = 22) {}
  static from(freq: number, zeta: number) {
    const s = springFrom(freq, zeta); return new Spring3(s.k, s.c)
  }
  step(target: THREE.Vector3, dt: number) {
    const n = Math.max(1, Math.ceil(dt / (1 / 120)))
    const h = dt / n
    for (let i = 0; i < n; i++) {
      this.t.copy(target).sub(this.x).multiplyScalar(this.k).addScaledVector(this.v, -this.c)
      this.v.addScaledVector(this.t, h)
      this.x.addScaledVector(this.v, h)
    }
    return this.x
  }
}

// Cheap smooth noise (sum of sines with irrational ratios), range ~[-1,1]
export function noise1(t: number, seed: number) {
  return (Math.sin(t * 1.0 + seed) * 0.5 + Math.sin(t * 2.17 + seed * 1.3) * 0.3 + Math.sin(t * 4.73 + seed * 2.1) * 0.2)
}

export const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smooth = (t: number) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t) }
