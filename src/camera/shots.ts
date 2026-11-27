// Shot track: authored look/fov/roll keyed by rail distance. Changes are spring-blended (half-life), never snaps unless cut:true.
import * as THREE from 'three'

export interface ShotKey {
  s: number
  look: THREE.Vector3 | (() => THREE.Vector3) // point or entity getter
  fov?: number; roll?: number
  halfLifeMs?: number // 120–250
  cut?: boolean       // cinematics only
}

export class ShotTrack {
  keys: ShotKey[]
  private idx = -1
  constructor(keys: ShotKey[]) { this.keys = [...keys].sort((a, b) => a.s - b.s) }
  /** returns the key that just became active at distance s (once), else null */
  advance(s: number): ShotKey | null {
    let i = this.idx
    while (i + 1 < this.keys.length && this.keys[i + 1].s <= s) i++
    if (i === this.idx) return null
    this.idx = i; return this.keys[i]
  }
  reset() { this.idx = -1 }
  static point(k: ShotKey, out: THREE.Vector3) { return out.copy(typeof k.look === 'function' ? k.look() : k.look) }
}

/** critically damped spring constants from a half-life in ms */
export function halfLifeToSpring(ms: number) { const w = 1.68 / (ms / 1000); return { k: w * w, c: 2 * w } }
