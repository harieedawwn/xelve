// Player defence (combat.md#1, #6): Đỡ (hold), Phản đòn (Đỡ pressed ≤150 ms before impact), Né (duel sidestep), counter windows.
// Pure: no three.js, game-time seconds in, answers out. Scenes turn answers into hitstop/slow-mo/sound/camera.

export const DEFENSE = {
  perfect: 0.15,        // Đỡ pressed this long (or less) before the impact = Phản đòn
  spamLock: 0.35,       // a press this soon after the previous one gets no perfect window (no mashing)
  parryHitstop: 0.16,   // real s
  parryStun: 1.2,       // attacker Choáng (bosses override, e.g. Người gác 1.5)
  parrySlow: 0.4,       // free slow-mo after Phản đòn, real s
  parrySlowScale: 0.3,
  blockSoak: 1,         // Đỡ (not perfect) removes this much damage
  dodgeTime: 0.4,       // Né lasts this long; a hit inside it is answered by the dodge side
  dodgeCooldown: 0.25,  // after a Né ends, before the next
  counterWindow: 0.5,   // after a correct Né the attacker staggers this long
  counterMult: 1.5,     // damage multiplier inside a counter window
  duelSlowLead: 0.3,    // duel attacks enter slow-mo this long (game s) before impact…
  duelSlowReal: 0.6,    // …for at most this long (real s)
  duelSlowScale: 0.3,
}

export type Side = -1 | 1
/** How an incoming attack can be answered. dodge: side that avoids it (0 = either side, null = cannot be dodged: thrust). */
export interface Attack { dmg: number; dodge: Side | 0 | null; blockable: boolean }
export type Answer = 'parry' | 'block' | 'dodge' | 'hit'
export interface Result { answer: Answer; dmg: number }

export type WeaponClass = 'nhe' | 'vua' | 'nang' | undefined
/** Đỡ only with nặng weapons, and vừa in duels (combat.md#1). */
export const canBlockWith = (cls: WeaponClass, duel: boolean) => cls === 'nang' || (duel && cls === 'vua')

export class Defense {
  canBlock = false; canDodge = false
  private guardAt = -1; private lastPress = -9; private perfectOk = false
  private dodgeAt = -9; private side: Side = 1
  counterUntil = -9

  get guarding() { return this.guardAt >= 0 }
  /** Đỡ button down */
  press(now: number) {
    if (!this.canBlock || this.guarding) return
    this.perfectOk = now - this.lastPress >= DEFENSE.spamLock
    this.guardAt = now; this.lastPress = now
  }
  /** Đỡ button up */
  release() { this.guardAt = -1 }

  dodging(now: number) { return now - this.dodgeAt < DEFENSE.dodgeTime }
  get dodgeSide() { return this.side }
  /** ‹ › : returns false while a Né or its cooldown runs */
  dodge(side: Side, now: number) {
    if (!this.canDodge || now - this.dodgeAt < DEFENSE.dodgeTime + DEFENSE.dodgeCooldown) return false
    this.dodgeAt = now; this.side = side; return true
  }

  /** an attack lands now: what the player's input makes of it */
  resolve(a: Attack, now: number): Result {
    if (this.dodging(now)) {
      if (a.dodge !== null && (a.dodge === 0 || a.dodge === this.side)) { this.counterUntil = now + DEFENSE.counterWindow; return { answer: 'dodge', dmg: 0 } }
      return { answer: 'hit', dmg: a.dmg }
    }
    if (this.guarding && a.blockable) {
      if (this.perfectOk && now - this.guardAt <= DEFENSE.perfect) {
        this.counterUntil = now + DEFENSE.parryStun; this.perfectOk = false
        return { answer: 'parry', dmg: 0 }
      }
      return { answer: 'block', dmg: Math.max(0, a.dmg - DEFENSE.blockSoak) }
    }
    return { answer: 'hit', dmg: a.dmg }
  }

  /** damage multiplier for the player's own hits right now */
  counterMult(now: number) { return now < this.counterUntil ? DEFENSE.counterMult : 1 }
  reset() { this.guardAt = -1; this.lastPress = -9; this.dodgeAt = -9; this.counterUntil = -9 }
}
