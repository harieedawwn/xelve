// Game clock: timescale (slow-mo) + hitstop on real time. Hitstop freezes sim; real time keeps running.
export class Time {
  hitstop = 0; slow = 0; slowScale = 0.25
  now = 0; real = 0
  /** Freeze the sim for `sec` real seconds (max wins). */
  freeze(sec: number) { this.hitstop = Math.max(this.hitstop, sec) }
  /** Slow-mo for `sec` real seconds. */
  slowmo(sec: number, scale = 0.25) { this.slow = sec; this.slowScale = scale }
  get scale() { return this.hitstop > 0 ? 0 : this.slow > 0 ? this.slowScale : 1 }
  /** Advance by real dt; returns game dt. `onSlowEnd` fires when slow-mo expires. */
  tick(realDt: number, onSlowEnd?: () => void) {
    this.real += realDt
    this.hitstop = Math.max(0, this.hitstop - realDt)
    const sc = this.scale
    if (this.slow > 0 && this.hitstop <= 0) { this.slow -= realDt; if (this.slow <= 0) onSlowEnd?.() }
    const dt = realDt * sc; this.now += dt; return dt
  }
}
