// Player HP: 6 segments, regen 1 per 6 s out of combat. Checkpoint = encounter start (scene restarts the wave).
export const MAX_HP = 6, REGEN_S = 6
export class PlayerHP {
  hp = MAX_HP; private t = 0
  get dead() { return this.hp <= 0 }
  /** returns true if this hit killed */
  hit(n = 1) { if (this.dead) return false; this.hp = Math.max(0, this.hp - n); this.t = 0; return this.dead }
  update(dt: number, inCombat: boolean) {
    if (this.dead || this.hp >= MAX_HP) { this.t = 0; return false }
    if (inCombat) { this.t = 0; return false }
    this.t += dt
    if (this.t >= REGEN_S) { this.t = 0; this.hp++; return true }
    return false
  }
  reset() { this.hp = MAX_HP; this.t = 0 }
}
