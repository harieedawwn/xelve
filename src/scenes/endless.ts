// Vô tận (combat.md#8): standing arena, waves of the enemies you have met, mini-boss every 5th, best wave saved.
// Backdrop rotates through 4 rooms (one Group each, swapped between waves). No control of look direction: the camera idles with a spring sway.
import * as THREE from 'three'
import { Renderer } from '../render/pipeline'
import { FX } from '../render/fx'
import { buildCorridor } from '../levels/corridor'
import { buildRoom } from '../levels/rooms'
import { Weapon } from '../combat/weapon'
import { PROFILES } from '../combat/profiles'
import { equippedDesign } from '../weapon/store'
import { sweep, spreadBurn } from '../combat/sweep'
import { Bus } from '../combat/bus'
import { Motes } from '../combat/motes'
import { PlayerHP, MAX_HP } from '../combat/player'
import { Defense, DEFENSE, canBlockWith } from '../combat/defense'
import { CombatPad } from '../ui/combatPad'
import { Audio } from '../audio/engine'
import { UI } from '../ui/ui'
import { ENEMIES } from '../enemies/registry'
import type { Enemy } from '../enemies/base'
import { startLoop } from '../core/loop'
import { bindFinger } from '../core/input'
import { Time } from '../core/time'
import { settings } from '../core/settings'
import { save, persist } from '../core/save'
import { earn } from '../weapon/economy'
import { QUALITY } from '../core/quality'
import { el, ICON } from '../ui/dom'
import { wipe } from '../ui/wipe'
import { t, Key } from '../i18n'
import { ENDLESS, waveOf, rewardFor, backdropFor, bestWave, BEST_KEY, isBossWave } from './endlessLogic'

export function startEndless(canvas: HTMLCanvasElement, renderer: Renderer, ui: UI, audio: Audio) {
  const tier = settings().tier ?? 'tb'; renderer.resize(tier)
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 50)
  cam.position.set(0, 1.5, 0); scene.add(cam)
  const fx = new FX(scene), weapon = new Weapon(cam), bus = new Bus(), time = new Time()
  fx.maxParticles = QUALITY[tier].particles; fx.maxDecals = QUALITY[tier].decals
  const w = new URLSearchParams(location.search).get('weapon'); if (w && PROFILES[w]) weapon.setProfile(PROFILES[w]); else { const d = equippedDesign(); if (d) weapon.setDesign(d) }
  audio.setMuted(!settings().sound); audio.setMusic(settings().music)
  addEventListener('pointerdown', () => { audio.unlock(); audio.music.play('slice') }, { once: true })
  bindFinger(canvas, weapon.finger, (d) => { weapon.touching = d })
  const motes = new Motes(scene, weapon.pivot, () => bus.emit('mote', { n: 1 })); bus.on('mote', () => weapon.spring.v.y += 0.25)

  // ---- backdrop: one Group per room id, built lazily; swapped between waves
  const rooms: Record<string, THREE.Group> = {}
  let backdrop = '', world: { tick?: (t: number) => void } = {}
  const showBackdrop = (id: string) => {
    if (id === backdrop) return
    if (backdrop) scene.remove(rooms[backdrop])
    if (!rooms[id]) {
      const g = new THREE.Group(); const host = new THREE.Scene()
      const wd = id === 'corridor' ? buildCorridor(host) : buildRoom(host, id as any)
      host.children.slice().forEach(c => { if (!(c as any).isLight) g.add(c) }); rooms[id] = g; (g as any).world = wd
      if (!scene.children.some(c => (c as any).isLight)) { host.children.forEach(c => (c as any).isLight && scene.add(c)) }
      if (!scene.background) { scene.background = host.background; scene.fog = host.fog }
    }
    backdrop = id; scene.add(rooms[id]); world = (rooms[id] as any).world
  }
  showBackdrop('corridor')

  // ---- combat state
  const php = new PlayerHP(), player = new THREE.Vector3(0, 0, 0), def = new Defense()
  let hp = MAX_HP, enemies: Enemy[] = [], wave = 0, state: 'wait' | 'fight' | 'dead' = 'wait', waitT = 1.2, deadT = 0, impactQ = 0, vigT = 0, desat = 0
  ui.hud(true); ui.setHP(hp)
  const pad = new CombatPad({
    block: (d) => { if (d) { def.press(time.now); if (def.guarding) audio.play('guard.up') } else def.release(); weapon.guarding = def.guarding },
    dodge: () => {}, leap: () => {},
  })
  ui.root.append(pad.root, pad.luc)
  def.canBlock = canBlockWith(weapon.profile.cls, false)
  pad.set({ block: def.canBlock, dodge: false, leap: false, luc: weapon.profile.charged })
  const hud = el('div', 'endhud'); ui.root.append(hud)
  const setHud = () => { hud.innerHTML = `${t('endless.wave' as Key)} ${wave}<small>${t('endless.best' as Key)} ${Math.max(wave, bestWave(save()))}</small>` }

  const wire = (e: Enemy) => { e.onSound = (n) => audio.play(n); e.onSpawn = (k) => { wire(k); enemies.push(k) } }
  const alive = () => enemies.filter(e => e.alive)
  function nextWave() {
    wave++; showBackdrop(backdropFor(wave)); setHud()
    const { ids, boss } = waveOf(wave, save())
    const list = boss ? [boss, ...ids] : ids
    list.forEach((id, i) => {
      const e = ENEMIES[id](scene, new THREE.Vector3((i % 3 - 1) * 1.2, 0, -8 - i * 0.8)); e.slotX = (i % 3 - 1) * 0.45
      if (boss && i === 0) { e.root.scale.multiplyScalar(ENDLESS.bossScale); e.maxHp = e.hp = e.maxHp * ENDLESS.bossHpMult }
      wire(e); enemies.push(e); audio.play('bong.appear')
    })
    state = 'fight'
  }
  function cleared() {
    const r = rewardFor(wave, save()); for (const [k, n] of Object.entries(r)) earn(k, n)
    const s = save(); if (wave > bestWave(s)) { s.bests[BEST_KEY] = wave; persist() }
    state = 'wait'; waitT = isBossWave(wave) ? 2.4 : 1.6
  }
  bus.on('hit', (e) => {
    if (e.blocked) { audio.play('hit.metal'); time.freeze(0.04); return }
    audio.hit(e.dmg / 10, e.head); time.freeze(e.killed || e.head ? 0.09 : 0.07)
    if (e.killed) { audio.kill(); impactQ = 2; motes.burst(e.at, 6) }
  })
  function onStruck(e: Enemy) {
    if (php.dead) return
    const r = def.resolve({ dmg: 1, dodge: null, blockable: true }, time.now)
    if (r.answer === 'parry') { time.freeze(DEFENSE.parryHitstop); audio.play('parry', 1.2); pad.pulse('block'); time.slowmo(DEFENSE.parrySlow, DEFENSE.parrySlowScale); e.status.apply('choang', DEFENSE.parryStun); weapon.charge = 1; e.vel.set(0, 0, -2.4); return }
    if (r.answer === 'block') { audio.play('block'); time.freeze(0.06); weapon.spend(); if (!r.dmg) return }
    const dead = php.hit(r.dmg); hp = php.hp; ui.setHP(hp); vigT = 1; audio.playerHurt()
    if (dead) { state = 'dead'; deadT = 1.6 }
  }
  function gameOver() {
    const s = save(); if (wave > bestWave(s)) { s.bests[BEST_KEY] = wave; persist() }
    const box = el('div', 'chcard show', `<div class="ct">${t('endless.over' as Key)} ${wave}</div><div class="cs">${t('endless.best' as Key)} ${bestWave(save())}</div>`)
    const again = el('button', 'btn', ICON.restart + t('menu.restart')); const home = el('button', 'ib lg', ICON.home); home.setAttribute('aria-label', t('menu.home'))
    again.onclick = () => wipe(1, () => location.reload()); home.onclick = () => wipe(1, () => { location.href = `${location.pathname}?menu` })
    box.append(again, home); ui.root.append(box)
  }
  addEventListener('resize', () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); renderer.resize(tier) })

  let tt = 0
  startLoop({
    step: (h) => {
      const dt = time.tick(h, () => audio.slowOut()), now = time.now; tt += h
      world.tick?.(time.real)
      if (state === 'fight' && enemies.length && alive().length === 0) { time.slowmo(0.55); audio.slowIn(); cleared(); enemies = [] }
      if (state === 'wait' && (waitT -= h) <= 0 && time.slow <= 0) nextWave()
      if (state === 'dead' && (deadT -= h) <= 0 && deadT > -5) { deadT = -10; gameOver() }
      if (php.update(dt, alive().length > 0)) { hp = php.hp; ui.setHP(hp) }
      cam.rotation.set(Math.sin(tt * 0.5) * 0.01, Math.sin(tt * 0.3) * 0.015, 0)
      motes.update(h); weapon.update(time.hitstop > 0 ? 0 : h, now)
      for (const e of enemies) e.update(dt, player, onStruck)
      if (state !== 'dead') { sweep(weapon, enemies, fx, bus); spreadBurn(enemies) }
      audio.swing(weapon.touching ? weapon.tipSpeed : 0, time.scale)
      fx.update(dt, now)
    },
    render: (_a, rdt) => {
      vigT = Math.max(0, vigT - 1.5 * rdt); renderer.vig = Math.max(vigT, hp <= 2 && hp > 0 ? 0.4 : 0, state === 'dead' ? 1 : 0)
      desat += ((state === 'dead' ? 1 : time.slow > 0 ? 0.85 : 0) - desat) * (1 - Math.exp(-12 * rdt)); renderer.desat = desat
      renderer.mode = impactQ > 0 ? impactQ-- : 0
      pad.setLuc(weapon.charge); renderer.render(scene, cam)
    },
    fpsCap: () => QUALITY[tier].fps,
  })
  ;(window as any).__endless = { get wave() { return wave }, get state() { return state }, enemies: () => enemies, weapon, kill: () => enemies.forEach(e => { if (e.alive) { const pos = e.root.position.clone(); pos.y += 1.2; e.takeHit(9999, pos, new THREE.Vector3(0, 0, -1), fx, true) } }) }
}
