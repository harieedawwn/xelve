import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { Rail } from './rail'
import { CameraRig } from './rig'
import { ShotTrack } from './shots'
import * as M from './moves'

const V = (x: number, z: number) => new THREE.Vector3(x, 0, z)
const ang = (a: THREE.Quaternion, b: THREE.Quaternion) => THREE.MathUtils.radToDeg(a.angleTo(b))

describe('rail', () => {
  it('arc length is monotonic and pos(0)/pos(len) hit the ends', () => {
    const r = new Rail([V(0, 0), V(0, -10), V(6, -18), V(6, -30)])
    expect(r.pos(0).distanceTo(V(0, 0))).toBeLessThan(1e-6)
    expect(r.pos(r.length).distanceTo(V(6, -30))).toBeLessThan(1e-6)
    let prev = r.pos(0)
    for (let s = 0.5; s <= r.length; s += 0.5) { const p = r.pos(s); expect(p.distanceTo(prev)).toBeLessThan(0.6); prev = p }
  })
  it('curvature sign: left bend positive, straight ~0', () => {
    const left = new Rail([V(0, 0), V(0, -8), V(-6, -14), V(-14, -16)])
    expect(left.curvature(left.length * 0.5)).toBeGreaterThan(0.01)
    expect(Math.abs(Rail.straight(50).curvature(20))).toBeLessThan(1e-9)
  })
})

describe('rig', () => {
  const run = (rig: CameraRig, sec: number, dtScale = 1, onFrame?: () => void) => { for (let i = 0; i < sec * 60; i++) { rig.update(dtScale / 60, 1 / 60); onFrame?.() } }

  it('no look snaps between shot keys (only cut:true jumps)', () => {
    const rig = new CameraRig(16 / 9); rig.targetSpeed = 3
    rig.setShots(new ShotTrack([{ s: 0, look: new THREE.Vector3(0, 1.6, -20) }, { s: 3, look: new THREE.Vector3(8, 1.6, -10) }, { s: 8, look: new THREE.Vector3(-8, 1.6, -30), cut: true }]))
    let prev = rig.cam.quaternion.clone(), worst = 0, cutJump = 0
    for (let i = 0; i < 600; i++) { rig.update(1 / 60, 1 / 60); const a = ang(prev, rig.cam.quaternion); if (rig.s > 8 && rig.s < 8.1) cutJump = Math.max(cutJump, a); else if (i > 5) worst = Math.max(worst, a); prev.copy(rig.cam.quaternion) }
    expect(worst).toBeLessThan(4) // deg per frame (a fast but eased head turn)
    expect(cutJump).toBeGreaterThan(5)
  })

  it('hitstop (dt=0) freezes body layers but shake still decays', () => {
    const rig = new CameraRig(16 / 9); run(rig, 1)
    rig.slashKick(1, 0.3, 1); run(rig, 0.05)
    const y0 = rig.yaw.x, p0 = rig.pitch.x, v0 = rig.yaw.v, t0 = (rig.addTrauma(0.9), rig.trauma)
    for (let i = 0; i < 20; i++) rig.update(0, 1 / 60)
    expect(rig.yaw.x).toBe(y0); expect(rig.pitch.x).toBe(p0); expect(rig.yaw.v).toBe(v0)
    expect(rig.trauma).toBeLessThan(t0 - 0.3)
  })

  it('only one authored move at a time; leap ends with landing + slow-mo request', () => {
    const rig = new CameraRig(16 / 9); let slow = 0, landed = 0; rig.onSlowmo = () => slow++; rig.onLand = () => landed++
    expect(rig.play(M.dodge(1))).toBe(true); expect(rig.play(M.peek(1))).toBe(false)
    run(rig, 1); expect(rig.busy).toBe(false)
    rig.play(M.leap(new THREE.Vector3(0, 1.6, -9))); run(rig, 3)
    expect(slow).toBe(1); expect(landed).toBe(1); expect(rig.busy).toBe(false)
  })

  it('FOV change stays within 14° except leap', () => {
    const rig = new CameraRig(16 / 9); rig.setShots(new ShotTrack([{ s: 0, look: new THREE.Vector3(0, 1.6, -9), fov: 78 }]))
    let max = 0; rig.play(M.leap(new THREE.Vector3(0, 1.6, -9)))
    run(rig, 2, 1, () => { max = Math.max(max, rig.cam.fov) })
    expect(max).toBeGreaterThan(84)
    run(rig, 2); expect(Math.abs(rig.cam.fov - 78)).toBeLessThan(0.5)
  })

  it('fight framing widens FOV to 84 and back', () => {
    const rig = new CameraRig(16 / 9); rig.fight = true; run(rig, 2); expect(Math.abs(rig.cam.fov - 84)).toBeLessThan(0.5)
    rig.fight = false; run(rig, 2); expect(Math.abs(rig.cam.fov - 78)).toBeLessThan(0.5)
  })

  it('reduce motion scales bob', () => {
    const bob = (rm: boolean) => { const r = new CameraRig(1); r.reduceMotion = rm; r.targetSpeed = 4; let lo = 9, hi = -9; run(r, 4, 1, () => { lo = Math.min(lo, r.cam.position.y); hi = Math.max(hi, r.cam.position.y) }); return hi - lo }
    expect(bob(true)).toBeLessThan(bob(false) * 0.5)
  })
})
