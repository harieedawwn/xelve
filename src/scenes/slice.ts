// 30-second slice: title → wake → corridor → 2 encounters → lift end card. Wires every draft module.
import * as THREE from 'three'
import { QUALITY, Tier } from '../core/quality'
import { Renderer } from '../render/pipeline'
import { CameraRig, EYE } from '../camera/rig'
import { buildCorridor } from '../levels/corridor'
import { FX } from '../render/fx'
import { Bong } from '../enemies/bong'
import { Weapon } from '../combat/weapon'
import { PROFILES } from '../combat/profiles'
import { sweep } from '../combat/sweep'
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
import { wipe } from '../ui/wipe'

type State = 'title' | 'wake' | 'walk' | 'fight' | 'clear' | 'end'
const END_S = 31
const ENCOUNTERS: { s: number; doors: (number | 'far')[] }[] = [
  { s: 8.5, doors: [0, 1, 5] },
  { s: 19, doors: [2, 3, 'far'] },
]

export function startSlice(canvas: HTMLCanvasElement, renderer: Renderer, ui: UI, audio: Audio, startTier: Tier) {
let tier: Tier = startTier
const scene = new THREE.Scene()
const rig = new CameraRig(innerWidth / innerHeight)
scene.add(rig.cam)
const world = buildCorridor(scene)
const fx = new FX(scene)
const weapon = new Weapon(rig.cam)
const time = new Time()
rig.onStep = () => audio.step()

let state: State = 'title'
const php = new PlayerHP(), bus = new Bus()
let hp = MAX_HP
let encIdx = 0, enemies: Bong[] = []
let desat = 0, vigT = 0, clearT = 0, deadT = 0, impactQ = 0, lastImpact = -9
const prevQ = new THREE.Quaternion()
const player = new THREE.Vector3()
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3()

function applyTier(t: Tier) {
  tier = t; renderer.resize(t)
  fx.maxParticles = QUALITY[t].particles; fx.maxDecals = QUALITY[t].decals
}
applyTier(tier)
const applySettings = () => {
  const st = settings()
  if (st.tier && st.tier !== tier) applyTier(st.tier)
  audio.setMuted(!st.sound); audio.setLevel(1); rig.reduceMotion = !!st.reduceShake
}
onSettings(applySettings); applySettings()
addEventListener('resize', () => { rig.cam.aspect = innerWidth / innerHeight; rig.cam.updateProjectionMatrix(); applyTier(tier) })
ui.onRestart = () => { wipe(1, () => location.reload()) }
ui.onClick = () => audio.ui()
ui.setLid(1)

ui.title.onclick = () => {
  if (!ui.ready) return
  document.documentElement.requestFullscreen?.().catch(() => {})
  ;(screen.orientation as any)?.lock?.('landscape')?.catch?.(() => {})
  audio.unlock(); audio.ui(); ui.hideTitle(); ui.hud(true)
  rig.startWake(); state = 'wake'
}

bindFinger(canvas, weapon.finger, (d) => { weapon.touching = d })

// ---- encounters
function spawnWave() {
  const enc = ENCOUNTERS[encIdx], slots = [-0.45, 0, 0.45]
  enc.doors.forEach((d, i) => {
    const from = d === 'far' ? new THREE.Vector3(0, 0, -25) : world.doors[d].clone()
    const b = new Bong(scene, from); b.slotX = slots[i % 3]; enemies.push(b)
  })
}
const alive = () => enemies.filter(e => e.alive)
function clearEnemies() { enemies.forEach(e => e.alive && scene.remove(e.root)); enemies = [] }

function impactFrame() {
  if (time.real - lastImpact < 0.4) return
  lastImpact = time.real; impactQ = 2
}

{ const w = new URLSearchParams(location.search).get('weapon'); if (w && PROFILES[w]) weapon.setProfile(PROFILES[w]) }
const motes = new Motes(scene, weapon.pivot, () => bus.emit('mote', { n: 1 }))
bus.on('mote', () => weapon.spring.v.y += 0.25)
bus.on('hurt', (e) => { rig.hitTaken(e.side); audio.playerHurt() })
bus.on('hit', (e) => {
  audio.hit(e.dmg / 10, e.head); rig.addTrauma(e.killed ? 0.35 : 0.18)
  rig.slashKick(weapon.slashDir.x, weapon.slashDir.y, e.killed ? 1 : 0.7)
  time.freeze(e.killed || e.head ? 0.09 : 0.07)
  if (e.killed) { audio.kill(); impactFrame(); motes.burst(e.at, 6) } else if (e.head && e.speed > 5) impactFrame()
  if (e.killed && alive().length === 0) { time.slowmo(0.55); audio.slowIn(); state = 'clear'; clearT = 1.9 }
})

function onPlayerStruck(e: Bong) {
  if (php.dead) return
  const dead = php.hit(1); hp = php.hp; ui.setHP(hp); vigT = 1
  bus.emit('hurt', { side: clamp(e.root.position.x - player.x, -1, 1) || 1, dead })
  if (dead) deadT = 1.6
}

function lookAt(dt: number) {
  const w = rig.lookWant
  w.set(0, EYE, -rig.s - 10)
  if (state === 'walk' || state === 'wake') {
    const g = smooth((rig.s - 2.2) / 0.6) * (1 - smooth((rig.s - 3.4) / 0.6))
    if (g > 0) w.lerp(tmpA.set(world.doodle.x, world.doodle.y, world.doodle.z), g)
    if (state === 'walk' && encIdx >= ENCOUNTERS.length) w.lerp(tmpA.set(0, 1.4, -36), smooth((rig.s - 24) / 6))
  } else if (state === 'fight' || state === 'clear') {
    const list = alive()
    if (list.length) {
      let near = list[0], c = tmpB.set(0, 0, 0)
      for (const e of list) { if (Math.abs(e.root.position.z - player.z) < Math.abs(near.root.position.z - player.z)) near = e; c.add(e.root.position) }
      c.multiplyScalar(1 / list.length); c.y = 1.3
      w.copy(near.hitParts().head).lerp(c, 0.5)
    }
  } else if (state === 'end') w.set(0, 1.4, -36)
}

function step(realDt: number) {
  const q = QUALITY[tier]
  const dt = time.tick(realDt, () => audio.slowOut())
  const scale = time.scale, now = time.now
  player.set(0, 0, -rig.s)

  // flow
  if (state === 'wake' && rig.wakeT < 0 && rig.eyelid === 0) { state = 'walk' }
  if (state === 'walk') {
    const enc = ENCOUNTERS[encIdx]
    rig.targetSpeed = 1.8
    if (enc && rig.s >= enc.s - 0.5) { rig.targetSpeed = 0; state = 'fight'; spawnWave() }
    else if (!enc && rig.s >= END_S - 0.5) { rig.targetSpeed = 0; if (rig.speed < 0.05) { state = 'end'; ui.showCard(true) } }
  } else if (state === 'fight' || state === 'clear') rig.targetSpeed = 0
  if (state === 'clear' && time.slow <= 0 && (clearT -= realDt) <= 0) { encIdx++; state = 'walk' }
  if (deadT > 0) {
    deadT -= realDt
    if (deadT <= 0) { clearEnemies(); php.reset(); hp = php.hp; ui.setHP(hp); spawnWave() }
  }

  if (php.update(dt, alive().length > 0)) { hp = php.hp; ui.setHP(hp) }
  motes.update(realDt)
  lookAt(dt)
  rig.update(dt, realDt)
  weapon.update(time.hitstop > 0 ? 0 : realDt, now)
  for (const e of enemies) e.update(dt, player, onPlayerStruck)
  if (deadT <= 0) sweep(weapon, enemies, fx, bus)
  audio.swing(weapon.touching ? weapon.tipSpeed : 0, scale)
  if (weapon.tipSpeed > 3 && weapon.touching && dt > 0) fx.smearPush(weapon.inner, weapon.tip, now)
  fx.update(dt, now)
  void q
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
  const sp = clamp((ang / Math.max(realDt, 1e-3) - 1.5) / 8, 0, 0.45) * 0.06
  renderer.blur.set(sp, 0)
  renderer.mode = impactQ > 0 ? impactQ-- : 0
  ui.setLid(state === 'title' ? 1 : rig.eyelid)
  renderer.render(scene, rig.cam)
}
startLoop({ step: (h) => step(h), render, fpsCap: () => QUALITY[tier].fps });
(window as any).__xelve = { weapon, get state() { return state }, get hp() { return hp }, rig, enemies: () => enemies, skip: (s: number) => { rig.s = s } }

}
