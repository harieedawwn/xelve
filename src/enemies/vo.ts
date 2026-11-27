// Bóng vỡ: splits on death. Full (40 HP) → 2 small (12 HP) → each small → 4 tiny (4 HP). Teaches crowd control, wide swings.
import * as THREE from 'three'
import { Enemy, BASE_DEF, EnemyDef } from './base'
import { PAL } from '../render/palette'
import type { FX } from '../render/fx'

const SIZES: { hp: number; scale: number; kids: number; speed: number }[] = [
  { hp: 40, scale: 1, kids: 2, speed: 0.6 }, { hp: 12, scale: 0.62, kids: 4, speed: 0.9 }, { hp: 4, scale: 0.4, kids: 0, speed: 1.3 },
]
export class Vo extends Enemy {
  constructor(scene: THREE.Scene, from: THREE.Vector3, public size = 0) {
    const z = SIZES[size]
    super(scene, from, { ...BASE_DEF, id: 'vo', hp: z.hp, scale: z.scale, blood: PAL.bloodLuc, speed: z.speed, capLo: BASE_DEF.capLo, capHi: BASE_DEF.capHi } as EnemyDef)
  }
  protected onDie(dir: THREE.Vector3, _fx: FX) {
    const n = SIZES[this.size].kids; if (!n) return
    for (let i = 0; i < n; i++) {
      const at = this.root.position.clone(); at.x += (i - (n - 1) / 2) * 0.3; at.y = 0
      const k = new Vo(this.scene, at, this.size + 1); k.slotX = clamp1(this.slotX + (i - (n - 1) / 2) * 0.35)
      k.vel.set(dir.x * 1.5 + (i - (n - 1) / 2) * 1.2, 0, 0); k.state = 'approach'
      k.onSound = this.onSound; k.onSpawn = this.onSpawn; this.onSpawn(k)
    }
  }
}
const clamp1 = (x: number) => Math.max(-0.9, Math.min(0.9, x))
