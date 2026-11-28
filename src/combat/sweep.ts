// Swept hit test: 4 blade samples prev→cur vs enemy capsule + head sphere. Allocation-free except the event data.
import * as THREE from 'three'
import { clamp } from '../camera/springs'
import { damage } from './damage'
import type { Weapon } from './weapon'
import type { Bus } from './bus'
import type { FX } from '../render/fx'
import { resolveEffects, HitFx } from './effects'
import { Status, STATUS } from './status'
import { FEEL } from './feel'

export interface HitMeta { charge: number; blunt: boolean; fx?: HitFx }
export interface Target {
  alive: boolean; hittable?: boolean; blocked?: boolean; hitCooldown: number; blood: number; status?: Status
  hitParts(): { a: THREE.Vector3; b: THREE.Vector3; r: number; head: THREE.Vector3; hr: number }
  takeHit(dmg: number, at: THREE.Vector3, dir: THREE.Vector3, fx: FX, weak: boolean, meta?: HitMeta): boolean
}
export const SLASH_V = 2.2 // m/s: below this it is not a slash
const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), F = new THREE.Vector3()

/** blade point vs capsule a–b (radius r) + head sphere, radii ×FEEL.capsule. 0 miss, 1 body, 2 head */
export function touches(p: THREE.Vector3, P: ReturnType<Target['hitParts']>) {
  const m = FEEL.capsule
  if (p.distanceTo(P.head) < P.hr * m + 0.04) return 2
  const ab = B.copy(P.b).sub(P.a), u = clamp(((p.x - P.a.x) * ab.x + (p.y - P.a.y) * ab.y + (p.z - P.a.z) * ab.z) / ab.lengthSq(), 0, 1)
  return p.distanceTo(ab.multiplyScalar(u).add(P.a)) < P.r * m + 0.04 ? 1 : 0
}

export function sweep(weapon: Weapon, targets: Target[], vfx: FX, bus: Bus) {
  if (!weapon.touching || weapon.tipSpeed < SLASH_V) return
  const v = weapon.tipSpeed, pr = weapon.profile
  for (const e of targets) {
    if (!e.alive || e.hitCooldown > 0 || e.hittable === false) continue
    const P = e.hitParts()
    let hit = false, head = false, hitK = 0
    // tip forgiveness: the tip also tests a point FEEL.tipForgive ahead along its motion
    F.copy(weapon.cur[3]).sub(weapon.prev[3]); const fl = F.length(); if (fl > 1e-5) F.multiplyScalar(FEEL.tipForgive / fl)
    for (let k = 0; k < 5 && !hit; k++) for (let t = 0; t <= 1 && !hit; t += 0.5) {
      const p = k < 4 ? A.copy(weapon.prev[k]).lerp(weapon.cur[k], t) : fl > 1e-5 ? A.copy(weapon.prev[3]).lerp(weapon.cur[3], t).add(F) : null
      if (!p) break
      const r = touches(p, P)
      if (r) { hit = true; head = r === 2; hitK = Math.min(k, 3); C.copy(p) }
    }
    if (!hit) continue
    const dir = B.copy(weapon.cur[3]).sub(weapon.prev[3])
    if (dir.lengthSq() < 1e-8) dir.set(0, 0, -1); dir.normalize()
    const full = !pr.charged || weapon.charge >= 0.9
    const fx = resolveEffects(weapon.contacts[hitK], { charge: pr.charged ? weapon.charge : 1, weak: head, sharp: pr.shape === 'sac' })
    const shape = fx.tip && pr.shape === 'sac' ? 'mui' : pr.shape
    const dmg = damage({ mContact: pr.contactMass, v, shape, charge: pr.charged ? weapon.charge : undefined, weak: head, matMult: fx.dmgMult })
    const at = C.clone(), d = dir.clone()
    const killed = e.takeHit(dmg, at, d, vfx, head, { charge: weapon.charge, blunt: pr.shape === 'cun', fx })
    if (e.blocked) {
      if (fx.chip) weapon.chip(hitK)
      bus.emit('hit', { dmg: 0, head: false, killed: false, blocked: true, at, dir: d, speed: v, lastOfWave: false, blood: e.blood }); continue
    }
    if (fx.bounce > 1) weapon.spring.v.multiplyScalar(-0.3 * fx.bounce)
    if (pr.charged && full && weapon.breakNeck()) bus.emit('break', { at })
    weapon.spend()
    bus.emit('hit', { dmg, head, killed, at, dir: d, speed: v, lastOfWave: false, blood: e.blood })
  }
}

/** Bỏng jumps to touching enemies (weapon.md#6 magie). Cheap: only runs while something burns. */
export function spreadBurn(targets: Target[]) {
  for (const a of targets) {
    if (!a.alive || !a.status?.burning) continue
    const pa = a.hitParts().a
    for (const b of targets) {
      if (b === a || !b.alive || !b.status || b.status.burning) continue
      if (pa.distanceTo(b.hitParts().a) < STATUS.spreadRadius) b.status.apply('bong', a.status.bong)
    }
  }
}
