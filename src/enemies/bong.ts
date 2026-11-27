// Bóng: charcoal low-poly humanoid copying a human habit; zombie shuffle, telegraphed lunge.
import * as THREE from 'three'
import { PAL } from '../render/palette'
import { FX } from '../render/fx'
import { clamp, lerp, smooth } from '../camera/springs'

const inkMat = new THREE.MeshLambertMaterial({ color: PAL.ink, flatShading: true })
type State = 'emerge' | 'approach' | 'windup' | 'lunge' | 'recover' | 'stagger' | 'dead'

function limb(len: number, r0: number, r1: number) {
  const g = new THREE.CylinderGeometry(r1, r0, len, 5, 1); g.translate(0, -len / 2, 0)
  return new THREE.Mesh(g, inkMat)
}

export class Bong {
  root = new THREE.Group(); hips = new THREE.Group(); torso: THREE.Mesh; head: THREE.Mesh
  armL = new THREE.Group(); armR = new THREE.Group(); legL = new THREE.Group(); legR = new THREE.Group()
  foreL!: THREE.Mesh; foreR!: THREE.Mesh; shinL!: THREE.Mesh; shinR!: THREE.Mesh
  hp = 30; state: State = 'emerge'; st = 0
  blood = PAL.bloodTim
  vel = new THREE.Vector3(); phase = Math.random() * 6; slotX = 0
  private seed = Math.random() * 10
  private wounds: THREE.Mesh[] = []
  private lean = 0; private flinch = 0; private flinchV = 0
  hitCooldown = 0; struckPlayer = false
  private tmp = new THREE.Vector3()

  constructor(private scene: THREE.Scene, public from: THREE.Vector3) {
    const s = 0.95 + Math.random() * 0.12
    this.root.scale.setScalar(s)
    this.root.position.copy(from)
    this.hips.position.y = 0.92; this.root.add(this.hips)
    const tg = new THREE.CylinderGeometry(0.2, 0.15, 0.62, 5, 1); tg.translate(0, 0.31, 0)
    this.torso = new THREE.Mesh(tg, inkMat); this.torso.scale.set(1, 1, 0.7); this.hips.add(this.torso)
    const hg = new THREE.IcosahedronGeometry(0.13, 0); hg.scale(0.9, 1.15, 1)
    this.head = new THREE.Mesh(hg, inkMat); this.head.position.y = 0.78; this.torso.add(this.head)
    for (const [arm, x] of [[this.armL, -0.24], [this.armR, 0.24]] as const) {
      arm.position.set(x, 0.56, 0); this.torso.add(arm)
      const up = limb(0.32, 0.055, 0.065); arm.add(up)
      const fo = limb(0.34, 0.04, 0.05); fo.position.y = -0.32; up.add(fo)
      if (x < 0) this.foreL = fo; else this.foreR = fo
    }
    for (const [leg, x] of [[this.legL, -0.11], [this.legR, 0.11]] as const) {
      leg.position.set(x, 0, 0); this.hips.add(leg)
      const th = limb(0.46, 0.07, 0.09); leg.add(th)
      const sh = limb(0.46, 0.05, 0.065); sh.position.y = -0.46; th.add(sh)
      if (x < 0) this.shinL = sh; else this.shinR = sh
    }
    scene.add(this.root)
  }

  get alive() { return this.state !== 'dead' }

  /** capsule (torso) + sphere (head) for hit tests, world space */
  hitParts() {
    const p = this.root.position, s = this.root.scale.x
    return {
      a: new THREE.Vector3(p.x, p.y + 0.9 * s, p.z), b: new THREE.Vector3(p.x, p.y + 1.5 * s, p.z), r: 0.27 * s,
      head: this.head.getWorldPosition(this.tmp).clone(), hr: 0.16 * s,
    }
  }

  takeHit(dmg: number, at: THREE.Vector3, dir: THREE.Vector3, fx: FX, weak: boolean) {
    this.hp -= dmg
    this.hitCooldown = 0.08
    this.vel.addScaledVector(new THREE.Vector3(dir.x, 0, dir.z).normalize(), 1.4 + dmg * 0.05)
    this.flinchV += (weak ? 9 : 6) * (Math.random() < 0.5 ? -1 : 1)
    // wound: a hard-edged crack of its colour stuck to the body
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.06 + Math.random() * 0.05, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: this.blood }))
    const host = weak ? this.head : this.torso
    host.worldToLocal(w.position.copy(at)); w.rotation.z = Math.random() * 3; host.add(w); this.wounds.push(w)
    fx.blood(at, dir, this.blood, weak ? 46 : 28)
    fx.splash(at, dir, this.blood, weak ? 4 : 2)
    if (this.hp <= 0) { this.die(dir, fx); return true }
    if (this.state === 'windup' || this.state === 'approach' || this.state === 'lunge') { this.state = 'stagger'; this.st = 0 }
    return false
  }

  private die(dir: THREE.Vector3, fx: FX) {
    this.state = 'dead'
    const parts: THREE.Object3D[] = [this.head, this.torso, this.foreL, this.foreR, this.shinL, this.shinR,
      this.armL.children[0], this.armR.children[0], this.legL.children[0], this.legR.children[0]]
    for (const m of parts) {
      this.scene.attach(m)
      const v = new THREE.Vector3(dir.x * (2 + Math.random() * 3), 1.5 + Math.random() * 3.5, dir.z * (2 + Math.random() * 3))
        .add(new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3))
      fx.addDebris(m, v, new THREE.Vector3(Math.random() * 14 - 7, Math.random() * 14 - 7, Math.random() * 14 - 7))
    }
    const c = this.root.position.clone(); c.y += 1.2
    fx.blood(c, dir, this.blood, 90, 5)
    fx.splash(c, dir, this.blood, 10)
    this.scene.remove(this.root)
  }

  update(dt: number, player: THREE.Vector3, onStrike: (e: Bong) => void) {
    if (!this.alive) return
    this.st += dt; this.hitCooldown -= dt
    const p = this.root.position
    const goal = this.tmp.set(player.x + this.slotX, 0, player.z - 1.05)
    const to = goal.sub(p); to.y = 0
    const dist = to.length()
    let speed = 0, armRaise = 0, push = 0
    switch (this.state) {
      case 'emerge': speed = 0.9; if (this.st > 0.9) { this.state = 'approach'; this.st = 0 } break
      case 'approach':
        speed = 0.6 * (0.55 + 0.45 * Math.max(0, Math.sin(this.phase * 0.5)))
        if (dist < 0.12) { this.state = 'windup'; this.st = 0 }
        break
      case 'windup': armRaise = smooth(this.st / 0.65); push = -0.1 * armRaise
        if (this.st > 0.7) { this.state = 'lunge'; this.st = 0; this.struckPlayer = false } break
      case 'lunge': armRaise = 1; push = 0.38 * smooth(this.st / 0.14)
        if (this.st > 0.13 && !this.struckPlayer) { this.struckPlayer = true; onStrike(this) }
        if (this.st > 0.3) { this.state = 'recover'; this.st = 0 } break
      case 'recover': armRaise = 1 - smooth(this.st / 0.6); push = 0.38 * (1 - smooth(this.st / 0.5))
        if (this.st > 0.9) { this.state = 'approach'; this.st = 0 } break
      case 'stagger': if (this.st > 0.4) { this.state = 'approach'; this.st = 0 } break
    }
    if (dist > 0.01 && speed > 0) p.addScaledVector(to.normalize(), Math.min(dist, speed * dt))
    p.addScaledVector(this.vel, dt); this.vel.multiplyScalar(Math.exp(-6 * dt))
    p.x = clamp(p.x, -1.2, 1.2)
    // face the player
    const fx = player.x - p.x, fz = player.z - p.z
    this.root.rotation.y = Math.atan2(fx, fz)
    // procedural shuffle with a dragging left leg
    const moving = speed > 0 ? 1 : 0.15
    this.phase += dt * (speed * 7 + 0.6)
    const sw = Math.sin(this.phase)
    this.legL.rotation.x = sw * 0.22 * moving; this.legR.rotation.x = -sw * 0.42 * moving
    this.shinL.rotation.x = Math.max(0, -sw) * 0.3 * moving; this.shinR.rotation.x = Math.max(0, sw) * 0.6 * moving
    this.hips.position.y = 0.92 - Math.abs(sw) * 0.03 - (sw > 0 ? 0.035 : 0) * moving
    this.flinchV += (-60 * this.flinch - 9 * this.flinchV) * dt; this.flinch += this.flinchV * dt
    this.lean = lerp(this.lean, 0.28 + push * 0.9 - armRaise * 0.12, 1 - Math.exp(-8 * dt))
    this.hips.position.z = push
    this.hips.rotation.x = this.lean
    this.hips.rotation.z = Math.sin(this.phase * 0.5) * 0.09 + this.flinch * 0.12
    this.head.rotation.z = Math.sin(this.st * 0.7 + this.seed) * 0.35 + this.flinch * 0.3
    this.head.rotation.x = 0.25 + Math.sin(this.st * 0.5 + this.seed) * 0.15
    const dangle = Math.sin(this.phase * 0.5 + 1) * 0.15
    this.armL.rotation.x = lerp(dangle + 0.1, -1.45, armRaise); this.armR.rotation.x = lerp(-dangle + 0.05, -1.55, armRaise)
    this.armL.rotation.z = lerp(0.12, 0.25, armRaise); this.armR.rotation.z = lerp(-0.1, -0.25, armRaise)
    this.foreL.rotation.x = lerp(-0.2, -0.3, armRaise); this.foreR.rotation.x = lerp(-0.35, -0.2, armRaise)
  }
}
