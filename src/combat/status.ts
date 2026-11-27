// Status effects on a target (combat.md / weapon.md#6): Chảy máu, Bỏng (damage over time), Đóng băng, Choáng. Đẩy lùi is a hit multiplier, not a timer.
import type { StatusKind } from '../weapon/materials/types'

export const STATUS = {
  dps: { chaymau: 2, bong: 4 } as Record<string, number>,   // damage per second at power 1
  shatterMult: 3,         // a frozen target hit by a heavy blow takes this and unfreezes
  shatterCharge: 0.9,
  spreadRadius: 1.2,      // m: Bỏng jumps to touching enemies
}

export class Status {
  chaymau = 0; bong = 0; dongbang = 0; choang = 0
  private bleedP = 1
  /** (re)start a status; the longer timer / the stronger power wins */
  apply(kind: StatusKind, secs: number, power = 1) {
    if (kind === 'chaymau') { this.chaymau = Math.max(this.chaymau, secs); this.bleedP = Math.max(this.bleedP, power) }
    else this[kind] = Math.max(this[kind], secs)
  }
  get frozen() { return this.dongbang > 0 }
  get stunned() { return this.choang > 0 }
  get burning() { return this.bong > 0 }
  get bleeding() { return this.chaymau > 0 }
  /** advances timers; returns the damage-over-time dealt this tick. Frozen targets neither burn nor bleed (time stands still) */
  tick(dt: number): number {
    if (this.frozen) { this.dongbang = Math.max(0, this.dongbang - dt); return 0 }
    let dmg = 0
    if (this.chaymau > 0) { dmg += STATUS.dps.chaymau * this.bleedP * Math.min(dt, this.chaymau); this.chaymau = Math.max(0, this.chaymau - dt); if (!this.chaymau) this.bleedP = 1 }
    if (this.bong > 0) { dmg += STATUS.dps.bong * Math.min(dt, this.bong); this.bong = Math.max(0, this.bong - dt) }
    this.choang = Math.max(0, this.choang - dt)
    return dmg
  }
  /** a hit on a frozen target: heavy ones shatter it (returns damage multiplier and thaws) */
  shatter(charge: number, blunt: boolean): number {
    if (!this.frozen || (charge < STATUS.shatterCharge && !blunt)) return 1
    this.dongbang = 0; return STATUS.shatterMult
  }
  clear() { this.chaymau = this.bong = this.dongbang = this.choang = 0; this.bleedP = 1 }
}
