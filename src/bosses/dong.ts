// Boss 2 — Đống (combat.md#7): car-park giant. Pure brain (no three.js): attack order per phase, throw/sweep/slam timing,
// the 2 s arm-down opening after a throw, phase changes (phase 3 = roof rip reveal), cover rules. All numbers live in DONG.
export type Attack = 'throw' | 'sweep' | 'slam'
export type DState = 'idle' | 'windup' | 'flight' | 'recover' | 'down' | 'assault' | 'stagger' | 'reveal' | 'dead'
export type Seam = 'faceL' | 'faceR' | 'shoulder' | 'chest'
export type DEvent =
  | { e: 'telegraph'; kind: Attack; target: number; side: -1 | 1 }
  | { e: 'release'; target: number }   // car leaves the hand; flies to cover `target`
  | { e: 'slow' }                      // boss-throw slow-mo, shortly before the car lands
  | { e: 'impact'; kind: Attack; target: number; side: -1 | 1 }
  | { e: 'open' } | { e: 'close' } | { e: 'phase'; n: number } | { e: 'reveal' } | { e: 'dead' }

export const DONG = {
  hp: 540,
  phaseAt: [0.66, 0.33],
  covers: 6, minCovers: 2,
  throw: { windup: 1.5, flight: 1.4, slowLead: 0.4, dmg: 2 },
  sweep: { windup: 4.0, dmg: 2 }, // long enough to cross 3 covers (~0.9 s each) after the cut
  slam: { windup: 1.7, dmg: 1, exposedDmg: 2 }, // exposed = caught mid-dash; Đỡ soaks 1
  recover: 0.7,
  armDown: 2.0,       // opening after a throw (↑ leap)
  phaseStagger: 1.6,
  reveal: 3.4,        // phase 3: rips off its roof panel → silver car in the chest
  seamMult: 1.5,      // seams count as weak points
  wave: { dmg: 9, cooldown: 1.8, flight: 0.55 }, // sóng chém from cover (Lõi Người gác, Lực 1)
  phases: [
    { order: ['throw', 'throw', 'sweep'] as Attack[], idle: 1.8, tempo: 1 },
    { order: ['throw', 'sweep', 'throw', 'slam'] as Attack[], idle: 1.2, tempo: 0.9 },
    { order: ['throw', 'slam', 'throw', 'sweep', 'throw'] as Attack[], idle: 0.9, tempo: 0.82 },
  ],
  seams: [['faceL', 'faceR'], ['faceL', 'faceR', 'shoulder'], ['chest']] as Seam[][],
}

/** covers 0..2 are on the left half of the arc, 3..5 on the right */
export const sideOf = (cover: number): -1 | 1 => (cover < DONG.covers / 2 ? -1 : 1)

/** ‹ › : next standing cover in that direction, or the same one when none is left */
export function nextCover(alive: boolean[], from: number, dir: -1 | 1) {
  for (let i = from + dir; i >= 0 && i < alive.length; i += dir) if (alive[i]) return i
  return from
}
/** after a leap: the standing cover nearest to where the arm lay */
export function nearestCover(alive: boolean[], to: number) {
  let best = -1
  for (let i = 0; i < alive.length; i++) if (alive[i] && (best < 0 || Math.abs(i - to) < Math.abs(best - to))) best = i
  return best < 0 ? to : best
}
/** a car on a cover: staying = cover breaks; an empty cover only cracks, the second car breaks it. Never below minCovers. */
export function throwBreaks(alive: boolean[], target: number, stayed: boolean, cracked: boolean) {
  return alive[target] && (stayed || cracked) && alive.filter(Boolean).length > DONG.minCovers
}
/** damage to the player at an impact. cover = where the body is (dest while dashing), dashing = in the open */
export function impactDamage(ev: { kind: Attack; target: number; side: -1 | 1 }, cover: number, dashing: boolean, guarding: boolean) {
  if (ev.kind === 'throw') return cover === ev.target ? DONG.throw.dmg : 0
  if (ev.kind === 'sweep') return sideOf(cover) === ev.side ? DONG.sweep.dmg : 0
  const d = dashing ? DONG.slam.exposedDmg : DONG.slam.dmg
  return Math.max(0, d - (guarding ? 1 : 0))
}
/** ↑ is offered only during the opening and only from a cover next to where the arm came down */
export const inReach = (armAt: number, cover: number) => Math.abs(armAt - cover) <= 1

export class DongBrain {
  hp = DONG.hp; maxHp = DONG.hp
  stage = 0; state: DState = 'idle'; t = 0
  kind: Attack = 'throw'; target = 0; side: -1 | 1 = 1
  /** where the arm lies during the opening (cover index of the last throw) */
  armAt = 0
  on: (ev: DEvent) => void = () => {}
  private i = 0; private slowSent = false; private pending = -1

  get open() { return this.state === 'down' }
  get alive() { return this.state !== 'dead' }
  get seams() { return DONG.seams[this.stage] }
  get windupT() { return (DONG[this.kind].windup) * DONG.phases[this.stage].tempo }
  static phaseFor(hp: number, max: number) { return DONG.phaseAt.filter(f => hp <= max * f).length }

  private go(s: DState) { this.state = s; this.t = 0 }

  /** a seam hit or a sóng chém; phase changes wait until the body is back in cover */
  damage(n: number) {
    if (!this.alive || n <= 0) return
    this.hp = Math.max(0, this.hp - n)
    if (this.hp <= 0) { this.go('dead'); this.on({ e: 'dead' }); return }
    const want = DongBrain.phaseFor(this.hp, this.maxHp)
    if (want > this.stage) this.pending = want
  }
  /** player leapt onto the arm: the opening holds until release() */
  hold() { if (this.state === 'down') this.go('assault') }
  release() { if (this.state === 'assault') { this.go('recover'); this.on({ e: 'close' }) } }

  /** playerCover: cover index the body is at (or heading to) */
  update(dt: number, playerCover: number) {
    if (!this.alive) return
    this.t += dt
    const P = DONG.phases[this.stage]
    switch (this.state) {
      case 'idle':
        if (this.pending > this.stage) { this.stage = this.pending; this.i = 0; this.go(this.stage === 2 ? 'reveal' : 'stagger'); this.on(this.stage === 2 ? { e: 'reveal' } : { e: 'phase', n: this.stage + 1 }); return }
        if (this.t >= P.idle) {
          this.kind = P.order[this.i++ % P.order.length]
          this.target = playerCover; this.side = sideOf(playerCover)
          this.go('windup'); this.on({ e: 'telegraph', kind: this.kind, target: this.target, side: this.side })
        }
        break
      case 'windup':
        if (this.t < this.windupT) break
        if (this.kind === 'throw') {
          this.target = playerCover // aimed at where the body is when the car leaves the hand
          this.slowSent = false; this.go('flight'); this.on({ e: 'release', target: this.target })
        } else { this.on({ e: 'impact', kind: this.kind, target: this.target, side: this.side }); this.go('recover') }
        break
      case 'flight':
        if (!this.slowSent && this.t >= DONG.throw.flight - DONG.throw.slowLead) { this.slowSent = true; this.on({ e: 'slow' }) }
        if (this.t >= DONG.throw.flight) {
          this.on({ e: 'impact', kind: 'throw', target: this.target, side: sideOf(this.target) })
          this.armAt = this.target; this.go('down'); this.on({ e: 'open' })
        }
        break
      case 'down':
        if (this.t >= DONG.armDown) { this.go('recover'); this.on({ e: 'close' }) }
        break
      case 'assault': break
      case 'recover': if (this.t >= DONG.recover) this.go('idle'); break
      case 'stagger': if (this.t >= DONG.phaseStagger) this.go('idle'); break
      case 'reveal': if (this.t >= DONG.reveal) this.go('idle'); break
    }
  }
}
