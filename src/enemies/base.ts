// Shared enemy body: procedural humanoid rig + locomotion (shuffle/limp, sprint) + attack cycle (wind-up → lunge → recover),
// telegraph (pose + sound + crack-colour flash in the last 150 ms). Types are defs + small hook overrides.
import * as THREE from 'three'
import { PAL } from '../render/palette'
import type { FX } from '../render/fx'
import type { HitMeta } from '../combat/sweep'
import { clamp, lerp, smooth } from '../camera/springs'
import { Status } from '../combat/status'

export interface EnemyDef {
  id: string; hp: number; blood: number; scale: number
  gait: 'shuffle' | 'sprint'; speed: number; reach: number
  windup: number; lungeT: number; strikeT: number; recover: number
  lungeMove: boolean; arc: number; lean: number; hipY: number; capLo: number; capHi: number
}
export const BASE_DEF: EnemyDef = {
  id: 'bong', hp: 30, blood: PAL.bloodTim, scale: 1, gait: 'shuffle', speed: 1.0, reach: 0.12,
  windup: 0.7, lungeT: 0.3, strikeT: 0.13, recover: 0.9, lungeMove: false, arc: 0, lean: 0.28, hipY: 0.92, capLo: 0.9, capHi: 1.5,
}
export type EState = 'emerge' | 'approach' | 'windup' | 'lunge' | 'recover' | 'stagger' | 'dead'
export const inkMat = new THREE.MeshLambertMaterial({ color: PAL.ink, flatShading: true })
const flashMats = new Map<number, THREE.Material>()
const flashMat = (c: number) => { let m = flashMats.get(c); if (!m) flashMats.set(c, m = new THREE.MeshBasicMaterial({ color: c })); return m }

export class Enemy {
  root = new THREE.Group(); hips = new THREE.Group(); torso: THREE.Mesh; head: THREE.Mesh
  armL = new THREE.Group(); armR = new THREE.Group(); legL = new THREE.Group(); legR = new THREE.Group()
  foreL!: THREE.Mesh; foreR!: THREE.Mesh; shinL!: THREE.Mesh; shinR!: THREE.Mesh
  hp: number; maxHp: number; state: EState = 'emerge'; st = 0; blood: number
  /** sound hook: '<sound>.telegraph' | '.lunge' | '.hurt' | '.death' (all types share the Bóng recipes for now) */
  onSound: (name: string) => void = () => {}
  /** vo: new enemies born from this one; the owner wires them (list, sound, strike) */
  onSpawn: (e: Enemy) => void = () => {}
  vel = new THREE.Vector3(); phase = Math.random() * 6; slotX = 0
  hitCooldown = 0; struckPlayer = false; sound = 'bong'
  status = new Status()
  private lastFx: FX | null = null; private tinted: number | null = null; private dotT = 0
  protected seed = Math.random() * 10
  protected wounds: THREE.Mesh[] = []
  protected lean = 0; protected flinch = 0; protected flinchV = 0
  protected lungeV = 0; protected tmp = new THREE.Vector3(); protected pose = 0
  protected parts: THREE.Mesh[] = []; private flashing = false

  constructor(protected scene: THREE.Scene, public from: THREE.Vector3, public def: EnemyDef, protected mat: THREE.Material = inkMat) {
    this.hp = this.maxHp = def.hp; this.blood = def.blood
    const s = def.scale * (0.95 + Math.random() * 0.12)
    this.root.scale.setScalar(s); this.root.position.copy(from)
    this.hips.position.y = def.hipY; this.root.add(this.hips)
    const tg = new THREE.CylinderGeometry(0.2, 0.15, 0.62, 5, 1); tg.translate(0, 0.31, 0)
    this.torso = new THREE.Mesh(tg, mat); this.torso.scale.set(1, 1, 0.7); this.hips.add(this.torso)
    const hg = new THREE.IcosahedronGeometry(0.13, 0); hg.scale(0.9, 1.15, 1)
    this.head = new THREE.Mesh(hg, mat); this.head.position.y = 0.78; this.torso.add(this.head)
    for (const [arm, x] of [[this.armL, -0.24], [this.armR, 0.24]] as const) {
      arm.position.set(x, 0.56, 0); this.torso.add(arm)
      const up = this.limb(0.32, 0.055, 0.065); arm.add(up)
      const fo = this.limb(0.34, 0.04, 0.05); fo.position.y = -0.32; up.add(fo)
      this.parts.push(up, fo)
      if (x < 0) this.foreL = fo; else this.foreR = fo
    }
    for (const [leg, x] of [[this.legL, -0.11], [this.legR, 0.11]] as const) {
      leg.position.set(x, 0, 0); this.hips.add(leg)
      const th = this.limb(0.46, 0.07, 0.09); leg.add(th)
      const sh = this.limb(0.46, 0.05, 0.065); sh.position.y = -0.46; th.add(sh)
      if (x < 0) this.shinL = sh; else this.shinR = sh
    }
    scene.add(this.root)
  }
  private limb(len: number, r0: number, r1: number) {
    const g = new THREE.CylinderGeometry(r1, r0, len, 5, 1); g.translate(0, -len / 2, 0)
    return new THREE.Mesh(g, this.mat)
  }

  get alive() { return this.state !== 'dead' }
  /** false = swings pass through (nhieu while phased) */
  get hittable() { return true }

  hitParts() {
    const p = this.root.position, s = this.root.scale.x, d = this.def
    return {
      a: new THREE.Vector3(p.x, p.y + d.capLo * s, p.z), b: new THREE.Vector3(p.x, p.y + d.capHi * s, p.z), r: 0.27 * s,
      head: this.head.getWorldPosition(this.tmp).clone(), hr: 0.16 * s,
    }
  }

  // ---- hooks for types
  /** damage after type rules; 0 = blocked. */
  protected filter(dmg: number, _at: THREE.Vector3, _dir: THREE.Vector3, _fx: FX, _weak: boolean, _m?: HitMeta): number { return dmg }
  protected tick(_dt: number): void {}
  protected staggers() { return true }
  protected attackAllowed() { return true }
  protected onDie(_dir: THREE.Vector3, _fx: FX): void {}
  /** set by filter() when the last hit was blocked (sweep reads it) */
  blocked = false

  takeHit(dmg: number, at: THREE.Vector3, dir: THREE.Vector3, fx: FX, weak: boolean, meta?: HitMeta) {
    this.blocked = false
    dmg = this.filter(dmg, at, dir, fx, weak, meta)
    this.hitCooldown = 0.08; this.lastFx = fx
    if (dmg <= 0) { this.blocked = true; return false }
    const m = meta?.fx
    dmg *= this.status.shatter(meta?.charge ?? 0, !!meta?.blunt)
    this.hp -= dmg
    this.vel.addScaledVector(new THREE.Vector3(dir.x, 0, dir.z).normalize(), (1.4 + dmg * 0.05) * (m?.knock ?? 1))
    if (m) for (const x of m.statuses) { this.status.apply(x.kind, x.secs, x.power); if (x.kind === 'chaymau' && x.power > 1) fx.blood(at, dir, this.blood, 16) }
    this.flinchV += (weak ? 9 : 6) * (Math.random() < 0.5 ? -1 : 1)
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.06 + Math.random() * 0.05, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: this.blood }))
    const host = weak ? this.head : this.torso
    host.worldToLocal(w.position.copy(at)); w.rotation.z = Math.random() * 3; host.add(w); this.wounds.push(w)
    const k = this.root.scale.x
    fx.blood(at, dir, this.blood, Math.round((weak ? 46 : 28) * Math.min(1, 0.4 + k)))
    fx.splash(at, dir, this.blood, weak ? 4 : 2)
    if (this.hp <= 0) { this.onSound(this.sound + '.death'); this.die(dir, fx); return true }
    this.onSound(this.sound + '.hurt')
    if (this.staggers() && (this.state === 'windup' || this.state === 'approach' || this.state === 'lunge')) { this.setState('stagger'); this.flash(false) }
    return false
  }

  protected setState(s: EState) { this.state = s; this.st = 0 }
  /** solid tint (Đóng băng / Bỏng); null = back to the body material */
  private setTint(c: number | null) {
    if (c === this.tinted) return; this.tinted = c
    const m = c === null ? (this.flashing ? flashMat(this.blood) : this.mat) : flashMat(c)
    for (const p of this.parts) p.material = m
    this.head.material = this.torso.material = m
  }
  protected flash(on: boolean) {
    if (this.tinted !== null) { this.flashing = on; return }
    if (on === this.flashing) return; this.flashing = on
    const m = on ? flashMat(this.blood) : this.mat
    for (const p of this.parts) p.material = m
  }

  protected die(dir: THREE.Vector3, fx: FX) {
    this.state = 'dead'; this.flash(false)
    const parts: THREE.Object3D[] = [this.head, this.torso, this.foreL, this.foreR, this.shinL, this.shinR,
      this.armL.children[0], this.armR.children[0], this.legL.children[0], this.legR.children[0]]
    for (const m of parts) {
      this.scene.attach(m)
      const v = new THREE.Vector3(dir.x * (2 + Math.random() * 3), 1.5 + Math.random() * 3.5, dir.z * (2 + Math.random() * 3))
        .add(new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3))
      fx.addDebris(m, v, new THREE.Vector3(Math.random() * 14 - 7, Math.random() * 14 - 7, Math.random() * 14 - 7))
    }
    const c = this.root.position.clone(); c.y += 1.2 * this.root.scale.x
    fx.blood(c, dir, this.blood, Math.round(90 * Math.min(1, 0.3 + this.root.scale.x)), 5)
    fx.splash(c, dir, this.blood, 10)
    this.scene.remove(this.root)
    this.onDie(dir, fx)
  }

  update(dt: number, player: THREE.Vector3, onStrike: (e: Enemy) => void) {
    if (!this.alive) return
    const dot = this.status.tick(dt)
    if (dot > 0) { this.hp -= dot; this.dotT += dt; if (this.hp <= 0 && this.lastFx) { this.setTint(null); this.die(new THREE.Vector3(0, 0, -1), this.lastFx); return } }
    this.setTint(this.status.frozen ? 0xc4e9ff : this.status.burning && Math.sin(this.dotT * 40) > 0 ? PAL.ve : null)
    if (this.status.frozen) return
    const d = this.def, sprint = d.gait === 'sprint'
    this.st += dt; this.hitCooldown -= dt
    const p = this.root.position
    const goal = this.tmp.set(player.x + this.slotX, 0, player.z - 1.05)
    const to = goal.sub(p); to.y = 0
    const dist = to.length()
    let speed = 0, armRaise = 0, push = 0, crouch = 0
    switch (this.state) {
      case 'emerge': speed = Math.max(1.8, d.speed); if (this.st > 0.5 && Math.abs(p.x) <= 1.2) this.setState('approach'); break
      case 'approach':
        speed = sprint ? d.speed : d.speed * (0.55 + 0.45 * Math.max(0, Math.sin(this.phase * 0.5)))
        if (dist < d.reach && this.attackAllowed()) { this.setState('windup'); this.onSound(this.sound + '.telegraph') }
        break
      case 'windup':
        armRaise = smooth(this.st / (d.windup - 0.05)); push = -0.1 * armRaise; crouch = armRaise
        this.flash(this.st > d.windup - 0.15)
        if (this.st > d.windup) {
          this.flash(false); this.setState('lunge'); this.struckPlayer = false; this.onSound(this.sound + '.lunge')
          this.lungeV = d.lungeMove ? dist / d.lungeT : 0
        }
        break
      case 'lunge': armRaise = 1; push = 0.38 * smooth(this.st / 0.14)
        if (this.lungeV > 0) { p.addScaledVector(to.normalize(), Math.min(dist, this.lungeV * dt)); p.y = d.arc * Math.sin(Math.PI * clamp(this.st / d.lungeT, 0, 1)) }
        if (this.st > d.strikeT && !this.struckPlayer) { this.struckPlayer = true; onStrike(this) }
        if (this.st > d.lungeT) this.setState('recover')
        break
      case 'recover': armRaise = 1 - smooth(this.st / (d.recover * 0.65)); push = 0.38 * (1 - smooth(this.st / (d.recover * 0.55)))
        if (this.st > d.recover) this.setState('approach'); break
      case 'stagger': if (this.st > 0.4) this.setState('approach'); break
    }
    if (this.status.stunned && this.state !== 'stagger' && this.state !== 'emerge') this.setState('stagger')
    if (this.status.stunned) this.st = 0
    if (this.state !== 'lunge') p.y *= Math.exp(-14 * dt)
    if (dist > 0.01 && speed > 0) p.addScaledVector(to.normalize(), Math.min(dist, speed * dt))
    p.addScaledVector(this.vel, dt); this.vel.multiplyScalar(Math.exp(-6 * dt))
    if (this.state !== 'emerge') p.x = clamp(p.x, -1.2, 1.2) // side entries walk in from beyond the edge first
    this.root.rotation.y = Math.atan2(player.x - p.x, player.z - p.z)
    this.tick(dt)
    this.animate(dt, speed, armRaise, push, crouch, sprint)
  }

  protected animate(dt: number, speed: number, armRaise: number, push: number, crouch: number, sprint: boolean) {
    const d = this.def
    const moving = speed > 0 ? 1 : 0.15
    this.phase += dt * (speed * (sprint ? 3.2 : 7) + 0.6)
    const sw = Math.sin(this.phase)
    if (sprint) {
      this.legL.rotation.x = sw * 0.9 * moving; this.legR.rotation.x = -sw * 0.9 * moving
      this.shinL.rotation.x = Math.max(0, -sw) * 1.0 * moving; this.shinR.rotation.x = Math.max(0, sw) * 1.0 * moving
      this.hips.position.y = d.hipY - Math.abs(sw) * 0.05 - crouch * 0.12
    } else {
      this.legL.rotation.x = sw * 0.22 * moving; this.legR.rotation.x = -sw * 0.42 * moving
      this.shinL.rotation.x = Math.max(0, -sw) * 0.3 * moving; this.shinR.rotation.x = Math.max(0, sw) * 0.6 * moving
      this.hips.position.y = d.hipY - Math.abs(sw) * 0.03 - (sw > 0 ? 0.035 : 0) * moving
    }
    this.flinchV += (-60 * this.flinch - 9 * this.flinchV) * dt; this.flinch += this.flinchV * dt
    this.lean = lerp(this.lean, d.lean + push * 0.9 - armRaise * 0.12 + crouch * (sprint ? 0.25 : 0), 1 - Math.exp(-8 * dt))
    this.hips.position.z = push
    this.hips.rotation.x = this.lean
    this.hips.rotation.z = Math.sin(this.phase * 0.5) * 0.09 * (sprint ? 0.4 : 1) + this.flinch * 0.12
    this.head.rotation.z = Math.sin(this.st * 0.7 + this.seed) * 0.35 * (sprint ? 0.3 : 1) + this.flinch * 0.3
    this.head.rotation.x = (sprint ? -0.9 : 0.25) + Math.sin(this.st * 0.5 + this.seed) * 0.15
    if (sprint) { // all fours: arms reach ahead and claw
      const a = -1.5 + sw * 0.6 * moving - armRaise * 0.5
      this.armL.rotation.x = a; this.armR.rotation.x = -1.5 - sw * 0.6 * moving - armRaise * 0.5
      this.armL.rotation.z = 0.15; this.armR.rotation.z = -0.15
      this.foreL.rotation.x = this.foreR.rotation.x = -0.25
      return
    }
    const dangle = Math.sin(this.phase * 0.5 + 1) * 0.15
    this.armL.rotation.x = lerp(dangle + 0.1, -1.45, armRaise); this.armR.rotation.x = lerp(-dangle + 0.05, -1.55, armRaise)
    this.armL.rotation.z = lerp(0.12, 0.25, armRaise); this.armR.rotation.z = lerp(-0.1, -0.25, armRaise)
    this.foreL.rotation.x = lerp(-0.2, -0.3, armRaise); this.foreR.rotation.x = lerp(-0.35, -0.2, armRaise)
  }
}
