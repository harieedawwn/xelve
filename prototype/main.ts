// 30-second slice: title → wake → corridor → 2 encounters → lift end card. Wires every draft module.
import * as THREE from 'three'
import { QUALITY, Tier } from './palette'
import { Renderer } from './render'
import { CameraRig, EYE } from './camera'
import { buildCorridor } from './world'
import { FX } from './fx'
import { Bong } from './enemy'
import { Weapon } from './weapon'
import { Audio } from './audio'
import { UI } from './ui'
import { clamp, lerp, smooth } from './springs'

type State = 'title' | 'wake' | 'walk' | 'fight' | 'clear' | 'end'
const MAX_HP = 6, END_S = 31
const ENCOUNTERS: { s: number; doors: (number | 'far')[] }[] = [
  { s: 8.5, doors: [0, 1, 5] },
  { s: 19, doors: [2, 3, 'far'] },
]

const canvas = document.getElementById('c') as HTMLCanvasElement
let tier: Tier = 'tb'
const renderer = new Renderer(canvas)
const scene = new THREE.Scene()
const rig = new CameraRig(innerWidth / innerHeight)
scene.add(rig.cam)
const world = buildCorridor(scene)
const fx = new FX(scene)
const weapon = new Weapon(rig.cam)
const audio = new Audio()
const ui = new UI(tier)
rig.onStep = () => audio.step()

let state: State = 'title'
let encIdx = 0, hp = MAX_HP, enemies: Bong[] = []
let now = 0, hitstop = 0, slowT = 0, desat = 0, vigT = 0, clearT = 0, deadT = 0, impactQ = 0, lastImpact = -9
let lastFrame = 0, realClock = 0
const prevQ = new THREE.Quaternion()
const player = new THREE.Vector3()
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3()

function applyTier(t: Tier) {
  tier = t; renderer.resize(t)
  fx.maxParticles = QUALITY[t].particles; fx.maxDecals = QUALITY[t].decals
}
applyTier(tier)
addEventListener('resize', () => { rig.cam.aspect = innerWidth / innerHeight; rig.cam.updateProjectionMatrix(); applyTier(tier) })
ui.onTier = applyTier
ui.onMute = (m) => audio.setMuted(m)
ui.onRestart = () => location.reload()
ui.onClick = () => audio.ui()
ui.setLid(1)

ui.title.onclick = () => {
  document.documentElement.requestFullscreen?.().catch(() => {})
  ;(screen.orientation as any)?.lock?.('landscape')?.catch?.(() => {})
  audio.unlock(); audio.ui(); ui.hideTitle(); ui.hud(true)
  rig.startWake(); state = 'wake'
}

// ---- input: finger drives the weapon (never the camera)
function finger(e: PointerEvent) { weapon.finger.set((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2) }
canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); finger(e); weapon.touching = true })
canvas.addEventListener('pointermove', (e) => { if (weapon.touching) finger(e) })
const up = () => { weapon.touching = false }
canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up)

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
  if (realClock - lastImpact < 0.4) return
  lastImpact = realClock; impactQ = 2
}

function onPlayerStruck(e: Bong) {
  if (hp <= 0) return
  hp--; ui.setHP(hp); vigT = 1
  rig.hitTaken(clamp(e.root.position.x - player.x, -1, 1) || 1); audio.playerHurt()
  if (hp <= 0) { deadT = 1.6 }
}

// ---- hit sweep: sample points along prev→cur of 4 blade samples vs capsule + head sphere
function sweep() {
  if (!weapon.touching || weapon.tipSpeed < 2) return
  const v = weapon.tipSpeed
  for (const e of enemies) {
    if (!e.alive || e.hitCooldown > 0) continue
    const P = e.hitParts()
    let hit = false, head = false
    const at = tmpC
    for (let k = 0; k < 4 && !hit; k++) for (let t = 0; t <= 1 && !hit; t += 0.5) {
      const p = tmpA.copy(weapon.prev[k]).lerp(weapon.cur[k], t)
      if (p.distanceTo(P.head) < P.hr + 0.04) { hit = head = true; at.copy(p) }
      else {
        const ab = tmpB.copy(P.b).sub(P.a), u = clamp(tmpA.clone().sub(P.a).dot(ab) / ab.lengthSq(), 0, 1)
        if (p.distanceTo(ab.multiplyScalar(u).add(P.a)) < P.r + 0.04) { hit = true; at.copy(p) }
      }
    }
    if (!hit) continue
    const dir = tmpB.copy(weapon.cur[3]).sub(weapon.prev[3])
    if (dir.lengthSq() < 1e-8) dir.set(0, 0, -1); dir.normalize()
    const dmg = (4 + 9 * clamp(v / 5, 0.2, 2.2)) * (head ? 2 : 1)
    const killed = e.takeHit(dmg, at.clone(), dir.clone(), fx, head)
    audio.hit(dmg / 10, head); rig.addTrauma(killed ? 0.35 : 0.18)
    rig.slashKick(weapon.slashDir.x, weapon.slashDir.y, killed ? 1 : 0.7)
    hitstop = Math.max(hitstop, killed || head ? 0.09 : 0.07)
    if (killed) { audio.kill(); impactFrame() } else if (head && v > 5) impactFrame()
    if (killed && alive().length === 0) {
      slowT = 0.55; audio.slowIn(); state = 'clear'; clearT = 1.9
    }
  }
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

function frame(ts: number) {
  requestAnimationFrame(frame)
  const q = QUALITY[tier]
  if (q.fps === 30 && ts - lastFrame < 1000 / 30 - 2) return
  const realDt = Math.min(0.05, (ts - lastFrame) / 1000 || 0.016); lastFrame = ts
  realClock += realDt

  hitstop = Math.max(0, hitstop - realDt)
  let scale = hitstop > 0 ? 0 : slowT > 0 ? 0.25 : 1
  if (slowT > 0 && hitstop <= 0) { slowT -= realDt; if (slowT <= 0) audio.slowOut() }
  const dt = realDt * scale
  now += dt
  player.set(0, 0, -rig.s)

  // flow
  if (state === 'wake' && rig.wakeT < 0 && rig.eyelid === 0) { state = 'walk' }
  if (state === 'walk') {
    const enc = ENCOUNTERS[encIdx]
    rig.targetSpeed = 1.8
    if (enc && rig.s >= enc.s - 0.5) { rig.targetSpeed = 0; state = 'fight'; spawnWave() }
    else if (!enc && rig.s >= END_S - 0.5) { rig.targetSpeed = 0; if (rig.speed < 0.05) { state = 'end'; ui.showCard(true) } }
  } else if (state === 'fight' || state === 'clear') rig.targetSpeed = 0
  if (state === 'clear' && slowT <= 0 && (clearT -= realDt) <= 0) { encIdx++; state = 'walk' }
  if (deadT > 0) {
    deadT -= realDt
    if (deadT <= 0) { clearEnemies(); hp = MAX_HP; ui.setHP(hp); spawnWave() }
  }

  lookAt(dt)
  rig.update(dt, realDt)
  weapon.update(hitstop > 0 ? 0 : realDt, now)
  for (const e of enemies) e.update(dt, player, onPlayerStruck)
  if (deadT <= 0) sweep()
  audio.swing(weapon.touching ? weapon.tipSpeed : 0, scale)
  if (weapon.tipSpeed > 3 && weapon.touching && dt > 0) fx.smearPush(weapon.inner, weapon.tip, now)
  fx.update(dt, now)

  // post
  vigT = Math.max(0, vigT - 1.5 * realDt)
  const low = hp <= 2 && hp > 0 ? 0.35 + 0.15 * Math.sin(realClock * 5) : 0
  renderer.vig = Math.max(vigT, low, deadT > 0 ? 1 : 0)
  const wantDesat = deadT > 0 ? 1 : slowT > 0 ? 0.85 : 0
  desat = lerp(desat, wantDesat, 1 - Math.exp(-12 * realDt)); renderer.desat = desat
  const ang = rig.cam.quaternion.angleTo(prevQ); prevQ.copy(rig.cam.quaternion)
  renderer.ghost = q.ghost ? clamp((ang / Math.max(realDt, 1e-3) - 1.5) / 8, 0, 0.45) : 0
  renderer.mode = impactQ > 0 ? impactQ-- : 0
  ui.setLid(state === 'title' ? 1 : rig.eyelid)
  renderer.render(scene, rig.cam)
}
requestAnimationFrame(frame)
;(window as any).__xelve = { get state() { return state }, get hp() { return hp }, rig, enemies: () => enemies, skip: (s: number) => { rig.s = s } }
