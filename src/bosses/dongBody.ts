// Đống's body (~12 m): cars stood up as legs, stacked as torso, a crushed car for a head, two arms of two long cars each.
// The silver family car sits in the chest behind a roof panel (ripped off in phase 3). Poses are eased transforms only.
import * as THREE from 'three'
import { makeCar } from '../levels/car'
import { PAL } from '../render/palette'
import type { DongBrain, Seam } from './dong'
import { smooth, clamp } from '../camera/springs'

export const ARM = { seg: 5.5, shoulderY: 9.2, shoulderX: 2.7 } // arm = 2 × seg
const L = ARM.seg * 2
const crackMat = new THREE.MeshBasicMaterial({ color: PAL.bloodDo })

interface Arm { sh: THREE.Group; el: THREE.Group; hand: THREE.Object3D; side: -1 | 1; t: { x: number; y: number; z: number; e: number } }

export class DongBody {
  root = new THREE.Group(); torso = new THREE.Group(); head: THREE.Group
  arms: Record<-1 | 1, Arm>
  family: THREE.Group; panel: THREE.Group
  seams: Record<Seam, THREE.Group> = {} as Record<Seam, THREE.Group>
  held: THREE.Group | null = null
  pieces: THREE.Object3D[] = []
  private fall: { o: THREE.Object3D; v: THREE.Vector3; w: THREE.Vector3; rest: number }[] = []
  private ring: THREE.Mesh; private ringT = -1
  private panelGone = false; private t = 0
  private tmp = new THREE.Vector3()

  constructor(private scene: THREE.Scene, at: THREE.Vector3) {
    this.root.position.copy(at); scene.add(this.root); this.root.add(this.torso)
    const put = (o: THREE.Object3D, parent: THREE.Object3D, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s = 1) => {
      o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.setScalar(s); parent.add(o); this.pieces.push(o); return o
    }
    for (const x of [-1.5, 1.5]) put(makeCar(), this.root, x - 0.3 * Math.sign(x), 2.15, 0, 0, Math.sign(x) * 0.3, -Math.PI / 2) // legs: cars on end
    put(makeCar('van'), this.torso, 0, 4.4, -0.4, 0, 0, 0.04)                              // pelvis
    put(makeCar(), this.torso, 0.2, 5.8, -0.9, 0, 0.1, -0.05, 1.1)
    put(makeCar(), this.torso, -0.2, 7.0, -1.0, 0, -0.12, 0.06, 1.15)
    put(makeCar('van'), this.torso, 0, 8.2, -0.6, 0, 0.05, 0, 1.25)                         // shoulders
    this.family = put(makeCar('old', PAL.stone), this.torso, 0, 6.0, 0.7, 0, -Math.PI / 2, 0, 0.82) as THREE.Group
    this.panel = new THREE.Group()
    const pg = new THREE.BoxGeometry(3.4, 2.6, 0.2)
    this.panel.add(new THREE.Mesh(pg, new THREE.MeshLambertMaterial({ color: PAL.paper2, flatShading: true })), new THREE.LineSegments(new THREE.EdgesGeometry(pg), new THREE.LineBasicMaterial({ color: PAL.ink })))
    put(this.panel, this.torso, 0, 6.8, 2.1, 0.08)
    this.head = put(makeCar(), this.torso, 0, 9.7, 0.2, 0.12, -Math.PI / 2, 0, 0.78) as THREE.Group
    this.head.scale.y = 0.62
    const mkArm = (side: -1 | 1): Arm => {
      const sh = new THREE.Group(); sh.rotation.order = 'YXZ'; sh.position.set(side * ARM.shoulderX, ARM.shoulderY, -0.3); this.torso.add(sh)
      put(makeCar(), sh, side * 0.4, -ARM.seg / 2, 0, 0, 0, -Math.PI / 2, 1.3)
      const el = new THREE.Group(); el.position.y = -ARM.seg; sh.add(el)
      put(makeCar(), el, side * 0.2, -ARM.seg / 2, 0, 0, Math.PI / 2, -Math.PI / 2, 1.3)
      const hand = new THREE.Object3D(); hand.position.y = -ARM.seg; el.add(hand)
      return { sh, el, hand, side, t: { x: -0.25, y: 0, z: side * 0.15, e: 0 } }
    }
    this.arms = { [-1]: mkArm(-1), [1]: mkArm(1) } as Record<-1 | 1, Arm>
    // seams: jagged cracks in the blood colour (no glow), parented where they sit
    const crack = (parent: THREE.Object3D, x: number, y: number, z: number, len: number, rot: number) => {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.z = rot; parent.add(g)
      for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(len / 4 + 0.05, 0.09, 0.06), crackMat); m.position.set((i - 1.5) * len / 4, (i % 2 ? 0.07 : -0.05), 0); m.rotation.z = i % 2 ? 0.5 : -0.4; g.add(m) }
      return g
    }
    this.seams.faceL = crack(this.torso, -0.55, 9.95, 1.35, 1.1, 0.5)
    this.seams.faceR = crack(this.torso, 0.6, 9.75, 1.35, 1.0, -0.7)
    this.seams.shoulder = crack(this.torso, ARM.shoulderX - 0.4, 9.0, 0.9, 1.2, 1.2)
    this.seams.chest = crack(this.torso, 0, 6.3, 2.3, 1.6, 0.15)
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 40), new THREE.MeshBasicMaterial({ color: PAL.ink, side: THREE.DoubleSide }))
    this.ring.rotation.x = -Math.PI / 2; this.ring.visible = false; scene.add(this.ring)
  }

  seamPos(s: Seam, out = new THREE.Vector3()) { return this.seams[s].getWorldPosition(out) }
  handPos(side: -1 | 1, out = new THREE.Vector3()) { return this.arms[side].hand.getWorldPosition(out) }
  showSeams(list: Seam[]) { for (const k of Object.keys(this.seams) as Seam[]) this.seams[k].visible = list.includes(k) }

  /** yaw/pitch that put the straight arm's hand on the ground toward a world point */
  reach(side: -1 | 1, p: THREE.Vector3) {
    const s = this.tmp.set(side * ARM.shoulderX, 0, 0).add(this.root.position)
    return { y: Math.atan2(p.x - s.x, p.z - s.z), x: -Math.acos(clamp((ARM.shoulderY - 0.6) / L, 0, 1)) }
  }

  /** car appears in the throwing hand */
  grab() { if (this.held) return; this.held = makeCar(); this.held.position.set(0, -1.2, 0); this.held.rotation.set(0.3, 0, Math.PI / 2); this.arms[1].hand.add(this.held) }
  /** releases the held car into world space (the scene flies it) */
  letGo() { const c = this.held; if (!c) return null; this.scene.attach(c); this.held = null; return c }
  slamRing() { this.ringT = 0; this.ring.visible = true; this.ring.position.set(this.root.position.x, 0.04, this.root.position.z + 4) }

  update(dt: number, b: DongBrain, cover: (i: number) => THREE.Vector3) {
    this.t += dt
    const A = this.arms, st = b.state, u = b.t, side = b.side
    const set = (a: Arm, x: number, y: number, z: number, e = 0) => { a.t.x = x; a.t.y = y; a.t.z = z; a.t.e = e }
    for (const s of [-1, 1] as const) set(A[s], -0.25 + Math.sin(this.t * 0.7 + s) * 0.05, s * 0.1, s * 0.15)
    let rate = 3, lean = Math.sin(this.t * 0.5) * 0.02
    if (st === 'windup' || st === 'flight' || st === 'down' || st === 'assault' || st === 'recover') {
      if (b.kind === 'throw') {
        const g = this.reach(1, cover(b.target))
        if (st === 'windup') { set(A[1], 2.4, -0.3, 0.2, -1.1); rate = 4; lean = 0.08 }
        else if (st === 'flight' || st === 'down' || st === 'assault') { set(A[1], g.x, g.y, 0); rate = st === 'flight' ? 7 : 12; lean = -0.1 }
      } else if (b.kind === 'sweep') {
        if (st === 'windup') { set(A[side], -0.4, side * 0.8, side * 1.9); rate = 3; lean = side * 0.03 }
        else if (st === 'recover' && u < 0.55) { const k = smooth(u / 0.45); set(A[side], -1.05, side * (1.5 - 1.35 * k), 0); rate = 22 }
      } else if (b.kind === 'slam') {
        if (st === 'windup') { set(A[-1], -2.8, 0.25, 0, -0.4); set(A[1], -2.8, -0.25, 0, -0.4); rate = 3; lean = 0.1 }
        else if (st === 'recover') { set(A[-1], -1.2, 0.2, 0); set(A[1], -1.2, -0.2, 0); rate = 20; lean = -0.15 }
      }
    }
    if (st === 'stagger') lean = 0.12 * Math.sin(u * 9) * (1 - u / 1.6) + 0.1
    if (st === 'reveal') this.revealPose(u)
    for (const s of [-1, 1] as const) {
      const a = A[s], k = 1 - Math.exp(-(st === 'reveal' && s === -1 ? 5 : rate) * dt)
      a.sh.rotation.x += (a.t.x - a.sh.rotation.x) * k; a.sh.rotation.y += (a.t.y - a.sh.rotation.y) * k
      a.sh.rotation.z += (a.t.z - a.sh.rotation.z) * k; a.el.rotation.x += (a.t.e - a.el.rotation.x) * k
    }
    this.torso.rotation.x += (lean - this.torso.rotation.x) * (1 - Math.exp(-4 * dt))
    this.torso.position.y = Math.sin(this.t * 1.1) * 0.06
    if (this.ringT >= 0) {
      this.ringT += dt; const s = 1 + this.ringT * 24; this.ring.scale.set(s, s, 1)
      if (this.ringT > 0.7) { this.ringT = -1; this.ring.visible = false }
    }
    this.updateFall(dt)
  }

  /** phase 3: left hand grabs the roof panel, tears it off, flings it aside */
  private revealPose(u: number) {
    const a = this.arms[-1]
    if (u < 1.4) { a.t.x = -1.7; a.t.y = 0.75; a.t.z = 0.2; a.t.e = -1.5 }
    else { a.t.x = -0.6; a.t.y = -0.9; a.t.z = -1.7; a.t.e = -0.2 }
    if (u > 1.1 && !this.panelGone && this.panel.parent === this.torso) a.hand.attach(this.panel)
    if (u > 2.2 && !this.panelGone) { this.panelGone = true; this.scene.attach(this.panel); this.fall.push({ o: this.panel, v: new THREE.Vector3(-9, 4, 3), w: new THREE.Vector3(2, 1, 3), rest: 0.2 }) }
  }
  get panelOff() { return this.panelGone }

  /** death: every car comes loose and falls; the family car settles upright in front, facing the player */
  collapse(familyRest: THREE.Vector3) {
    this.showSeams([])
    for (const o of this.pieces) {
      if (o === this.panel && this.panelGone) continue
      this.scene.attach(o)
      if (o === this.family) continue
      const out = this.tmp.copy(o.position).sub(this.root.position).setY(0).normalize()
      this.fall.push({ o, v: new THREE.Vector3(out.x * 4 + Math.sign(out.x || 1) * 1.5, Math.random() * 2, -Math.abs(out.z) * 3 - 1.5 - Math.random()), /* away from the player and the family car */ w: new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1), rest: 0.5 })
    }
    const f = this.family, from = f.position.clone(), q0 = f.quaternion.clone(), q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2 + 0.2, 0)), s0 = f.scale.x
    let k = 0
    this.fall.push({ o: f, v: new THREE.Vector3(), w: new THREE.Vector3(), rest: -1 })
    this.familyStep = (dt) => { k = Math.min(1, k + dt / 1.8); const e = k * k; f.position.lerpVectors(from, familyRest, e); f.position.y = from.y * (1 - e) + familyRest.y; f.quaternion.slerpQuaternions(q0, q1, smooth(k)); f.scale.setScalar(s0 + (1 - s0) * k) }
  }
  private familyStep: ((dt: number) => void) | null = null
  private updateFall(dt: number) {
    this.familyStep?.(dt)
    for (const d of this.fall) {
      if (d.rest < 0) continue
      d.v.y -= 9.8 * dt; d.o.position.addScaledVector(d.v, dt)
      d.o.rotation.x += d.w.x * dt; d.o.rotation.y += d.w.y * dt; d.o.rotation.z += d.w.z * dt
      if (d.o.position.y < d.rest) { d.o.position.y = d.rest; d.v.multiplyScalar(0.25); d.v.y = Math.abs(d.v.y) * 0.2; d.w.multiplyScalar(0.4) }
    }
  }
}
