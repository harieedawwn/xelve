// Dev-only camera debug scene (open with ?cam): curved rail + every authored move in sequence. Labels are dev-only, not in vi.ts.
import * as THREE from 'three'
import { Renderer } from '../render/pipeline'
import { CameraRig, EYE } from '../camera/rig'
import { Rail } from '../camera/rail'
import { ShotTrack } from '../camera/shots'
import * as M from '../camera/moves'
import { Time } from '../core/time'
import { PAL } from '../render/palette'

export function startCamTest(renderer: Renderer) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(PAL.paper ?? 0xecebe6)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 1.4))
  const P = (x: number, z: number) => new THREE.Vector3(x, 0, z)
  const rail = new Rail([P(0, 0), P(0, -12), P(5, -22), P(5, -34), P(-2, -44), P(-2, -60)])
  const rig = new CameraRig(innerWidth / innerHeight); rig.rail = rail; scene.add(rig.cam)
  const time = new Time(); rig.onSlowmo = (s, k) => time.slowmo(s, k)
  const box = (w: number, h: number, d: number, c: number, p: THREE.Vector3) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: c })); m.position.copy(p); scene.add(m); return m }
  const floor = box(40, 0.1, 100, 0xcfcdc6, new THREE.Vector3(0, -0.05, -30))
  floor.material = new THREE.MeshLambertMaterial({ color: 0xcfcdc6 })
  for (let s = 0; s < rail.length; s += 4) { const p = rail.pos(s), t = rail.tangent(s); const r = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)); for (const d of [-2.2, 2.2]) box(0.3, 3, 0.3, 0x16161a, p.clone().addScaledVector(r, d).setY(1.5)) }
  const boss = box(1.6, 3, 1.2, 0x16161a, new THREE.Vector3(2, 1.5, -52))
  const gem = box(0.2, 0.2, 0.2, 0xe8602c, new THREE.Vector3(0, 0.1, 0)); gem.visible = false
  rig.setShots(new ShotTrack([
    { s: 0, look: () => rail.pos(rig.s + 8).setY(EYE) }, { s: 14, look: () => boss.position, halfLifeMs: 250 },
    { s: 24, look: () => rail.pos(rig.s + 8).setY(EYE), halfLifeMs: 150, fov: 82 }, { s: 40, look: () => rail.pos(rig.s + 8).setY(EYE), fov: 78 },
  ]))

  const seq: [string, () => M.Move | null, number][] = [
    ['wake', () => M.wake(), 0], ['walk', () => null, 4], ['peek', () => M.peek(1), 8], ['dodge', () => M.dodge(-1), 12], ['dodge low', () => M.dodge('low'), 14],
    ['pickup', () => M.pickup(k => { gem.visible = k > 0; gem.position.copy(rig.bodyPos).addScaledVector(rig.fwd, 0.7).setY(0.9 - 0.8 * (1 - k)) }), 16],
    ['coverDash', () => M.coverDash(rail.pos(rig.s), rail.pos(rig.s + 5), boss.position.clone()), 30],
    ['leap', () => M.leap(boss.position.clone()), 46],
    ['cinematicCut', () => M.cinematicCut([{ dur: 1, pos: new THREE.Vector3(8, 3, -4), look: P(0, -10) }, { dur: 1, pos: new THREE.Vector3(-4, 1.2, -20), look: P(5, -30) }]), 51],
  ]
  const STILL = ['wake', 'pickup', 'coverDash', 'leap', 'cinematicCut']
  const log: { name: string; maxDeg: number; at: string }[] = []
  let idx = -1, cutAllowed = false, maxDeg = 0, worstAt = ''
  const label = document.createElement('div'); label.style.cssText = 'position:fixed;left:4px;bottom:4px;z-index:50;font:12px monospace;background:#16161a;color:#ecebe6;padding:2px 6px'
  const bar = document.createElement('div'); bar.style.cssText = 'position:fixed;left:0;top:0;display:flex;gap:4px;padding:4px;z-index:50;font:12px monospace;flex-wrap:wrap'
  document.body.append(label, bar)
  const mkBtn = (n: string, f: () => void) => { const b = document.createElement('button'); b.textContent = n; b.style.cssText = 'min-height:40px;padding:0 8px;border:2px solid #16161a;background:#ecebe6;color:#16161a;font:inherit;border-radius:0'; b.onclick = f; bar.append(b) }
  mkBtn('hitstop', () => { time.freeze(0.4); rig.addTrauma(0.8) }); mkBtn('hit', () => rig.hitTaken(1)); mkBtn('jump', () => { rig.jump(); setTimeout(() => rig.land(6), 700) })
  mkBtn('lowHp', () => { rig.lowHp = rig.lowHp ? 0 : 1 }); mkBtn('reduce', () => { rig.reduceMotion = !rig.reduceMotion })
  rig.onMoveEnd = (m) => { log.push({ name: m.name, maxDeg: Math.round(maxDeg * 10) / 10, at: worstAt }); maxDeg = 0 }
  addEventListener('resize', () => { rig.cam.aspect = innerWidth / innerHeight; rig.cam.updateProjectionMatrix(); renderer.resize('tb') })
  renderer.resize('tb')

  const prevQ = new THREE.Quaternion(); const w = window as unknown as { __cam: unknown }
  w.__cam = { rig, time, log, get done() { return idx >= seq.length }, get maxDeg() { return maxDeg }, play: (i: number) => { const m = seq[i][1](); if (m) rig.play(m) } }
  let last = performance.now()
  const loop = (nowMs: number) => {
    requestAnimationFrame(loop)
    const real = Math.min(0.05, (nowMs - last) / 1000); last = nowMs
    const dt = time.tick(real)
    while (idx + 1 < seq.length && !rig.busy && rig.s >= seq[idx + 1][2]) { idx++; label.textContent = seq[idx][0]; const m = seq[idx][1](); if (m) rig.play(m); cutAllowed = m?.name === 'cinematicCut' }
    const still = rig.busy && STILL.includes(seq[idx][0]); rig.targetSpeed = still || rig.s > rail.length - 2 ? 0 : 1.8
    rig.update(dt, real)
    if (dt > 0 && !cutAllowed) { const d = THREE.MathUtils.radToDeg(rig.cam.quaternion.angleTo(prevQ)) / (dt * 60); if (d > maxDeg) { maxDeg = d; worstAt = `s${rig.s.toFixed(1)} dt${dt.toFixed(3)}` } }
    prevQ.copy(rig.cam.quaternion)
    renderer.render(scene, rig.cam)
  }
  requestAnimationFrame(loop)
}
