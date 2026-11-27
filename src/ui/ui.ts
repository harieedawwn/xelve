// DOM layer: title logo, HUD, eyelids, end card, rotate overlay. All text from src/i18n.
import { t } from '../i18n'
import { el, ICON } from './dom'
import { SettingsPanel } from './settingsPanel'

const GLYPHS: Record<string, string[]> = {
  X: ['1...1', '.1.1.', '..v..', '.1.1.', '1...1'],
  E: ['11111', '1....', '1111.', '1....', '11111'],
  L: ['1....', '1....', '1....', '1....', '11111'],
  V: ['1...1', '1...1', '.1.1.', '.1.1.', '..1..'],
}

export function buildLogo(): HTMLElement {
  const logo = el('div', 'logo'); let k = 0
  for (const ch of 'XELVE') {
    const g = el('div', 'glyph')
    for (const row of GLYPHS[ch]) for (const c of row) {
      const b = el('b', c === '.' ? 'x' : c === 'v' ? 'v' : ''); b.style.animationDelay = `${(k++ % 25) * 18 + ((k * 37) % 300)}ms`; g.appendChild(b)
    }
    logo.appendChild(g)
  }
  return logo
}

export class UI {
  root = document.getElementById('ui')!
  lidT = el('div', 'lid t'); lidB = el('div', 'lid b')
  hp = el('div', 'hp'); bar = el('div', 'bar'); card = el('div', 'card')
  title = el('div', 'title')
  settings = new SettingsPanel()
  ready = false
  onRestart: () => void = () => {}
  onClick: () => void = () => {}

  constructor() {
    this.title.append(buildLogo(), el('div', 'tap', t('title.tap')))
    const tset = el('button', 'ib corner', ICON.settings); tset.setAttribute('aria-label', t('menu.settings'))
    tset.onclick = (e) => { e.stopPropagation(); this.onClick(); this.settings.show(true) }
    this.title.appendChild(tset)
    for (let i = 0; i < 6; i++) this.hp.appendChild(el('i'))
    const gear = el('button', 'ib', ICON.settings); gear.setAttribute('aria-label', t('menu.settings'))
    gear.onclick = (e) => { e.stopPropagation(); this.onClick(); this.settings.show(true) }
    const rs = el('button', 'ib', ICON.restart); rs.setAttribute('aria-label', t('menu.restart'))
    rs.onclick = (e) => { e.stopPropagation(); this.onClick(); this.onRestart() }
    this.bar.append(gear, rs)
    this.card.innerHTML = `<h2>${t('end.title')}</h2>`
    const again = el('button', 'btn', ICON.restart + t('menu.restart')); again.onclick = (e) => { e.stopPropagation(); this.onClick(); this.onRestart() }
    this.card.appendChild(again)
    const rot = el('div', 'rotate', ICON.phone + `<p>${t('rotate.hint')}</p>`)
    this.settings.onClick = () => this.onClick()
    this.root.append(this.lidT, this.lidB, this.hp, this.bar, this.card, this.title, this.settings.root, rot)
    this.hud(false)
  }

  setReady() { this.ready = true; this.title.classList.add('ready') }
  hud(show: boolean) { this.hp.style.display = this.bar.style.display = show ? '' : 'none' }
  setHP(n: number) { this.hp.querySelectorAll('i').forEach((e, i) => e.classList.toggle('off', i >= n)) }
  setLid(v: number) { this.lidT.style.transform = `scaleY(${v})`; this.lidB.style.transform = `scaleY(${v})` }
  showCard(s: boolean) { this.card.classList.toggle('show', s); this.card.style.pointerEvents = s ? 'auto' : 'none' }
  hideTitle() { this.title.classList.add('out'); setTimeout(() => this.title.remove(), 600) }
}
