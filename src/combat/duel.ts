// Duel attack script (combat.md#6): telegraphed moves with a readable pose, slow-mo before impact, feints, staggers.
// Pure: the scene feeds dt (game s) and gets events; Người gác (P10) reuses it with its own move list.
import { DEFENSE, type Attack } from './defense'

export type Pose = 'overhead' | 'left' | 'right' | 'thrust'
export interface Move extends Attack {
  id: string; pose: Pose
  windup: number    // s from the start of the wind-up to the impact
  recover: number   // s after the impact before the next move may start
  /** feint: after `at` s the move becomes `to` (pose + answers); the angle change is visible */
  feint?: { at: number; to: string }
}

/** Registry: 1 line per move. Sweep "left" = baton angled to his left side → Né right (+1). */
export const MOVES: Record<string, Move> = {
  overhead: { id: 'overhead', pose: 'overhead', windup: 0.85, recover: 0.6, dmg: 1, dodge: 0, blockable: true },
  sweepL: { id: 'sweepL', pose: 'left', windup: 0.75, recover: 0.55, dmg: 1, dodge: 1, blockable: true },
  sweepR: { id: 'sweepR', pose: 'right', windup: 0.75, recover: 0.55, dmg: 1, dodge: -1, blockable: true },
  thrust: { id: 'thrust', pose: 'thrust', windup: 0.7, recover: 0.7, dmg: 1, dodge: null, blockable: true },
  feint: { id: 'feint', pose: 'overhead', windup: 0.95, recover: 0.6, dmg: 1, dodge: 0, blockable: true, feint: { at: 0.2, to: 'sweepR' } },
  slam: { id: 'slam', pose: 'overhead', windup: 1.1, recover: 0.9, dmg: 2, dodge: 0, blockable: true },
}
/** the test dummy cycles every move once, in this order */
export const DUMMY_ORDER = ['overhead', 'sweepL', 'sweepR', 'thrust', 'feint', 'slam']

export type DuelEvent = 'telegraph' | 'switch' | 'slow' | 'impact'
export type DState = 'idle' | 'windup' | 'recover' | 'stagger'

export class DuelScript {
  state: DState = 'idle'; t = 0; i = 0
  move: Move = MOVES[DUMMY_ORDER[0]]
  private base: Move = this.move; private slowSent = false; private switched = false
  idle = 0.8
  constructor(public order: string[] = DUMMY_ORDER, public on: (e: DuelEvent, m: Move) => void = () => {}) {}

  /** 0..1 progress of the wind-up (for the pose) */
  get windupK() { return this.state === 'windup' ? Math.min(1, this.t / this.base.windup) : 0 }
  /** s left until impact (Infinity outside a wind-up) */
  get toImpact() { return this.state === 'windup' ? this.base.windup - this.t : Infinity }

  stagger(secs: number) { this.state = 'stagger'; this.t = -secs }

  update(dt: number) {
    this.t += dt
    switch (this.state) {
      case 'idle': case 'stagger':
        if (this.state === 'stagger' && this.t < 0) break
        if (this.state === 'stagger') { this.state = 'idle'; this.t = 0; break }
        if (this.t >= this.idle) this.start()
        break
      case 'windup': {
        const f = this.base.feint
        if (f && !this.switched && this.t >= f.at) { this.switched = true; this.move = { ...MOVES[f.to], windup: this.base.windup }; this.on('switch', this.move) }
        if (!this.slowSent && this.toImpact <= DEFENSE.duelSlowLead) { this.slowSent = true; this.on('slow', this.move) }
        if (this.t >= this.base.windup) { this.state = 'recover'; this.t = 0; this.on('impact', this.move) }
        break
      }
      case 'recover':
        if (this.t >= this.move.recover) { this.state = 'idle'; this.t = 0 }
        break
    }
  }
  private start() {
    this.base = this.move = MOVES[this.order[this.i++ % this.order.length]]
    this.state = 'windup'; this.t = 0; this.slowSent = false; this.switched = false
    this.on('telegraph', this.move)
  }
}
