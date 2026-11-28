// Bóng khiên: holds a road sign. Guard blocks light hits (sparks); Lực ≥ .9, cùn weapon, or a hit on the sign hand breaks it.
// The guard drops while it attacks, so a timed swing also gets through.
import * as THREE from 'three'
import { Enemy, BASE_DEF, EnemyDef } from './base'
import type { HitMeta } from '../combat/sweep'
import { PAL } from '../render/palette'
import type { FX } from '../render/fx'
import { boxOf } from '../combat/contact'

export const KHIEN_DEF: EnemyDef = { ...BASE_DEF, id: 'khien', hp: 50, blood: PAL.bloodDat, speed: 0.8, windup: 0.8, lungeT: 0.35, recover: 1.1 }
const signMat = new THREE.MeshLambertMaterial({ color: PAL.paper2, flatShading: true })
const rimMat = new THREE.MeshLambertMaterial({ color: PAL.ve, flatShading: true })
export class Khien extends Enemy {
  sign = new THREE.Group(); guard = true
  private hand = new THREE.Vector3()
  constructor(scene: THREE.Scene, from: THREE.Vector3) {
    super(scene, from, KHIEN_DEF)
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.04), signMat), rim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.05), rimMat)
    plate.rotation.z = Math.PI / 4; rim.rotation.z = Math.PI / 4
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.05), this.mat); pole.position.y = -0.55
    this.sign.add(plate, rim, pole); this.sign.position.set(0.1, -0.3, 0.2); this.foreR.add(this.sign)
    this.hard = [boxOf(plate, true, () => this.alive && this.guard)] // P16: the blade stops on the sign (sparks + scratch)
  }
  /** world position of the sign hand (the weakpoint) */
  signHand() { return this.foreR.getWorldPosition(this.hand) }
  protected filter(dmg: number, at: THREE.Vector3, dir: THREE.Vector3, fx: FX, weak: boolean, m?: HitMeta) {
    if (!this.guard || !this.guardUp) return dmg
    if ((m && (m.charge >= 0.9 || m.blunt)) || at.distanceTo(this.signHand()) < 0.3) { this.breakGuard(fx); return dmg * 0.5 }
    if (fx.sparks) fx.sparks.scrape(this.sign.children[0], at, dir.clone().negate(), dir)
    else fx.splash(at, dir.clone().negate().setY(0.3), PAL.paper, 8)
    this.vel.addScaledVector(dir, 0.5); this.flinchV += 5
    void weak; return 0
  }
  /** raised only while walking/idle; swinging at the player opens it */
  get guardUp() { return this.state === 'approach' || this.state === 'emerge' || this.state === 'stagger' }
  private breakGuard(fx: FX) {
    this.guard = false; this.setState('stagger'); this.st = -0.9 // long stun
    this.scene.attach(this.sign); fx.addDebris(this.sign, new THREE.Vector3((Math.random() - 0.5) * 2, 2.5, -1), new THREE.Vector3(5, 8, 3))
  }
  protected tick() { if (this.guard) { const up = this.guardUp ? 1 : 0; this.pose += (up - this.pose) * 0.2; this.armR.rotation.x -= this.pose * 1.1 } }
  protected onDie() { if (this.guard) this.scene.remove(this.sign) }
}
