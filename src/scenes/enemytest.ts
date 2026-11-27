// Phòng tập (dev, open with ?enemies): spawn each enemy type, swing with the finger, watch telegraphs. Labels are dev-only.
import * as THREE from 'three'
import { Renderer } from '../render/pipeline'
import { FX } from '../render/fx'
import { buildCorridor } from '../levels/corridor'
import { Weapon } from '../combat/weapon'
import { PROFILES } from '../combat/profiles'
import { equippedDesign } from '../weapon/store'
import { sweep, spreadBurn } from '../combat/sweep'
import { materialDemo, neckDemo } from '../weapon/demo'
import { MATERIALS } from '../weapon/materials/registry'
import { Bus } from '../combat/bus'
import { Audio } from '../audio/engine'
import { ENEMIES } from '../enemies/registry'
import type { Enemy } from '../enemies/base'
import { startLoop } from '../core/loop'
import { bindFinger } from '../core/input'
import { Time } from '../core/time'
import { ICON } from '../ui/dom'
import { wipe } from '../ui/wipe'
import { t, Key } from '../i18n'

export function startEnemyTest(canvas: HTMLCanvasElement, renderer: Renderer, audio: Audio) {
  renderer.resize('tb')
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 50)
  cam.position.set(0, 1.5, 0); scene.add(cam)
  buildCorridor(scene)
  const fx = new FX(scene), weapon = new Weapon(cam), bus = new Bus(), time = new Time()
  const w = new URLSearchParams(location.search).get('weapon'); if (w && PROFILES[w]) weapon.setProfile(PROFILES[w]); else { const d = equippedDesign(); if (d) weapon.setDesign(d) }
  (window as any).__xelve = { weapon }
  let enemies: Enemy[] = [], hits = 0, kills = 0, hp = 6
  const player = new THREE.Vector3(0, 0, 0)
  bindFinger(canvas, weapon.finger, (d) => { weapon.touching = d })
  addEventListener('pointerdown', () => audio.unlock(), { once: true })
  bus.on('hit', (e) => {
    if (e.blocked) { audio.play('hit.metal'); time.freeze(0.04); return }
    hits++; if (e.killed) { kills++; audio.kill() } else audio.hit(e.dmg / 10, e.head)
    time.freeze(e.killed ? 0.09 : 0.06)
  })

  bus.on('break', () => { audio.play('hit.heavy'); time.freeze(0.12) })
  const wire = (e: Enemy) => { e.onSound = (n) => audio.play(n); e.onSpawn = (k) => { wire(k); enemies.push(k) } }
  const spawn = (id: string, n = 1) => {
    for (let i = 0; i < n; i++) {
      const e = ENEMIES[id](scene, new THREE.Vector3((Math.random() - 0.5) * 1.6, 0, -7 - Math.random() * 3))
      e.slotX = n === 1 ? 0 : (i - (n - 1) / 2) * 0.5; wire(e); enemies.push(e); audio.play('bong.appear')
    }
  }
  const bar = document.createElement('div')
  bar.style.cssText = 'position:fixed;left:0;top:0;right:0;display:flex;flex-wrap:wrap;gap:4px;padding:4px;z-index:50;font:12px monospace'
  const info = document.createElement('div'); info.style.cssText = 'position:fixed;left:4px;bottom:4px;z-index:50;font:12px monospace;background:#16161a;color:#ecebe6;padding:2px 6px'
  document.body.append(bar, info)
  const btn = (label: string, on: () => void) => {
    const b = document.createElement('button'); b.textContent = label; b.dataset.en = label
    b.style.cssText = 'min-height:40px;min-width:48px;padding:0 8px;border:2px solid #16161a;background:#ecebe6;color:#16161a;font:inherit;border-radius:0'
    b.onclick = on; bar.append(b)
  }
  const home = document.createElement('button'); home.innerHTML = ICON.back; home.setAttribute('aria-label', t('menu.home')); home.className = 'ib'
  home.onclick = () => wipe(1, () => { location.href = `${location.pathname}?menu` }); bar.append(home)
  const pb = (label: string, on: () => void) => { const b = document.createElement('button'); b.textContent = label; b.className = 'tg'; b.onclick = on; bar.append(b) }
  Object.keys(ENEMIES).forEach(id => pb(t(`enemy.${id}` as Key), () => spawn(id)))
  pb(`${t('enemy.bong')} ×5`, () => spawn('bong', 5)); pb(t('gym.clear'), () => { enemies.forEach(e => e.alive && scene.remove(e.root)); enemies = [] })
  // material demos (dev labels): each pole carries one material in its effect region; "bua" = heavy head on a thin handle (snaps once)
  if (location.search.includes('dev')) Object.keys(MATERIALS).forEach(id => btn('mat:' + id, () => weapon.setDesign(materialDemo(id))))
  if (location.search.includes('dev')) { btn('bua gãy', () => weapon.setDesign(neckDemo())); btn('restore', () => weapon.restore()) }
  addEventListener('resize', () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); renderer.resize('tb') })

  const strike = () => { hp = hp <= 1 ? 6 : hp - 1; audio.playerHurt() }
  startLoop({
    step: (h) => {
      const dt = time.tick(h, () => {}), now = time.now
      weapon.update(time.hitstop > 0 ? 0 : h, now)
      for (const e of enemies) e.update(dt, player, strike)
      sweep(weapon, enemies, fx, bus); spreadBurn(enemies)
      audio.swing(weapon.touching ? weapon.tipSpeed : 0, time.scale)
      fx.update(dt, now)
    },
    render: () => {
      renderer.render(scene, cam)
      info.textContent = `alive ${enemies.filter(e => e.alive).length} · hits ${hits} · kills ${kills} · hp ${hp} · ${enemies.filter(e => e.alive).map(e => (e.status.bleeding ? 'M' : '') + (e.status.burning ? 'B' : '') + (e.status.frozen ? 'Đ' : '') + (e.status.stunned ? 'C' : '')).filter(Boolean).join(' ')}`
    },
    fpsCap: () => 60,
  })
  ;(window as any).__en = { spawn, enemies: () => enemies, get stats() { return { hits, kills, hp } } }
}
