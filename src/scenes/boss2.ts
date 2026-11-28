// L8 boss arena — Đống (combat.md#7). Dev route: ?dong (&weapon=nhe|vua|nang, &tier=thap|tb|cao, &loi=1).
// Cover arc + coverDash (‹ ›), throws / sweep / slam, arm-down opening → ↑ armRun to the seams, sóng chém from cover,
// phase 3 roof rip, collapse → tally wall, message 6, tower, chapter card. Level flow is wired in P12.
import * as THREE from 'three'
import { Renderer } from '../render/pipeline'
import { FX } from '../render/fx'
import { PAL } from '../render/palette'
import { buildCarPark, coverFeet, ARENA } from '../levels/carpark'
import { CameraRig, EYE } from '../camera/rig'
import { Rail } from '../camera/rail'
import { coverDash, armRun, cinematicCut } from '../camera/moves'
import { Weapon } from '../combat/weapon'
import { PROFILES } from '../combat/profiles'
import { PlayerHP } from '../combat/player'
import { sweep, type Target } from '../combat/sweep'
import { boxOf, showColliders, BladeContact } from '../combat/contact'
import { Bus } from '../combat/bus'
import { Defense, canBlockWith } from '../combat/defense'
import { equippedDesign } from '../weapon/store'
import { Audio } from '../audio/engine'
import { DongBrain, DONG, nextCover, nearestCover, throwBreaks, impactDamage, inReach, type Seam } from '../bosses/dong'
import { DongBody } from '../bosses/dongBody'
import { CombatPad } from '../ui/combatPad'
import { startLoop } from '../core/loop'
import { bindFinger } from '../core/input'
import { Time } from '../core/time'
import { QUALITY, type Tier } from '../core/quality'
import { settings } from '../core/settings'
import { save, persist } from '../core/save'
import { grant } from '../story/drops'
import { completeLevel } from '../story/progress'
import { level } from '../levels/ch1'
import { lerp, clamp } from '../camera/springs'
import { bossHud, endingUi } from './boss2ui'

export function startBoss2(canvas: HTMLCanvasElement, renderer: Renderer, audio: Audio) {
  const q = new URLSearchParams(location.search)
  const tier = (['thap', 'tb', 'cao'].includes(q.get('tier') ?? '') ? q.get('tier') : settings().tier ?? 'tb') as Tier
  renderer.resize(tier)
  const scene = new THREE.Scene(), rig = new CameraRig(innerWidth / innerHeight); scene.add(rig.cam)
  rig.reduceMotion = !!settings().reduceShake
  const park = buildCarPark(scene)
  const fx = new FX(scene, ARENA.halfW, ARENA.height), weapon = new Weapon(rig.cam), bus = new Bus(), time = new Time(), def = new Defense(), php = new PlayerHP()
  const brain = new DongBrain(), body = new DongBody(scene, ARENA.boss)
  const alive = () => park.covers.map(c => c.alive), cracked = park.covers.map(() => false)
  const hud = bossHud(), end = endingUi()
  let cover = 2, dashing = false, queued: -1 | 1 | 0 = 0, assault = false, assaults = 0, waveCd = 0, vig = 0, dying = -1, won = -1, hp = php.hp
  const stats = { throws: 0, sweeps: 0, slams: 0, hits: 0, taken: 0, broken: 0, assaults: 0, waves: 0, phases: [1] as number[], won: false, gained: [] as string[] }
  const railAt = (i: number) => { const f = coverFeet(i), d = ARENA.boss.clone().sub(f).setY(0).normalize(); return new Rail([f.clone(), f.clone().addScaledVector(d, 0.5)]) }
  rig.rail = railAt(cover); rig.s = 0
  const lookAt = new THREE.Vector3(0, 6, ARENA.boss.z), bossEye = new THREE.Vector3(0, 6.5, ARENA.boss.z)
  body.showSeams(brain.seams)

  // seams as sweep targets (reachable only from the arm run's apex)
  const seamTarget = (s: Seam): Target => ({
    get alive() { return brain.alive && brain.seams.includes(s) && (s !== 'chest' || body.panelOff) },
    hitCooldown: 0, blood: PAL.bloodDo,
    hitParts() { const c = body.seamPos(s); return { a: c.clone().add(new THREE.Vector3(-0.55, 0, 0)), b: c.clone().add(new THREE.Vector3(0.55, 0, 0)), r: 0.55, head: c, hr: 0.3 } },
    takeHit(dmg, at, dir, f, weak) { brain.damage(dmg * DONG.seamMult); f.blood(at, dir, PAL.bloodDo, weak ? 44 : 26); this.hitCooldown = 0.12; stats.hits++; return !brain.alive },
  })
  // P16 contact: every car of the body is a hard box (blade stops at the surface: sparks + scratch); the roof panel until it is off
  const cols = body.pieces.filter(o => o !== body.tally).map(o => boxOf(o, o !== body.panel, o === body.panel ? () => !body.panelOff && won < 0 : () => won < 0))
  if (q.has('debug')) showColliders(cols)
  const contact = new BladeContact(weapon, fx.withSparks(rig.cam), () => { audio.play('hit.metal'); time.freeze(0.04); rig.slashKick(weapon.slashDir.x, weapon.slashDir.y, 0.5) })
  const seams = (['faceL', 'faceR', 'shoulder', 'chest'] as Seam[]).map(seamTarget)

  const pad = new CombatPad({
    block: (d) => { if (d) { def.press(time.now); if (def.guarding) audio.play('guard.up') } else def.release(); weapon.guarding = def.guarding },
    dodge: (side) => dash(side),
    leap: () => leap(),
  })
  document.getElementById('ui')!.append(pad.root, pad.luc)
  const w = q.get('weapon')
  if (w && PROFILES[w]) weapon.setProfile(PROFILES[w]); else { const d = equippedDesign(); if (d) weapon.setDesign(d); else weapon.setProfile(PROFILES.vua) }
  def.canBlock = canBlockWith(weapon.profile.cls, false)
  const haveLoi = q.has('loi') || save().drops.includes('nguoigac')
  const canLeap = () => brain.open && inReach(brain.armAt, cover) && !rig.busy && won < 0
  const context = () => pad.set({ block: def.canBlock && won < 0, dodge: won < 0, leap: canLeap(), luc: weapon.profile.charged && won < 0 })
  bindFinger(canvas, weapon.finger, (d) => { weapon.touching = d })
  addEventListener('pointerdown', () => audio.unlock(), { once: true })
  audio.setSpace('open')

  function dash(side: -1 | 1) {
    if (won >= 0 || dying >= 0) return
    if (rig.busy) { if (!assault) queued = side; return }
    const to = nextCover(alive(), cover, side); if (to === cover) return
    const from = coverFeet(cover); cover = to; rig.rail = railAt(to)
    if (rig.play(coverDash(from, coverFeet(to), bossEye))) { dashing = true; audio.play('dodge') }
  }
  function leap() {
    if (!canLeap()) return
    const hand = body.handPos(1), sh = body.root.localToWorld(new THREE.Vector3(2.7, 9.2, -0.3))
    const list = brain.seams.filter(s => s !== 'chest' || body.panelOff), s = list[assaults % list.length]
    const seam = body.seamPos(s), back = nearestCover(alive(), brain.armAt)
    const toP = coverFeet(back).sub(seam).setY(0).normalize()
    const apex = seam.clone().addScaledVector(toP, 1.05); apex.y = seam.y + 0.05 - EYE
    const onArm = hand.clone().lerp(sh, 0.12); onArm.y += 0.9
    const up = hand.clone().lerp(sh, 0.6); up.y += 1.0
    cover = back; rig.rail = railAt(back)
    if (rig.play(armRun({ hand: onArm, up, apex, seam, back: coverFeet(back) }))) { assault = true; assaults++; stats.assaults++; brain.hold(); audio.play('dong.wind') }
  }
  rig.onMoveEnd = (m) => {
    if (m.name === 'coverDash') dashing = false
    if ((m.name === 'coverDash' || m.name === 'cinematicCut') && queued) { const s = queued; queued = 0; dash(s) }
    if (m.name === 'armRun') { assault = false; brain.release() }
  }
  rig.onSlowmo = (sec, scale) => { time.slowmo(sec, scale); audio.slowIn() }
  rig.onLand = () => audio.play('step.concrete', 1.4)

  // thrown cars in flight: parabola from the hand to the target cover, hard grey shadow disc grows on the ground
  const shadowGeo = new THREE.CircleGeometry(1.8, 16), shadowMat = new THREE.MeshBasicMaterial({ color: PAL.stone })
  let flight: { car: THREE.Group; from: THREE.Vector3; to: THREE.Vector3; t: number; shadow: THREE.Mesh } | null = null

  const hurt = (n: number) => {
    if (n <= 0 || dying >= 0) return
    stats.taken += n; const dead = php.hit(n); hp = php.hp; hud.setPips(hp); audio.playerHurt(); vig = 1; rig.hitTaken(Math.random() < 0.5 ? -1 : 1)
    if (dead) { dying = 0; end.whiteout(1.2) }
  }
  brain.on = (ev) => {
    if (ev.e === 'telegraph') {
      audio.play('dong.groan')
      if (ev.kind === 'throw') { body.grab(); stats.throws++ }
      if (ev.kind === 'slam') stats.slams++
      if (ev.kind === 'sweep') { // jump-cut shows the arm winding up on that side (combat.md#7), then back to cover
        stats.sweeps++
        const pos = ARENA.boss.clone().add(new THREE.Vector3(-ev.side * 15, 3.5, 9)), look = body.root.localToWorld(new THREE.Vector3(ev.side * 4, 9, 0))
        if (!rig.busy) rig.play(cinematicCut([{ dur: 0.9, pos, look, fov: 70 }]))
      }
    }
    if (ev.e === 'release') {
      const car = body.letGo(); if (!car) return
      const to = park.covers[ev.target].group.position.clone(); to.y = 0.7
      const shadow = new THREE.Mesh(shadowGeo, shadowMat); shadow.rotation.x = -Math.PI / 2; shadow.position.set(to.x, 0.03, to.z); shadow.scale.setScalar(0.1); scene.add(shadow)
      flight = { car, from: car.position.clone(), to, t: 0, shadow }; audio.play('dong.scrape')
    }
    if (ev.e === 'slow') { time.slowmo(0.7, 0.3); audio.slowIn() }
    if (ev.e === 'impact') {
      const dmg = impactDamage(ev, cover, dashing, def.guarding)
      if (ev.kind === 'throw') {
        audio.play('dong.crash'); rig.addTrauma(0.6)
        if (throwBreaks(alive(), ev.target, dmg > 0, cracked[ev.target])) { park.destroy(ev.target, fx); stats.broken++ }
        else if (park.covers[ev.target].alive && !cracked[ev.target]) { cracked[ev.target] = true; const g = park.covers[ev.target].group; g.rotation.z = 0.06; g.rotation.x = -0.05 }
        if (flight) { flight.car.position.copy(flight.to).setY(0.3); flight.car.rotation.set(0.25, Math.random() * 3, 2.6); scene.remove(flight.shadow); flight = null }
      } else if (ev.kind === 'sweep') { audio.play('dong.sweep'); rig.addTrauma(0.5) }
      else { body.slamRing(); audio.play('dong.slam'); rig.addTrauma(0.85); if (def.guarding) { audio.play('block'); weapon.spend() } }
      hurt(dmg)
    }
    if (ev.e === 'phase') { stats.phases.push(ev.n); time.freeze(0.15); rig.addTrauma(0.5); audio.play('dong.groan'); body.showSeams(brain.seams) }
    if (ev.e === 'reveal') { stats.phases.push(3); audio.play('dong.groan'); setTimeout(() => audio.play('dong.rip'), 1100) }
    if (ev.e === 'dead') win()
  }
  bus.on('hit', (e) => { audio.hit(e.dmg / 10, e.head); time.freeze(e.killed ? 0.3 : 0.07); rig.addTrauma(e.killed ? 0.5 : 0.2); rig.slashKick(weapon.slashDir.x, weapon.slashDir.y, 0.8) })

  // sóng chém: a Lực-1 slash from cover with Lõi Người gác flies to a seam and chips it
  const waveGeo = new THREE.RingGeometry(0.32, 0.46, 12, 1, 0, Math.PI), waveMat = new THREE.MeshBasicMaterial({ color: PAL.ve, side: THREE.DoubleSide })
  const waves: { m: THREE.Mesh; from: THREE.Vector3; s: Seam; t: number }[] = []
  const tryWave = () => {
    if (!haveLoi || rig.busy || waveCd > 0 || !weapon.profile.charged || weapon.charge < 0.99 || !weapon.touching || weapon.tipSpeed < 3.2 || !brain.alive) return
    const s = brain.seams.find(x => x !== 'chest' || body.panelOff); if (!s) return
    const m = new THREE.Mesh(waveGeo, waveMat); scene.add(m)
    waves.push({ m, from: weapon.tip.clone(), s, t: 0 }); weapon.spend(); waveCd = DONG.wave.cooldown; stats.waves++; audio.play('dong.wave')
  }

  function win() {
    won = 0; stats.won = true; time.slowmo(1.2, 0.3); audio.play('dong.fall'); rig.addTrauma(0.9)
    body.collapse(ARENA.boss.clone().add(new THREE.Vector3(0, 0.02, 5)))
    stats.gained = grant(save(), 'dong'); completeLevel(save(), level(8)!); persist()
    hud.hide(); def.release(); weapon.guarding = false; weapon.touching = false; context()
  }
  const wall = () => body.tally.position
  let beat = 0
  const ending = (rt: number) => { // real-time beats after the collapse
    if (beat === 0 && rt > 3.2 && !rig.busy) { beat = 1; const f = wall().clone(), to = f.clone().add(new THREE.Vector3(0.6, 0, 3.1)); to.y = 0; rig.rail = new Rail([to.clone(), to.clone().add(new THREE.Vector3(0, 0, -0.5))]); rig.play(coverDash(rig.bodyPos.clone(), to, f)) }
    if (beat === 1 && rt > 6 && !rig.busy) { beat = 2 }
    if (beat === 2 && rt > 9.4) { beat = 3; end.voice(() => audio.play('radio.crackle')) }
    if (beat === 3 && rt > 15.5) { beat = 4 }
    if (beat === 4 && rt > 19) { beat = 5; end.whiteout(1.4); setTimeout(() => end.card(), 1500) }
  }

  addEventListener('resize', () => { rig.cam.aspect = innerWidth / innerHeight; rig.cam.updateProjectionMatrix(); renderer.resize(tier) })
  startLoop({
    step: (h) => {
      const dt = time.tick(h, () => audio.slowOut()), now = time.now
      if (dying >= 0) { dying += h; if (dying > 1.25) location.reload(); return }
      waveCd = Math.max(0, waveCd - dt)
      brain.update(dt, cover)
      body.update(dt, brain, (i) => park.covers[i].group.position)
      if (flight) {
        flight.t += dt; const u = clamp(flight.t / DONG.throw.flight, 0, 1)
        flight.car.position.lerpVectors(flight.from, flight.to, u); flight.car.position.y += 9 * 4 * u * (1 - u) * (1 - u * 0.3)
        flight.car.rotation.x += dt * 2.2; flight.car.rotation.z += dt * 1.3; flight.shadow.scale.setScalar(0.15 + 0.85 * u * u)
      }
      for (let i = waves.length - 1; i >= 0; i--) {
        const v = waves[i]; v.t += dt; const u = clamp(v.t / DONG.wave.flight, 0, 1), to = body.seamPos(v.s)
        v.m.position.lerpVectors(v.from, to, u); v.m.lookAt(to); v.m.scale.setScalar(1 + u * 1.6)
        if (u >= 1) { scene.remove(v.m); waves.splice(i, 1); brain.damage(DONG.wave.dmg); fx.blood(to, new THREE.Vector3(0, 0, 1), PAL.bloodDo, 18); audio.hit(0.6, false) }
      }
      // look: the giant (whole figure), the arm while it is down, the car in the air; the ending looks are authored beats
      if (won < 0) {
        lookAt.set(0, 6.2, ARENA.boss.z)
        if (flight) lookAt.lerp(flight.car.position, 0.45)
        else if (brain.open) lookAt.lerp(body.handPos(1), 0.35)
      } else if (beat < 1) lookAt.lerp(new THREE.Vector3(0, 2.5, ARENA.boss.z + 2), 1 - Math.exp(-2 * dt))
      else if (beat < 4) lookAt.copy(wall()).setY(0.9)
      else lookAt.lerp(park.tower, 1 - Math.exp(-0.9 * h))
      rig.lookWant.copy(lookAt)
      rig.update(dt, h)
      weapon.update(time.hitstop > 0 ? 0 : h, now)
      if (assault) sweep(weapon, seams, fx, bus); else if (won < 0) tryWave()
      if (won < 0) contact.step(cols)
      for (const s of seams) s.hitCooldown = Math.max(0, s.hitCooldown - dt)
      audio.swing(weapon.touching ? weapon.tipSpeed : 0, time.scale)
      if (weapon.tipSpeed > 3 && weapon.touching && dt > 0) fx.smearPush(weapon.inner, weapon.tip, now)
      fx.update(dt, now)
      if (php.update(dt, brain.alive)) { hp = php.hp; hud.setPips(hp) }
      if (won >= 0) { won += h; ending(won) }
      context()
    },
    render: (_a, realDt) => {
      vig = Math.max(0, vig - 1.5 * realDt); renderer.vig = vig
      renderer.desat = lerp(renderer.desat, time.slow > 0 ? 0.6 : 0, 1 - Math.exp(-10 * realDt))
      park.pulse(time.real)
      pad.setLuc(weapon.profile.charged ? weapon.charge : 0)
      hud.setBoss(brain.hp / brain.maxHp)
      renderer.render(scene, rig.cam)
    },
    fpsCap: () => QUALITY[tier].fps,
  })
  hud.setPips(hp)
  ;(window as any).__dong = { renderer, brain, body, rig, weapon, pad, time, park, dash, leap, get cover() { return cover }, get assault() { return assault }, get beat() { return beat }, get contact() { return contact.stats }, get stats() { return { ...stats, hp, bossHp: brain.hp, state: brain.state, phase: brain.stage + 1, covers: alive().filter(Boolean).length } } }
}
