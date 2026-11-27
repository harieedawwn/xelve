// Dev-only effect test scene (open with ?fx). Toggles every effect at all 3 tiers; shows frame stats + heap delta.
// Not player-facing, so labels are not in vi.ts.
import * as THREE from 'three'
import { Renderer } from '../render/pipeline'
import { FX } from '../render/fx'
import { buildCorridor } from '../levels/corridor'
import { makeAsciiMaterial, setDissolve } from '../render/ascii'
import { QUALITY, Tier, TIERS } from '../core/quality'
import { PAL } from '../render/palette'

export function startFxTest(renderer: Renderer) {
  let tier: Tier = 'tb'
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 50)
  cam.position.set(0, 1.5, 0)
  buildCorridor(scene)
  const fx = new FX(scene)
  const mat = makeAsciiMaterial(PAL.ink)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.7, 0.4, 4, 6, 3), mat); body.position.set(0, 1, -5); scene.add(body)
  const st = { outline: true, blur: false, ghost: false, impact: false, drain: false, smear: false, dissolve: false, spray: false }
  let dis = 0, impactT = 0
  const apply = () => { renderer.resize(tier); fx.maxParticles = QUALITY[tier].particles; fx.maxDecals = QUALITY[tier].decals }
  addEventListener('resize', () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); apply() })

  const bar = document.createElement('div')
  bar.style.cssText = 'position:fixed;left:0;top:0;right:0;display:flex;flex-wrap:wrap;gap:4px;padding:4px;z-index:50;font:12px monospace'
  const info = document.createElement('div'); info.style.cssText = 'position:fixed;left:4px;bottom:4px;z-index:50;font:12px monospace;background:#16161a;color:#ecebe6;padding:2px 6px'
  document.body.append(bar, info)
  const btn = (label: string, on: () => void) => {
    const b = document.createElement('button'); b.textContent = label; b.dataset.fx = label
    b.style.cssText = 'min-height:40px;min-width:48px;padding:0 8px;border:2px solid #16161a;background:#ecebe6;color:#16161a;font:inherit;border-radius:0'
    b.onclick = on; bar.append(b); return b
  }
  TIERS.forEach(t => btn('tier:' + t, () => { tier = t; apply() }))
  ;(Object.keys(st) as (keyof typeof st)[]).forEach(k => btn(k, () => { st[k] = !st[k]; if (k === 'impact') impactT = 0 }))
  btn('burst', () => { for (let i = 0; i < 8; i++) fx.blood(new THREE.Vector3(0, 1.2, -5), new THREE.Vector3(0.3, 0.4, -1).normalize(), PAL.bloodTim, 60); fx.splash(new THREE.Vector3(0, 1.2, -5), new THREE.Vector3(0, 0, -1), PAL.bloodDo, 30) })
  btn('stress', () => { for (let i = 0; i < 40; i++) fx.blood(new THREE.Vector3(0, 1.2, -5), new THREE.Vector3((Math.random() - .5), .5, -1).normalize(), PAL.bloodLam, 60) })
  apply()

  const heap = () => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0
  const w = window as unknown as { __fx: unknown }
  let last = performance.now(), frames = 0, acc = 0, fps = 0, h0 = 0, hmax = 0, samples = 0
  w.__fx = { st, get stats() { return { fps, tier, particles: fx.particleCount, decals: fx.decalCount, heapDelta: hmax - h0, samples } }, setTier: (t: Tier) => { tier = t; apply() }, resetHeap: () => { h0 = heap(); hmax = h0; samples = 0 } }

  const loop = (nowMs: number) => {
    requestAnimationFrame(loop)
    const dt = Math.min(0.05, (nowMs - last) / 1000); last = nowMs; const now = nowMs / 1000
    frames++; acc += dt; if (acc >= 0.5) { fps = Math.round(frames / acc); frames = 0; acc = 0 }
    const hs = heap(); if (hs) { hmax = Math.max(hmax, hs); samples++ }
    cam.rotation.y = Math.sin(now * 2.2) * 0.25
    renderer.outline = st.outline
    renderer.blur.set(st.blur ? 0.04 * Math.cos(now * 2.2) : 0, 0)
    renderer.ghost = st.ghost ? 0.4 : 0
    impactT = st.impact ? (impactT + 1) % 60 : 0
    renderer.mode = impactT === 0 ? 0 : impactT < 3 ? 1 : 0
    renderer.desat = st.drain ? 0.85 : 0
    if (st.smear) { const a = Math.sin(now * 6) * 0.9; fx.smearPush(new THREE.Vector3(a, 1.4, -2), new THREE.Vector3(a + 0.5, 1.0, -2.4), now) }
    if (st.spray) fx.blood(new THREE.Vector3(0, 1.2, -5), new THREE.Vector3(Math.random() - .5, .6, -1).normalize(), PAL.bloodTim, 6)
    dis = st.dissolve ? Math.min(1.1, dis + dt * 0.5) : 0; if (dis >= 1.1) dis = 0
    setDissolve(mat, dis, now)
    fx.update(dt, now)
    renderer.render(scene, cam)
    info.textContent = `${tier} ${renderer.lowW}x${renderer.lowH} · ${fps} fps · p ${fx.particleCount}/${QUALITY[tier].particles} · d ${fx.decalCount}/${QUALITY[tier].decals} · heap +${((hmax - h0) / 1024) | 0} KB`
  }
  requestAnimationFrame(loop)
}
