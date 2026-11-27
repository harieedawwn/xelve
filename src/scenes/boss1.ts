// L5 boss room — Người gác (combat.md#6). Dev route: ?boss (&weapon=nhe|vua|nang). Menus/level flow arrive in P12/P13.
// Same duel wiring as dueltest; adds phases, round-walk opening, boss bar, drops, the radio line.
import * as THREE from 'three'
import { Renderer } from '../render/pipeline'
import { FX } from '../render/fx'
import { buildLobby } from '../levels/lobby'
import { Weapon } from '../combat/weapon'
import { PROFILES } from '../combat/profiles'
import { PlayerHP } from '../combat/player'
import { equippedDesign } from '../weapon/store'
import { sweep } from '../combat/sweep'
import { Bus } from '../combat/bus'
import { Defense, DEFENSE, canBlockWith, type Side } from '../combat/defense'
import { Audio } from '../audio/engine'
import { NguoiGac, DATA } from '../bosses/nguoigac'
import { CombatPad } from '../ui/combatPad'
import { startLoop } from '../core/loop'
import { bindFinger } from '../core/input'
import { Time } from '../core/time'
import { lerp, clamp } from '../camera/springs'
import { save, persist } from '../core/save'
import { grant } from '../story/drops'
import { completeLevel } from '../story/progress'
import { level } from '../levels/ch1'
import { wipe } from '../ui/wipe'
import { el } from '../ui/dom'
import { t } from '../i18n'

export function startBoss1(canvas: HTMLCanvasElement, renderer: Renderer, audio: Audio) {
  renderer.resize('tb')
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 50)
  cam.position.set(0, 1.5, 0); scene.add(cam)
  const lobby = buildLobby(scene)
  const fx = new FX(scene), weapon = new Weapon(cam), bus = new Bus(), time = new Time(), def = new Defense(), php = new PlayerHP()
  const player = new THREE.Vector3(0, 0, 0), look = new THREE.Vector3(0, 1.3, -1.1)
  const boss = new NguoiGac(scene, new THREE.Vector3(0, 0, -3))
  boss.mult = DEFENSE.counterMult; boss.onSound = (n) => audio.play(n)
  let hp = php.hp, impactQ = 0, vig = 0, desat = 0, camX = 0, camXV = 0, dodgeT = 0, dodgeSide: Side = 1, kick = 0, won = false, over = 0
  let orbit = 0
  const stats = { parry: 0, dodge: 0, block: 0, hit: 0, phases: [1] as number[], won: false, gained: [] as string[] }

  // UI: boss bar (name + fill), caption, hp pips (same markup as the slice HUD)
  const ui = document.getElementById('ui')!
  const bossbar = el('div', 'bossbar'), fill = el('div', 'fill'), track = el('div', 'track'), ticks = el('div', 'ticks')
  for (const f of DATA.phaseAt) { const i = el('i'); i.style.left = `${f * 100}%`; ticks.append(i) }
  track.append(fill); bossbar.append(el('b', '', t('boss.nguoigac')), track, ticks)
  const caption = el('div', 'caption'), pips = el('div', 'hp')
  for (let i = 0; i < 6; i++) pips.append(el('i'))
  ui.append(bossbar, caption, pips)
  const say = (key: Parameters<typeof t>[0], secs: number) => { caption.textContent = t(key); caption.classList.add('show'); setTimeout(() => caption.classList.remove('show'), secs * 1000) }
  const setPips = () => pips.querySelectorAll('i').forEach((e, i) => e.classList.toggle('off', i >= hp))

  const pad = new CombatPad({
    block: (d) => { if (d) { def.press(time.now); if (def.guarding) audio.play('guard.up') } else def.release(); weapon.guarding = def.guarding },
    dodge: (side) => { if (def.dodge(side, time.now)) { dodgeT = DEFENSE.dodgeTime; dodgeSide = side; audio.play('dodge') } },
    leap: () => {},
  })
  ui.append(pad.root, pad.luc)
  const context = () => {
    def.canBlock = canBlockWith(weapon.profile.cls, true); def.canDodge = true
    if (!def.canBlock) { def.release(); weapon.guarding = false }
    pad.set({ block: def.canBlock, dodge: true, leap: false, luc: weapon.profile.charged })
  }
  const w = new URLSearchParams(location.search).get('weapon')
  if (w && PROFILES[w]) weapon.setProfile(PROFILES[w]); else { const d = equippedDesign(); if (d) weapon.setDesign(d); else weapon.setProfile(PROFILES.vua) }
  context()
  bindFinger(canvas, weapon.finger, (d) => { weapon.touching = d })
  addEventListener('pointerdown', () => audio.unlock(), { once: true })
  audio.setSpace('hall')

  bus.on('hit', (e) => {
    if (e.blocked) { audio.play('hit.metal'); time.freeze(0.04); return }
    audio.hit(e.dmg / 10, e.head); time.freeze(e.killed ? 0.25 : 0.07); kick = 0.4
  })
  boss.onPhase = (n) => { stats.phases.push(n); audio.play('duel.telegraph'); time.freeze(0.12); kick = 1 }
  boss.onDefeat = () => {
    won = true; stats.won = true; over = 0
    time.slowmo(0.8, 0.25)
    stats.gained = grant(save(), 'nguoigac'); completeLevel(save(), level(5)!); persist()
    // inside the chapter (?level=5) the next level follows the radio line
    if (new URLSearchParams(location.search).has('level')) setTimeout(() => wipe(1, () => { location.href = `${location.pathname}?level=6&go=1` }), 7000)
    setTimeout(() => { audio.play('radio.crackle'); say('radio.l5', 4) }, 1400)
  }
  boss.onEvent = (e, m) => {
    if (e === 'slow') { time.slowmo(DEFENSE.duelSlowReal, DEFENSE.duelSlowScale); audio.slowIn() }
    if (e !== 'impact') return
    const r = def.resolve(m, time.now); stats[r.answer]++
    time.slow = Math.min(time.slow, 0.08)
    if (r.answer === 'parry') {
      time.freeze(DEFENSE.parryHitstop); impactQ = 3; audio.play('parry', 1.2); pad.pulse('block')
      time.slowmo(DEFENSE.parrySlow, DEFENSE.parrySlowScale); boss.parried(); weapon.charge = 1; kick = 1
      boss.vel.set(0, 0, -2.2)
    } else if (r.answer === 'block') { audio.play('block'); time.freeze(0.06); weapon.spend(); kick = 0.6
    } else if (r.answer === 'dodge') { boss.reel(DEFENSE.counterWindow); audio.play('duel.whoosh') }
    if (r.dmg > 0) {
      const dead = php.hit(r.dmg); hp = php.hp; setPips(); audio.playerHurt(); vig = 1; kick = 1.2
      if (dead) { php.reset(); hp = php.hp; setPips(); boss.hp = boss.maxHp; boss.stage = 0 } // dev: restart the duel
    }
  }
  addEventListener('resize', () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); renderer.resize('tb') })

  startLoop({
    step: (h) => {
      const dt = time.tick(h, () => audio.slowOut()), now = time.now
      boss.open = def.counterMult(now) > 1
      dodgeT = Math.max(0, dodgeT - dt)
      const want = dodgeT > 0 ? dodgeSide * 0.62 : 0
      camXV += ((want - camX) * 160 - camXV * 22) * dt; camX += camXV * dt
      // ring camera: slowly circles the boss (authored drift, never player look)
      orbit = lerp(orbit, boss.walking ? 0 : Math.sin(time.real * 0.35) * 0.35, 1 - Math.exp(-1.2 * dt))
      cam.position.set(camX + Math.sin(orbit) * 0.5, 1.5 - Math.abs(camX) * 0.12 - kick * 0.03, 0)
      const hv = boss.head.getWorldPosition(new THREE.Vector3()).setY(1.3)
      look.lerp(hv, 1 - Math.exp(-8 * dt)); cam.lookAt(look)
      cam.rotateZ(clamp(-camXV * 0.025, -0.12, 0.12) + Math.sin(time.real * 60) * kick * 0.01)
      kick = Math.max(0, kick - h * 3)
      weapon.update(time.hitstop > 0 ? 0 : h, now)
      boss.update(dt, player)
      if (boss.alive) sweep(weapon, [boss], fx, bus)
      audio.swing(weapon.touching ? weapon.tipSpeed : 0, time.scale)
      if (weapon.tipSpeed > 3 && weapon.touching && dt > 0) fx.smearPush(weapon.inner, weapon.tip, now)
      fx.update(dt, now)
      if (php.update(dt, boss.alive)) { hp = php.hp; setPips() }
      if (won) over += dt
    },
    render: (_a, realDt) => {
      vig = Math.max(0, vig - 1.5 * realDt); renderer.vig = vig
      desat = lerp(desat, time.slow > 0 ? 0.85 : 0, 1 - Math.exp(-12 * realDt)); renderer.desat = desat
      renderer.mode = impactQ > 0 ? (impactQ-- > 1 ? 2 : 1) : 0
      pad.setLuc(weapon.profile.charged ? weapon.charge : 0)
      fill.style.transform = `scaleX(${clamp(boss.hp / boss.maxHp, 0, 1)})`
      renderer.render(scene, cam)
    },
    fpsCap: () => 60,
  })
  setPips()
  void lobby
  ;(window as any).__boss = { boss, def, weapon, time, pad, get stats() { return { ...stats, hp, bossHp: boss.hp, phase: boss.stage + 1, walking: boss.walking } } }
}
