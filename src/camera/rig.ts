// Scripted first-person camera: Rail ∘ Shot (spring-blended look) ∘ authored Move ∘ body layers ∘ trauma shake. Spec: docs/spec/camera.md
import * as THREE from 'three'
import { Spring3, springFrom, noise1, clamp, lerp, smooth } from './springs'
import { Rail } from './rail'
import { ShotTrack, ShotKey, halfLifeToSpring } from './shots'
import { Move, Out, makeOut, resetOut, wake } from './moves'
import { EYE, FOV, FIGHT_FOV, FIGHT_PITCH } from './consts'

export { EYE, FOV }
const RM = 0.35 // "Giảm rung camera" scale for bob, shake, lean
const UP = new THREE.Vector3(0, 1, 0)

export class CameraRig {
  cam: THREE.PerspectiveCamera
  rail = Rail.straight(200)
  shots: ShotTrack | null = null
  s = 0; speed = 0; targetSpeed = 0
  lookWant = new THREE.Vector3(0, EYE, -10)
  look = Spring3.from(1.6, 1.0)
  pitch = springFrom(3.2, 0.55); yaw = springFrom(3.2, 0.55); roll = springFrom(2.6, 0.5)
  off = Spring3.from(3.0, 0.5)
  accelPitch = springFrom(1.8, 0.7)
  leanRoll = springFrom(2.2, 0.8)
  jy = springFrom(2.9, 0.55)            // jump / landing vertical layer (underdamped, ~350 ms)
  fovS = springFrom(3, 1)
  shotRoll = springFrom(2, 1); shotRollT = 0; shotFov = FOV
  trauma = 0
  /** fight framing (P15): FOV → FIGHT_FOV and the head pitched down FIGHT_PITCH, both sprung */
  fight = false; private fightS = springFrom(2.2, 1)
  private lookK: number; private lookC: number; private fastT = 0
  reduceMotion = false
  lowHp = 0                              // 0..1 → slow fov pulse
  eyelid = 0
  onStep: (() => void) | null = null
  onLand: ((fall: number) => void) | null = null
  onSlowmo: ((sec: number, scale: number) => void) | null = null
  onMoveEnd: ((m: Move) => void) | null = null
  bodyPos = new THREE.Vector3(); fwd = new THREE.Vector3(0, 0, -1); right = new THREE.Vector3(1, 0, 0)
  private move: Move | null = null; private mt = 0; private out: Out = makeOut(); private lastAbs = new THREE.Vector3(); private hadAbs = false
  private bobPhase = 0; private lastStepSign = 1
  private t = 0; private rt = 0; private combatT = 0
  private jumpT = -1; private jyT = 0
  private glanceT = 0; private glanceDur = 0; private glanceP = new THREE.Vector3(); private glanceW = 0
  private zero = new THREE.Vector3(); private tgt = new THREE.Vector3(); private tmp = new THREE.Vector3()

  constructor(aspect: number) {
    this.cam = new THREE.PerspectiveCamera(FOV, aspect, 0.03, 80)
    this.look.x.copy(this.lookWant); this.fovS.x = FOV
    this.lookK = this.look.k; this.lookC = this.look.c
    this.syncBody()
  }

  get body() { return this.bodyPos }
  get busy() { return this.move !== null }
  get wakeT() { return this.move?.name === 'wake' ? this.mt : -1 }
  startWake() { this.play(wake()) }

  play(m: Move) {
    if (this.move) return false // never two authored moves at once
    this.move = m; this.mt = 0; this.syncBody(); m.begin?.(this); return true
  }
  setShots(track: ShotTrack | null) { this.shots = track; track?.reset() }
  glance(target: THREE.Vector3, ms = 600) { this.glanceP.copy(target); this.glanceT = this.glanceDur = ms / 1000 }
  /** look spring half-life for a while (fight target switched to a closer threat), then back to normal */
  snapLook(ms: number, secs: number) { const { k, c } = halfLifeToSpring(ms); this.look.k = k; this.look.c = c; this.fastT = secs }
  addTrauma(a: number) { this.trauma = clamp(this.trauma + a, 0, 1) }
  noteCombat() { this.combatT = 3 }
  jump() { if (this.jumpT < 0) { this.jumpT = 0; this.jyT = -0.06 } }
  land(fall: number) {
    this.jumpT = -1; this.jyT = 0
    this.jy.x = -Math.min(0.14, fall * 0.016); this.jy.v = 0
    this.roll.kick((Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.5))
    this.onLand?.(fall)
  }

  /** swing coupling: dir is screen-space direction of the slash (x right, y up) */
  slashKick(dx: number, dy: number, power: number) {
    const m = this.reduceMotion ? RM : 1
    this.yaw.kick(-dx * 0.9 * power * m); this.pitch.kick(dy * 0.6 * power * m); this.roll.kick(-dx * 0.7 * power * m)
    this.off.v.z -= 0.6 * power * m
    this.noteCombat()
  }
  hitTaken(fromX: number) {
    this.addTrauma(0.55)
    this.yaw.kick(fromX * 2.2); this.roll.kick(fromX * 3.0); this.pitch.kick(1.2)
    this.off.v.y -= 0.4; this.off.v.z += 0.8
    this.noteCombat()
  }

  private syncBody() {
    this.rail.pos(this.s, this.bodyPos); this.rail.tangent(this.s, this.fwd)
    this.right.crossVectors(this.fwd, UP).normalize()
  }

  update(dt: number, realDt: number) {
    this.t += dt; this.rt += realDt
    const m = this.reduceMotion ? RM : 1
    const prevSpeed = this.speed
    const acc = this.targetSpeed > this.speed ? 2.2 : 3.2
    this.speed += clamp(this.targetSpeed - this.speed, -acc * dt, acc * dt)
    this.s = Math.min(this.rail.length, this.s + this.speed * dt)
    const a = dt > 0 ? (this.speed - prevSpeed) / dt : 0
    this.syncBody()
    this.combatT = Math.max(0, this.combatT - dt)

    // shot track: head leads body 0.35 s ahead; key change → spring half-life, no snap unless cut
    let cut = false
    if (this.shots) {
      const k = this.shots.advance(this.s)
      if (k) { this.applyKey(k); cut = !!k.cut }
      if (this.shotKey) ShotTrack.point(this.shotKey, this.lookWant)
      else this.rail.pos(this.s + 6 + this.speed * 0.35, this.lookWant).y = EYE
    }

    // authored move
    const o = this.out; resetOut(o)
    if (this.move) {
      this.mt += dt; this.move.update(Math.min(this.mt, this.move.dur), o, this)
      if (o.slowmo) { this.onSlowmo?.(o.slowmo[0], o.slowmo[1]); o.slowmo = null }
      if (o.abs) { this.lastAbs.copy(o.abs); this.hadAbs = true }
      if (this.mt >= this.move.dur) this.endMove(o)
    }
    if (o.cut) cut = true
    this.eyelid = o.eyelid

    // gait bob (by distance)
    const stride = lerp(0.7, 1.1, clamp((this.speed - 1.6) / 2.6, 0, 1))
    this.bobPhase += (this.speed * dt) / stride * Math.PI
    const moving = clamp(this.speed / 1.6, 0, 1)
    const bobAmp = lerp(0.012, 0.025, clamp((this.speed - 1.6) / 2.6, 0, 1)) * moving * m
    const bobY = -Math.abs(Math.sin(this.bobPhase)) * bobAmp * 2 + bobAmp
    const bobX = Math.sin(this.bobPhase * 0.5) * 0.008 * moving * m
    const sign = Math.sign(Math.cos(this.bobPhase))
    if (moving > 0.3 && sign !== this.lastStepSign && sign > 0) this.onStep?.()
    this.lastStepSign = sign
    const bobRoll = Math.sin(this.bobPhase * 0.5) * 0.007 * moving * m

    // breathing: 0.22 Hz idle, 0.45 Hz for 3 s after combat
    const br = Math.sin(this.t * 2 * Math.PI * (this.combatT > 0 ? 0.45 : 0.22))
    const breathY = br * 0.004 * (1 - moving), breathP = br * 0.004 * (1 - moving)

    // turn lean: roll ∝ curvature × speed², max 4°
    const lean = this.leanRoll.step(clamp(this.rail.curvature(this.s) * this.speed * this.speed * 0.02, -0.07, 0.07) * m, dt)

    // jump layer
    if (this.jumpT >= 0) {
      this.jumpT += dt
      if (this.jumpT > 0.12 && this.jyT < 0) { this.jyT = 0.02; this.pitch.kick(2.0) } // launch pitch up ~3°
    }
    const jy = this.jy.step(this.jyT, dt)
    const drift = this.jumpT > 0.12 ? noise1(this.t * 3, 5) * 0.012 : 0

    const ap = this.accelPitch.step(-a * 0.012 * m, dt)
    const p = this.pitch.step(0, dt), y = this.yaw.step(0, dt), r = this.roll.step(0, dt)
    const off = this.off.step(this.zero, dt)
    const sr0 = this.shotRoll.step(this.shotRollT, dt)

    // trauma shake: decays in REAL time and noise runs on real time → hitstop freezes body but shake still settles
    this.trauma = Math.max(0, this.trauma - 1.4 * realDt)
    const tr = this.trauma * this.trauma * m, st = this.rt * 25
    const sp = tr * 0.035 * noise1(st, 1), sy = tr * 0.035 * noise1(st, 7), sr = tr * 0.05 * noise1(st, 13)

    // look target: shot/slice → glance → move
    this.tgt.copy(this.lookWant)
    if (this.glanceT > 0) {
      this.glanceT = Math.max(0, this.glanceT - dt)
      const u = 1 - this.glanceT / this.glanceDur
      this.glanceW = smooth(u / 0.25) * (1 - smooth((u - 0.7) / 0.3))
      this.tgt.lerp(this.glanceP, this.glanceW)
    }
    if (o.look && o.lookW > 0) this.tgt.lerp(o.look, o.lookW)
    if (this.fastT > 0 && (this.fastT -= dt) <= 0) { this.look.k = this.lookK; this.look.c = this.lookC }
    if (cut) { this.look.x.copy(this.tgt); this.look.v.set(0, 0, 0) } else this.look.step(this.tgt, dt)

    // fov: ±14° limit from base except leap; low-HP pulse −1°
    const fb = this.fightS.step(this.fight ? 1 : 0, dt)
    const base = lerp(this.shotFov, FIGHT_FOV, fb)
    let fovT = o.fov ?? base
    if (!o.wide) fovT = clamp(fovT, base - 14, base + 14)
    fovT -= this.lowHp * (0.5 + 0.5 * Math.sin(this.rt * 2 * Math.PI * 1.1))
    const fov = this.fovS.step(fovT, dt)
    if (Math.abs(fov - this.cam.fov) > 0.01) { this.cam.fov = fov; this.cam.updateProjectionMatrix() }

    // compose
    const c = this.cam, side = bobX + off.x + o.local.x + drift, up = EYE + bobY + breathY + off.y + jy + o.local.y, fw = -off.z + o.local.z
    if (o.abs) c.position.copy(o.abs).addScaledVector(UP, up)
    else c.position.copy(this.bodyPos).addScaledVector(this.right, side).addScaledVector(UP, up).addScaledVector(this.fwd, fw)
    c.position.x += tr * 0.01 * noise1(st, 21); c.position.y += tr * 0.01 * noise1(st, 27)
    c.lookAt(this.look.x)
    c.rotateX(p + ap + breathP + sp + o.pitch + fb * FIGHT_PITCH)
    c.rotateY(y + sy)
    c.rotateZ(r + bobRoll + sr + o.roll + lean + sr0)
  }

  private shotKey: ShotKey | null = null
  private applyKey(k: ShotKey) {
    this.shotKey = k
    const { k: kk, c } = halfLifeToSpring(k.halfLifeMs ?? 180); this.look.k = this.lookK = kk; this.look.c = this.lookC = c
    if (k.fov !== undefined) this.shotFov = k.fov
    if (k.roll !== undefined) this.shotRollT = k.roll
  }

  private endMove(o: Out) {
    const m = this.move!; this.move = null
    // absorb leftover world offset into the off spring so the body eases back onto the rail (no snap)
    if (this.hadAbs && !m.endCut) {
      this.syncBody(); this.tmp.copy(this.lastAbs).sub(this.bodyPos)
      this.off.x.set(this.tmp.dot(this.right), this.tmp.y, -this.tmp.dot(this.fwd))
    }
    this.hadAbs = false; o.abs = null
    this.onMoveEnd?.(m)
  }
}

