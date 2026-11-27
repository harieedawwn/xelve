// Main screen (levels.md#app-flow): live backdrop = last cleared location in white; Tiếp tục bottom-right, icon row bottom-left.
import * as THREE from 'three'
import type { Renderer } from '../render/pipeline'
import type { Audio } from '../audio/engine'
import { save } from '../core/save'
import { settings, onSettings } from '../core/settings'
import { startLoop } from '../core/loop'
import { QUALITY } from '../core/quality'
import { buildCorridor } from '../levels/corridor'
import { buildRoom } from '../levels/rooms'
import { CH1, level } from '../levels/ch1'
import { UI } from '../ui/ui'
import { el, ICON } from '../ui/dom'
import { wipe } from '../ui/wipe'
import { t } from '../i18n'
import { menuAccess, resumeLevel } from './menuLogic'
import { chapterMap, glossary } from './menuSheets'
import { Forge } from '../forge/forge'
import { BLUEPRINTS } from '../weapon/blueprints/registry'
import { khoiSize } from '../weapon/economy'

const go = (q: string) => wipe(1, () => { location.href = `${location.pathname}${q}` })

export function startMenu(canvas: HTMLCanvasElement, renderer: Renderer, ui: UI, audio: Audio) {
  ui.hideTitle(); ui.hud(false); ui.setLid(0)
  const s = save(), acc = menuAccess(s)
  const tier = settings().tier ?? 'tb'
  renderer.resize(tier)
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.05, 60)
  const last = level(Math.max(1, s.progress.level)) ?? CH1[0]
  const room = last.boss ? 'alley' : last.room
  if (room === 'corridor') buildCorridor(scene); else buildRoom(scene, room)
  scene.add(cam)
  addEventListener('resize', () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); renderer.resize(settings().tier ?? tier) })
  onSettings(st => { audio.setMuted(!st.sound); audio.setMusic(st.music); if (st.tier) renderer.resize(st.tier) })
  addEventListener('pointerdown', () => audio.unlock(), { once: true })
  void QUALITY

  // ---- DOM
  const root = el('div', 'menu')
  const btn = (cls: string, icon: string, label: string, on: () => void, locked = false) => {
    const b = el('button', cls + (locked ? ' locked' : ''), icon + (locked ? `<small>${t('locked.soon')}</small>` : ''))
    b.setAttribute('aria-label', label); b.title = label
    if (locked) b.setAttribute('aria-disabled', 'true')
    b.onclick = (e) => { e.stopPropagation(); audio.ui(); if (!locked) on() }
    return b
  }
  const next = resumeLevel(s)
  const cont = btn('btn big', ICON.play + `<span>${t('menu.continue')}</span><small>${t('map.chapter1')} · ${t(next.name as any)}</small>`, t('menu.continue'), () => go(`?level=${next.id}&go=1`))
  const row = el('div', 'iconrow')
  const openForge = () => {
    ui.hud(false)
    const f = new Forge({ khoiSize: khoiSize(save()), unlocked: Object.keys(BLUEPRINTS).filter(k => save().unlocked.includes(k)), onBack: () => { f.root.remove() }, onSound: (n, p) => audio.play(n, p) })
    ui.root.appendChild(f.root)
  }
  row.append(
    btn('ib lg', ICON.forge, t('forge.title'), openForge, !acc.forge),
    btn('ib lg', ICON.gym, t('menu.gym'), () => go('?enemies'), !acc.gym),
    btn('ib lg', ICON.endless, t('menu.endless'), () => go('?endless'), !acc.endless),
    btn('ib lg', ICON.map, t('menu.map'), () => map.show(true)),
    btn('ib lg', ICON.book, t('menu.terms'), () => terms.show(true)),
    btn('ib lg', ICON.settings, t('menu.settings'), () => ui.settings.show(true)),
  )
  const map = chapterMap(s, (id) => go(`?level=${id}&go=1`), () => audio.ui())
  const terms = glossary(() => audio.ui())
  root.append(row, cont)
  ui.root.append(root, map.root, terms.root)
  ;(window as any).__menu = { acc, next: next.id }

  // ---- backdrop: slow authored drift, no player control
  let tt = 0
  startLoop({
    step: (h) => { tt += h; cam.position.set(Math.sin(tt * 0.15) * 0.35, 1.55 + Math.sin(tt * 0.3) * 0.03, -2 - ((tt * 0.25) % 6)); cam.lookAt(Math.sin(tt * 0.1) * 0.6, 1.3, cam.position.z - 6) },
    render: () => renderer.render(scene, cam),
    fpsCap: () => (settings().tier === 'thap' ? 30 : 60),
  })
}
