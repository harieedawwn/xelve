// Boss 1 — Người gác (combat.md#6): human-size duellist with a baton. 3 phases (100/66/33 %), flurry → walks his round (back turned = opening).
// Reuses DuelDummy's body and DuelScript's move timing. All numbers live in DATA.
import * as THREE from 'three'
import { DuelDummy } from '../enemies/dummy'
import { BASE_DEF, type EnemyDef } from '../enemies/base'
import { PAL } from '../render/palette'

export const DATA = {
  hp: 520,
  /** hp fraction at which phase 2 / 3 start */
  phaseAt: [0.66, 0.33],
  phases: [
    { order: ['overhead', 'sweepL', 'sweepR', 'thrustN'], flurry: 3, walk: 3.2, tempo: 1, idle: 0.8 },
    { order: ['sweepR', 'overhead', 'thrustN', 'sweepL', 'sweepL'], flurry: 4, walk: 2.6, tempo: 0.88, idle: 0.6 },
    { order: ['feint', 'sweepL', 'overhead', 'feint', 'thrustN', 'sweepR', 'slam'], flurry: 4, walk: 2.2, tempo: 0.8, idle: 0.45 },
  ],
  phaseStagger: 1.4,   // s he stops attacking while the phase changes
  openMult: 1.5,       // damage taken from behind while he walks his round
  walkRadius: 2.1, walkSpeed: 0.55, // rad/s around the player
  parryStun: 1.5,      // Phản đòn = Choáng this long (combat.md#6)
}
export const NGDEF: EnemyDef = { ...BASE_DEF, id: 'nguoigac', hp: DATA.hp, blood: PAL.bloodDat, lean: 0.1, scale: 1.05 }

export class NguoiGac extends DuelDummy {
  stage = 0 // 0..2 (Enemy.phase is the gait clock)
  walking = false; defeated = false
  onPhase: (n: number) => void = () => {}
  onDefeat: () => void = () => {}
  private flurry = 0; private pendingWalk = false; private walkT = 0; private ang = 0
  protected immortal = false

  constructor(scene: THREE.Scene, from: THREE.Vector3) {
    super(scene, from, DATA.phases[0].order, NGDEF)
    this.applyPhase()
    const prev = this.script.on
    this.script.on = (e, m) => {
      prev(e, m)
      if (e === 'impact' && ++this.flurry >= DATA.phases[this.stage].flurry) this.pendingWalk = true
    }
  }
  private applyPhase() {
    const p = DATA.phases[this.stage]
    this.script.order = p.order; this.script.i = 0; this.script.tempo = p.tempo; this.script.idle = p.idle
  }
  static phaseFor(hp: number, max: number) { return DATA.phaseAt.filter(f => hp <= max * f).length }

  /** while he walks his round (or is staggered) every hit lands; from behind it hurts more */
  protected filter(dmg: number) {
    const open = this.open || this.walking || this.script.state === 'stagger'
    if (!open) return 0
    this.lastDmg = dmg * (this.walking ? DATA.openMult : this.mult); return this.lastDmg
  }
  /** Phản đòn: Choáng 1.5 s */
  parried() { this.reel(DATA.parryStun) }
  protected onDie() { this.defeated = true; this.onDefeat() }

  update(dt: number, player: THREE.Vector3) {
    if (!this.alive) return
    const want = NguoiGac.phaseFor(this.hp, this.maxHp)
    if (want > this.stage) {
      this.stage = want; this.applyPhase(); this.walking = false; this.pendingWalk = false; this.flurry = 0
      this.script.stagger(DATA.phaseStagger); this.onPhase(want + 1)
    }
    const p = this.root.position
    if (this.walking) {
      this.walkT -= dt; this.st += dt; this.status.tick(dt)
      this.ang += DATA.walkSpeed * dt
      const tx = player.x + Math.sin(this.ang) * DATA.walkRadius, tz = player.z - Math.cos(this.ang) * DATA.walkRadius
      const k = 1 - Math.exp(-3 * dt)
      p.x += (tx - p.x) * k; p.z += (tz - p.z) * k; p.y = 0
      // back turned: he walks his round facing away from the player
      this.root.rotation.y = Math.atan2(p.x - player.x, p.z - player.z)
      this.flash(false)
      this.animate(dt, 0.9, 0, 0, 0, false)
      this.armR.rotation.x = -0.35; this.armR.rotation.z = -0.15
      if (this.walkT <= 0) { this.walking = false; this.script.t = 0 }
      return
    }
    // keep a slow ring drift while dueling (the camera circles him)
    this.ang *= Math.exp(-1.5 * dt)
    super.update(dt, new THREE.Vector3(player.x + Math.sin(this.ang) * 1.1, 0, player.z + 1.1 - Math.cos(this.ang) * 1.1))
    if (this.pendingWalk && this.script.state === 'idle') {
      this.pendingWalk = false; this.flurry = 0; this.walking = true; this.walkT = DATA.phases[this.stage].walk
    }
  }
}
