// Scripted first-person camera: rail + authored look target + spring body layers + trauma shake.
import * as THREE from 'three'
import { Spring, Spring3, springFrom, noise1, clamp, lerp, smooth } from './springs'

export const EYE = 1.62

export class CameraRig {
  cam: THREE.PerspectiveCamera
  s = 0                    // distance along rail (corridor runs toward -z)
  speed = 0
  targetSpeed = 0
  lookWant = new THREE.Vector3(0, EYE, -10)
  look = Spring3.from(1.6, 1.0)
  pitch = springFrom(3.2, 0.55); yaw = springFrom(3.2, 0.55); roll = springFrom(2.6, 0.5)
  off = Spring3.from(3.0, 0.5)
  accelPitch = springFrom(1.8, 0.7)
  trauma = 0
  reduceMotion = false
  private bobPhase = 0
  private lastStepSign = 1
  private t = 0
  onStep: (() => void) | null = null
  // wake intro
  wakeT = -1
  eyelid = 0               // 0 open … 1 closed (read by HUD)
  private zero = new THREE.Vector3()
  private tmp = new THREE.Vector3()

  constructor(aspect: number) {
    this.cam = new THREE.PerspectiveCamera(78, aspect, 0.03, 80)
    this.look.x.copy(this.lookWant)
  }

  get body() { return this.tmp.set(0, 0, -this.s) }

  startWake() { this.wakeT = 0 }

  addTrauma(a: number) { this.trauma = clamp(this.trauma + a, 0, 1) }

  /** swing coupling: dir is screen-space direction of the slash (x right, y up) */
  slashKick(dx: number, dy: number, power: number) {
    const m = this.reduceMotion ? 0.35 : 1
    this.yaw.kick(-dx * 0.9 * power * m)
    this.pitch.kick(dy * 0.6 * power * m)
    this.roll.kick(-dx * 0.7 * power * m)
    this.off.v.add(new THREE.Vector3(0, 0, -0.6 * power * m))
  }
  hitTaken(fromX: number) {
    this.addTrauma(0.55)
    this.yaw.kick(fromX * 2.2); this.roll.kick(fromX * 3.0); this.pitch.kick(1.2)
    this.off.v.add(new THREE.Vector3(0, -0.4, 0.8))
  }

  update(dt: number, realDt: number) {
    this.t += dt
    const m = this.reduceMotion ? 0.35 : 1
    // locomotion (acceleration-limited)
    const prevSpeed = this.speed
    const acc = this.targetSpeed > this.speed ? 2.2 : 3.2
    this.speed += clamp(this.targetSpeed - this.speed, -acc * dt, acc * dt)
    this.s += this.speed * dt
    const a = dt > 0 ? (this.speed - prevSpeed) / dt : 0

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

    // breathing
    const br = Math.sin(this.t * 2 * Math.PI * 0.22)
    const breathY = br * 0.004 * (1 - moving)
    const breathP = br * 0.004 * (1 - moving)

    // springs
    const ap = this.accelPitch.step(-a * 0.012 * m, dt)
    const p = this.pitch.step(0, dt), y = this.yaw.step(0, dt), r = this.roll.step(0, dt)
    const o = this.off.step(this.zero, dt)
    this.trauma = Math.max(0, this.trauma - 1.4 * realDt)
    const tr = this.trauma * this.trauma * m
    const st = this.t * 25
    const sp = tr * 0.035 * noise1(st, 1), sy = tr * 0.035 * noise1(st, 7), sr = tr * 0.05 * noise1(st, 13)

    // wake intro overrides height/roll/look
    let eye = EYE, wakeRoll = 0
    const lookTarget = this.lookWant
    if (this.wakeT >= 0) {
      this.wakeT += realDt
      const w = this.wakeT
      // blinks: closed → open, blink twice
      this.eyelid = w < 0.6 ? 1 : w < 1.0 ? 1 - smooth((w - 0.6) / 0.4) : w < 1.25 ? smooth((w - 1.0) / 0.12) - smooth((w - 1.13) / 0.12) : 0
      const rise = smooth((w - 2.2) / 1.4)
      eye = lerp(0.32, EYE, rise)
      wakeRoll = lerp(1.15, 0, smooth((w - 1.6) / 1.6))
      // look at the hand first, then forward
      const handLook = smooth((w - 0.9) / 0.6) * (1 - smooth((w - 3.2) / 0.8))
      this.tmp.set(0.35, eye - 0.9, -this.s - 0.6)
      lookTarget.set(0, EYE, -this.s - 10).lerp(this.tmp, handLook)
      if (w > 4.4) { this.wakeT = -1; this.eyelid = 0 }
    }

    this.look.step(lookTarget, dt)
    const c = this.cam
    c.position.set(bobX + o.x, eye + bobY + breathY + o.y, -this.s + o.z)
    c.lookAt(this.look.x)
    c.rotateX(p + ap + breathP + sp)
    c.rotateY(y + sy)
    c.rotateZ(r + bobRoll + sr + wakeRoll)
  }
}
