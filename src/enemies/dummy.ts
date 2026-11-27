// Duel dummy (Phòng tập ?duel): a Bóng body with a baton that runs every duel move (combat/duel.ts) in a loop.
// It holds its ground in front of the camera; hits only land while a counter window is open (Né / Phản đòn), otherwise the baton blocks.
import * as THREE from 'three'
import { Enemy, BASE_DEF, EnemyDef } from './base'
import { PAL } from '../render/palette'
import { lerp, smooth } from '../camera/springs'
import { DuelScript, DUMMY_ORDER, type DuelEvent, type Move, type Pose } from '../combat/duel'

export const DUMMY_DEF: EnemyDef = { ...BASE_DEF, id: 'dummy', hp: 9999, blood: PAL.bloodDat, lean: 0.12 }
const batonMat = new THREE.MeshLambertMaterial({ color: PAL.paper2, flatShading: true })

/** arm angles [rotation.x, rotation.z] at full wind-up and at the impact (follow-through) */
const POSE: Record<Pose | 'rest', { up: [number, number]; hit: [number, number] }> = {
  rest: { up: [-0.35, -0.15], hit: [-0.35, -0.15] },
  overhead: { up: [-2.9, -0.15], hit: [-0.7, -0.1] },
  left: { up: [-1.55, -1.5], hit: [-1.45, 0.8] },   // baton out on the screen-left side → Né right
  right: { up: [-1.55, 1.35], hit: [-1.45, -1.0] },
  thrust: { up: [-1.2, -0.05], hit: [-1.57, 0] },    // baton points at the camera → Đỡ only
}

export class DuelDummy extends Enemy {
  script: DuelScript
  baton = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.62, 0.05).translate(0, -0.31, 0), batonMat)
  /** set by the scene: true while the player's counter window is open */
  open = false
  onEvent: (e: DuelEvent, m: Move) => void = () => {}
  private ax = POSE.rest.up[0]; private az = POSE.rest.up[1]; private hitPose: [number, number] = POSE.rest.hit; private thrustPush = 0

  constructor(scene: THREE.Scene, from: THREE.Vector3, order = DUMMY_ORDER) {
    super(scene, from, DUMMY_DEF)
    this.baton.position.y = -0.3; this.foreR.add(this.baton)
    this.script = new DuelScript(order, (e, m) => {
      if (e === 'telegraph' || e === 'switch') this.onSound('duel.telegraph')
      if (e === 'impact') { this.hitPose = POSE[m.pose].hit; this.onSound('duel.whoosh') }
      this.onEvent(e, m)
    })
    this.setState('approach')
  }
  protected staggers() { return false }
  /** damage multiplier while open (DEFENSE.counterMult); last landed damage for the Phòng tập readout */
  mult = 1; lastDmg = 0
  protected filter(dmg: number) { if (!this.open && this.script.state !== 'stagger') return 0; this.lastDmg = dmg * this.mult; return this.lastDmg }
  /** Choáng / counter: the dummy reels back and stops attacking */
  reel(secs: number) { this.script.stagger(secs); this.status.apply('choang', secs); this.flash(false) }

  update(dt: number, player: THREE.Vector3) {
    if (!this.alive) return
    this.status.tick(dt); this.hp = this.maxHp // never dies: a dummy
    if (this.status.frozen) return
    this.st += dt; this.hitCooldown -= dt
    const s = this.script; s.update(dt)
    const p = this.root.position
    p.x = lerp(p.x, player.x, 1 - Math.exp(-3 * dt)); p.z = lerp(p.z, player.z - 1.1, 1 - Math.exp(-4 * dt)); p.y = 0
    p.addScaledVector(this.vel, dt); this.vel.multiplyScalar(Math.exp(-6 * dt))
    this.root.rotation.y = Math.atan2(player.x - p.x, player.z - p.z)
    let tx = POSE.rest.up[0], tz = POSE.rest.up[1], push = 0, crouch = 0, rate = 14
    if (s.state === 'windup') {
      const k = smooth(s.windupK * 1.25), up = POSE[s.move.pose].up
      tx = lerp(POSE.rest.up[0], up[0], k); tz = lerp(POSE.rest.up[1], up[1], k)
      push = s.move.pose === 'thrust' ? -0.12 * k : -0.05 * k; crouch = k * 0.6
      this.flash(s.toImpact < 0.15)
    } else if (s.state === 'recover') {
      const k = smooth(s.t / (s.move.recover * 0.8))
      tx = lerp(this.hitPose[0], POSE.rest.up[0], k); tz = lerp(this.hitPose[1], POSE.rest.up[1], k); rate = s.t < 0.08 ? 60 : 12
      push = (s.move.pose === 'thrust' ? 0.42 : 0.2) * (1 - k); this.flash(false)
    } else if (s.state === 'stagger') { push = -0.2; this.flinchV += Math.sin(this.st * 9) * 0.6 }
    this.thrustPush = lerp(this.thrustPush, push, 1 - Math.exp(-(s.state === 'recover' && s.t < 0.1 ? 40 : 10) * dt))
    this.animate(dt, 0, 0, this.thrustPush, crouch, false)
    this.ax = lerp(this.ax, tx, 1 - Math.exp(-rate * dt)); this.az = lerp(this.az, tz, 1 - Math.exp(-rate * dt))
    this.armR.rotation.x = this.ax; this.armR.rotation.z = this.az; this.foreR.rotation.x = -0.1
  }
}
