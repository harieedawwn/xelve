// Bóng chạy: sprints on all fours, crouches, then leaps. Only airborne is it fully vulnerable (grounded hits glance). Teaches timing.
import * as THREE from 'three'
import { Enemy, BASE_DEF, EnemyDef } from './base'
import { PAL } from '../render/palette'
import type { FX } from '../render/fx'

export const CHAY_DEF: EnemyDef = {
  ...BASE_DEF, id: 'chay', hp: 20, blood: PAL.bloodDo, gait: 'sprint', speed: 3.2, reach: 2.0,
  windup: 0.45, lungeT: 0.5, strikeT: 0.44, recover: 1.0, lungeMove: true, arc: 0.9, lean: 1.0, hipY: 0.62, capLo: 0.4, capHi: 0.95,
}
export class Chay extends Enemy {
  constructor(scene: THREE.Scene, from: THREE.Vector3) { super(scene, from, CHAY_DEF) }
  get airborne() { return this.state === 'lunge' && this.root.position.y > 0.15 }
  protected filter(dmg: number, _a: THREE.Vector3, _d: THREE.Vector3, _fx: FX, weak: boolean) { return this.airborne || weak ? dmg : dmg * 0.3 }
  protected staggers() { return this.airborne }
}
