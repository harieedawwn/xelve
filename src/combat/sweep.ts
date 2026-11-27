// Swept hit test: 4 blade samples prev→cur vs enemy capsule + head sphere. Allocation-free except the event data.
import * as THREE from 'three'
import { clamp } from '../camera/springs'
import { damage } from './damage'
import type { Weapon } from './weapon'
import type { Bus } from './bus'
import type { FX } from '../render/fx'

export interface Target {
  alive: boolean; hitCooldown: number; blood: number
  hitParts(): { a: THREE.Vector3; b: THREE.Vector3; r: number; head: THREE.Vector3; hr: number }
  takeHit(dmg: number, at: THREE.Vector3, dir: THREE.Vector3, fx: FX, weak: boolean): boolean
}
export const SLASH_V = 2.2 // m/s: below this it is not a slash
const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3()

export function sweep(weapon: Weapon, targets: Target[], fx: FX, bus: Bus) {
  if (!weapon.touching || weapon.tipSpeed < SLASH_V) return
  const v = weapon.tipSpeed, pr = weapon.profile
  for (const e of targets) {
    if (!e.alive || e.hitCooldown > 0) continue
    const P = e.hitParts()
    let hit = false, head = false
    for (let k = 0; k < 4 && !hit; k++) for (let t = 0; t <= 1 && !hit; t += 0.5) {
      const p = A.copy(weapon.prev[k]).lerp(weapon.cur[k], t)
      if (p.distanceTo(P.head) < P.hr + 0.04) { hit = head = true; C.copy(p) }
      else {
        const ab = B.copy(P.b).sub(P.a), u = clamp(((p.x - P.a.x) * ab.x + (p.y - P.a.y) * ab.y + (p.z - P.a.z) * ab.z) / ab.lengthSq(), 0, 1)
        if (p.distanceTo(ab.multiplyScalar(u).add(P.a)) < P.r + 0.04) { hit = true; C.copy(p) }
      }
    }
    if (!hit) continue
    const dir = B.copy(weapon.cur[3]).sub(weapon.prev[3])
    if (dir.lengthSq() < 1e-8) dir.set(0, 0, -1); dir.normalize()
    const dmg = damage({ mContact: pr.contactMass, v, shape: pr.shape, charge: pr.charged ? weapon.charge : undefined, weak: head })
    const at = C.clone(), d = dir.clone()
    const killed = e.takeHit(dmg, at, d, fx, head)
    weapon.spend()
    bus.emit('hit', { dmg, head, killed, at, dir: d, speed: v, lastOfWave: false, blood: e.blood })
  }
}
