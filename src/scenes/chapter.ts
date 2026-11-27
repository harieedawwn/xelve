// Chapter 1 runner: one scene for every rail level, driven by src/levels/ch1/Lx.ts data (levels.md).
// title (first launch only) → wake / fade-in → walk → encounters → pickups → voice message → level end (unlocks, Xưởng, next level).
import * as THREE from 'three'
import { QUALITY, Tier } from '../core/quality'
import { Renderer } from '../render/pipeline'
import { CameraRig, EYE } from '../camera/rig'
import { Rail } from '../camera/rail'
import { buildCorridor, HALF_W, HEIGHT } from '../levels/corridor'
import { buildRoom } from '../levels/rooms'
import { level, CH1 } from '../levels/ch1'
import type { LevelData } from '../levels/ch1/types'
import { ENEMIES } from '../enemies/registry'
import type { Enemy } from '../enemies/base'
import { FX } from '../render/fx'
import { Weapon } from '../combat/weapon'
import { equippedDesign } from '../weapon/store'
import { PROFILES } from '../combat/profiles'
import { sweep, spreadBurn } from '../combat/sweep'
import { Bus } from '../combat/bus'
import { Motes } from '../combat/motes'
import { PlayerHP, MAX_HP } from '../combat/player'
import { Audio } from '../audio/engine'
import { UI } from '../ui/ui'
import { clamp, lerp, smooth } from '../camera/springs'
import { Time } from '../core/time'
import { startLoop } from '../core/loop'
import { bindFinger } from '../core/input'
import { settings, onSettings } from '../core/settings'
import { save, persist } from '../core/save'
import { wipe } from '../ui/wipe'
import { Defense, DEFENSE, canBlockWith } from '../combat/defense'
import { CombatPad } from '../ui/combatPad'
import { playVoice } from '../story/voice'
import { completeLevel, pickupName, MATERIAL_GIVE } from '../story/progress'
import { pickupMesh } from '../story/pickups'
import { Forge } from '../forge/forge'
import { BLUEPRINTS } from '../weapon/blueprints/registry'
import { khoiSize } from '../weapon/economy'
import { el } from '../ui/dom'
import { t } from '../i18n'

type State = 'title' | 'wake' | 'walk' | 'fight' | 'clear' | 'pick' | 'end'

export function startChapter(canvas: HTMLCanvasElement, renderer: Renderer, ui: UI, audio: Audio, startTier: Tier, lv: LevelData, skipTitle: boolean) {
let tier: Tier = startTier
const scene = new THREE.Scene()
const rig = new CameraRig(innerWidth / innerHeight)
scene.add(rig.cam); rig.rail = Rail.straight(lv.length + 4)
const world = lv.room === 'corridor' ? buildCorridor(scene) : buildRoom(scene, lv.room)
const bounds = lv.room === 'corridor' ? { halfW: HALF_W, height: HEIGHT } : world as { halfW: number; height: number }
const doodle = (world as any).doodle as THREE.Vector3 | undefined
const fx = new FX(scene, bounds.halfW, bounds.height)
const weapon = new Weapon(rig.cam)
const time = new Time()
rig.onStep = () => audio.step()

let state: State = 'title'
const php = new PlayerHP(), bus = new Bus()
let hp = MAX_HP
let encIdx = 0, pickIdx = 0, msgDone = false, enemies: Enemy[] = []
let desat = 0, vigT = 0, clearT = 0, deadT = 0, impactQ = 0, lastImpact = -9, pickT = 0, hold: THREE.Object3D | null = null
const prevQ = new THREE.Quaternion()
const player = new THREE.Vector3()
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3()

function applyTier(t: Tier) { tier = t; renderer.resize(t); fx.maxParticles = QUALITY[t].particles; fx.maxDecals = QUALITY[t].decals }
applyTier(tier)
const applySettings = () => {
  const st = settings()
  if (st.tier && st.tier !== tier) applyTier(st.tier)
  audio.setMuted(!st.sound); audio.setLevel(1); audio.setMusic(st.music); rig.reduceMotion = !!st.reduceShake
}
onSettings(applySettings); applySettings()
addEventListener('resize', () => { rig.cam.aspect = innerWidth / innerHeight; rig.cam.updateProjectionMatrix(); applyTier(tier) })
ui.onRestart = () => { wipe(1, () => location.reload()) }
ui.onClick = () => audio.ui()

function begin() {
  audio.unlock(); audio.ui(); audio.music.play('slice'); ui.hud(true); padContext(true)
  if (lv.id === 1) { rig.startWake(); state = 'wake' } else { ui.setLid(0); state = 'walk' }
}
bindFinger(canvas, weapon.finger, (d) => { weapon.touching = d })

const def = new Defense()
const pad = new CombatPad({
  block: (d) => { if (d) { def.press(time.now); if (def.guarding) audio.play('guard.up') } else def.release(); weapon.guarding = def.guarding },
  dodge: () => {}, leap: () => {},
})
ui.root.append(pad.root, pad.luc)
let padOn = false
const padContext = (on: boolean) => {
  padOn = on; def.canBlock = on && canBlockWith(weapon.profile.cls, false)
  if (!def.canBlock) { def.release(); weapon.guarding = false }
  pad.set({ block: def.canBlock, dodge: false, leap: false, luc: on && weapon.profile.charged })
}

if (skipTitle) { ui.hideTitle(); ui.setLid(0); addEventListener('pointerdown', () => audio.unlock(), { once: true }); begin() }
else {
  ui.setLid(1)
  ui.title.onclick = () => {
    if (!ui.ready) return
    document.documentElement.requestFullscreen?.().catch(() => {})
    ;(screen.orientation as any)?.lock?.('landscape')?.catch?.(() => {})
    ui.hideTitle(); begin()
  }
}

// ---- encounters
const wire = (e: Enemy) => { e.onSound = (n) => audio.play(n); e.onSpawn = (k) => { wire(k); enemies.push(k) } }
function spawnWave() {
  const enc = lv.encounters[encIdx], slots = [-0.45, 0, 0.45]
  enc.wave.forEach((sp, i) => {
    const from = sp.door === 'far' ? new THREE.Vector3((i % 3 - 1) * 0.5, 0, -rig.s - 16 - i) : world.doors[sp.door].clone()
    const b = ENEMIES[sp.type](scene, from); b.slotX = slots[i % 3]; wire(b); audio.play('bong.appear'); enemies.push(b)
  })
}
const alive = () => enemies.filter(e => e.alive)
function clearEnemies() { enemies.forEach(e => e.alive && scene.remove(e.root)); enemies = [] }
function impactFrame() { if (time.real - lastImpact < 0.4) return; lastImpact = time.real; impactQ = 2 }

{ const w = new URLSearchParams(location.search).get('weapon'); if (w && PROFILES[w]) weapon.setProfile(PROFILES[w]); else { const d = equippedDesign(); if (d) weapon.setDesign(d) } }
const motes = new Motes(scene, weapon.pivot, () => bus.emit('mote', { n: 1 }))
bus.on('mote', () => weapon.spring.v.y += 0.25)
bus.on('hurt', (e) => { rig.hitTaken(e.side); audio.playerHurt() })
bus.on('hit', (e) => {
  if (e.blocked) { audio.play('hit.metal'); rig.addTrauma(0.1); time.freeze(0.04); return }
  audio.hit(e.dmg / 10, e.head); rig.addTrauma(e.killed ? 0.35 : 0.18)
  rig.slashKick(weapon.slashDir.x, weapon.slashDir.y, e.killed ? 1 : 0.7)
  time.freeze(e.killed || e.head ? 0.09 : 0.07)
  if (e.killed) { audio.kill(); impactFrame(); motes.burst(e.at, 6) } else if (e.head && e.speed > 5) impactFrame()
  if (e.killed && alive().length === 0) { time.slowmo(0.55); audio.slowIn(); state = 'clear'; clearT = 1.9 }
})

function onPlayerStruck(e: Enemy) {
  if (php.dead) return
  const r = def.resolve({ dmg: 1, dodge: null, blockable: true }, time.now)
  if (r.answer === 'parry') {
    time.freeze(DEFENSE.parryHitstop); impactQ = 2; audio.play('parry', 1.2); pad.pulse('block'); rig.addTrauma(0.3)
    time.slowmo(DEFENSE.parrySlow, DEFENSE.parrySlowScale); e.status.apply('choang', DEFENSE.parryStun); weapon.charge = 1
    e.vel.set(0, 0, -2.4); return
  }
  if (r.answer === 'block') { audio.play('block'); time.freeze(0.06); weapon.spend(); rig.addTrauma(0.2); if (!r.dmg) return }
  const dead = php.hit(r.dmg); hp = php.hp; ui.setHP(hp); vigT = 1
  bus.emit('hurt', { side: clamp(e.root.position.x - player.x, -1, 1) || 1, dead })
  if (dead) deadT = 1.6
}

// ---- pickups: stop, look, show the object 2 s in front of the eyes, then it is yours
const objPos = (o: string) => (world as any).objects?.[o] as THREE.Vector3 | undefined
function startPick() {
  const p = lv.pickups[pickIdx]; state = 'pick'; pickT = 0; rig.targetSpeed = 0
  const m = pickupMesh(p.gives); m.position.set(0, -0.08, -0.5); rig.cam.add(m); hold = m
  const cap = el('div', 'pickcap', `${t('drop.got')}: ${pickupName(p.gives)}`); ui.root.append(cap)
  requestAnimationFrame(() => cap.classList.add('show')); setTimeout(() => { cap.classList.remove('show'); setTimeout(() => cap.remove(), 300) }, 2100)
  audio.play('pickup')
}
function endPick() {
  const p = lv.pickups[pickIdx++]
  if (hold) { rig.cam.remove(hold); hold = null }
  if (MATERIAL_GIVE[p.gives]) { const m = save().materials; m[p.gives] = (m[p.gives] ?? 0) + MATERIAL_GIVE[p.gives] }
  persist(); state = 'walk'
}

// ---- level end
function finishLevel() {
  state = 'end'; padContext(false); completeLevel(save(), lv); persist()
  const next = level(lv.id + 1)
  const go = () => { if (next) wipe(1, () => { location.href = `${location.pathname}?level=${next.id}&go=1` }); else ui.showCard(true) }
  if (!lv.forge) { setTimeout(go, 900); return }
  const f = new Forge({ khoiSize: khoiSize(save()), unlocked: Object.keys(BLUEPRINTS).filter(k => save().unlocked.includes(k)), onBack: () => { f.root.remove(); go() }, onSound: (n, p) => audio.play(n, p) })
  setTimeout(() => ui.root.appendChild(f.root), 900)
}

function lookAt() {
  const w = rig.lookWant
  w.set(0, EYE, -rig.s - 10)
  if (state === 'walk' || state === 'wake') {
    if (doodle) { const g = smooth((rig.s - 2.2) / 0.6) * (1 - smooth((rig.s - 3.4) / 0.6)); if (g > 0) w.lerp(tmpA.copy(doodle), g) }
    const p = lv.pickups[pickIdx], o = p && objPos(p.object)
    if (o) { const g = smooth((rig.s - (p.atS - 3)) / 1.2); if (g > 0) w.lerp(tmpC.copy(o), g * 0.8) }
  } else if (state === 'pick') { const o = objPos(lv.pickups[pickIdx].object); if (o) w.lerp(tmpC.copy(o), 0.7) }
  else if (state === 'fight' || state === 'clear') {
    const list = alive()
    if (list.length) {
      let near = list[0], c = tmpB.set(0, 0, 0)
      for (const e of list) { if (Math.abs(e.root.position.z - player.z) < Math.abs(near.root.position.z - player.z)) near = e; c.add(e.root.position) }
      c.multiplyScalar(1 / list.length); c.y = 1.3
      w.copy(near.hitParts().head).lerp(c, 0.5)
    }
  }
}

function step(realDt: number) {
  const dt = time.tick(realDt, () => audio.slowOut())
  const scale = time.scale, now = time.now
  player.set(0, 0, -rig.s)
  ;(world as any).tick?.(time.real)

  if (state === 'wake' && rig.wakeT < 0 && rig.eyelid === 0) state = 'walk'
  if (state === 'walk') {
    const enc = lv.encounters[encIdx], pk = lv.pickups[pickIdx]
    rig.targetSpeed = lv.speed
    if (enc && rig.s >= enc.atS - 0.5) { rig.targetSpeed = 0; state = 'fight'; spawnWave() }
    else if (pk && rig.s >= pk.atS && !enc) startPick()
    else if (pk && rig.s >= pk.atS && enc && enc.atS > pk.atS) startPick()
    else if (!msgDone && lv.message && rig.s >= lv.message.atS && (!enc || enc.atS > lv.message.atS)) { msgDone = true; playVoice(lv.message.id) }
    else if (!enc && !pk && rig.s >= lv.length - 0.5) { rig.targetSpeed = 0; if (rig.speed < 0.05 && msgDone === !!lv.message) finishLevel() }
    else if (!enc && !pk && lv.message && !msgDone) { /* waiting for the message position */ }
  } else if (state === 'fight' || state === 'clear' || state === 'pick') rig.targetSpeed = 0
  if (state === 'pick') { pickT += realDt; if (hold) hold.rotation.y += realDt * 1.2; if (pickT > 2.4) endPick() }
  if (state === 'clear' && time.slow <= 0 && (clearT -= realDt) <= 0) { encIdx++; state = 'walk' }
  if (deadT > 0) {
    deadT -= realDt
    if (deadT <= 0) { clearEnemies(); php.reset(); hp = php.hp; ui.setHP(hp); spawnWave() }
  }

  if (php.update(dt, alive().length > 0)) { hp = php.hp; ui.setHP(hp) }
  motes.update(realDt)
  lookAt()
  rig.update(dt, realDt)
  weapon.update(time.hitstop > 0 ? 0 : realDt, now)
  for (const e of enemies) e.update(dt, player, onPlayerStruck)
  if (deadT <= 0) { sweep(weapon, enemies, fx, bus); spreadBurn(enemies) }
  audio.swing(weapon.touching ? weapon.tipSpeed : 0, scale)
  if (weapon.tipSpeed > 3 && weapon.touching && dt > 0) fx.smearPush(weapon.inner, weapon.tip, now)
  fx.update(dt, now)
}

function render(_a: number, realDt: number) {
  const q = QUALITY[tier], realClock = time.real
  vigT = Math.max(0, vigT - 1.5 * realDt)
  const low = hp <= 2 && hp > 0 ? 0.35 + 0.15 * Math.sin(realClock * 5) : 0
  renderer.vig = Math.max(vigT, low, deadT > 0 ? 1 : 0)
  const wantDesat = deadT > 0 ? 1 : time.slow > 0 ? 0.85 : 0
  desat = lerp(desat, wantDesat, 1 - Math.exp(-12 * realDt)); renderer.desat = desat
  const ang = rig.cam.quaternion.angleTo(prevQ); prevQ.copy(rig.cam.quaternion)
  renderer.ghost = q.ghost ? clamp((ang / Math.max(realDt, 1e-3) - 1.5) / 8, 0, 0.45) : 0
  renderer.blur.set(clamp((ang / Math.max(realDt, 1e-3) - 1.5) / 8, 0, 0.45) * 0.06, 0)
  renderer.mode = impactQ > 0 ? impactQ-- : 0
  if (padOn) pad.setLuc(weapon.charge)
  if (state !== 'title') ui.setLid(lv.id === 1 ? rig.eyelid : 0)
  renderer.render(scene, rig.cam)
}
startLoop({ step: (h) => step(h), render, fpsCap: () => QUALITY[tier].fps });
(window as any).__xelve = { weapon, get state() { return state }, get hp() { return hp }, rig, lv, enemies: () => enemies, skip: (s: number) => { rig.s = s }, levels: CH1.length }
}
