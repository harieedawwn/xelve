// DOM layer: title logo, HUD, eyelids, end card, rotate overlay. All text here moves to src/i18n/vi.ts in P0.
import { Tier } from './palette'

export const T = {
  tap: 'Chạm để bắt đầu',
  low: 'Thấp', mid: 'Trung bình', high: 'Cao',
  end: 'Hết bản chơi thử', again: 'Chơi lại',
  sound: 'Âm thanh', restart: 'Chơi lại',
}

const GLYPHS: Record<string, string[]> = {
  X: ['1...1', '.1.1.', '..v..', '.1.1.', '1...1'],
  E: ['11111', '1....', '1111.', '1....', '11111'],
  L: ['1....', '1....', '1....', '1....', '11111'],
  V: ['1...1', '1...1', '.1.1.', '.1.1.', '..1..'],
}

const ICON = {
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9v6M19 7v10"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6"/></svg>',
  restart: '<svg viewBox="0 0 24 24"><path d="M5 5v5h5"/><path d="M5.5 10A7 7 0 1 1 7 17"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path d="M8 3h8v18H8z"/><path d="M11 18h2"/></svg>',
}

const el = (tag: string, cls = '', html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e }

export class UI {
  root = document.getElementById('ui')!
  lidT = el('div', 'lid t'); lidB = el('div', 'lid b')
  hp = el('div', 'hp'); bar = el('div', 'bar'); card = el('div', 'card')
  title = el('div', 'title')
  private seg = el('div', 'seg'); private muteBtn = el('button', 'ib')
  onTier: (t: Tier) => void = () => {}
  onMute: (m: boolean) => void = () => {}
  onRestart: () => void = () => {}
  onClick: () => void = () => {}

  constructor(tier: Tier) {
    // title: XELVE assembles from voxels
    const logo = el('div', 'logo'); let k = 0
    for (const ch of 'XELVE') {
      const g = el('div', 'glyph')
      for (const row of GLYPHS[ch]) for (const c of row) {
        const b = el('b', c === '.' ? 'x' : c === 'v' ? 'v' : ''); b.style.animationDelay = `${(k++ % 25) * 18 + Math.random() * 300}ms`; g.appendChild(b)
      }
      logo.appendChild(g)
    }
    this.title.append(logo, el('div', 'tap', T.tap))
    // HUD
    for (let i = 0; i < 6; i++) this.hp.appendChild(el('i'))
    const tiers: [Tier, string][] = [['thap', T.low], ['tb', T.mid], ['cao', T.high]]
    for (const [t, label] of tiers) {
      const b = el('button', t === tier ? 'on' : '', label) as HTMLButtonElement
      b.onclick = (e) => { e.stopPropagation(); this.seg.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); this.onClick(); this.onTier(t) }
      this.seg.appendChild(b)
    }
    let muted = false
    this.muteBtn.innerHTML = ICON.sound; this.muteBtn.setAttribute('aria-label', T.sound)
    this.muteBtn.onclick = (e) => { e.stopPropagation(); muted = !muted; this.muteBtn.innerHTML = muted ? ICON.mute : ICON.sound; this.onClick(); this.onMute(muted) }
    const rs = el('button', 'ib', ICON.restart); rs.setAttribute('aria-label', T.restart)
    rs.onclick = (e) => { e.stopPropagation(); this.onClick(); this.onRestart() }
    this.bar.append(this.seg, this.muteBtn, rs)
    this.card.innerHTML = `<h2>${T.end}</h2>`
    const again = el('button', 'btn', ICON.restart + T.again); again.onclick = (e) => { e.stopPropagation(); this.onClick(); this.onRestart() }
    this.card.appendChild(again)
    const rot = el('div', 'rotate', ICON.phone)
    this.root.append(this.lidT, this.lidB, this.hp, this.bar, this.card, this.title, rot)
    this.hud(false)
  }

  hud(show: boolean) { this.hp.style.display = this.bar.style.display = show ? '' : 'none' }
  setHP(n: number) { this.hp.querySelectorAll('i').forEach((e, i) => e.classList.toggle('off', i >= n)) }
  setLid(v: number) { this.lidT.style.transform = `scaleY(${v})`; this.lidB.style.transform = `scaleY(${v})` }
  showCard(s: boolean) { this.card.classList.toggle('show', s); this.card.style.pointerEvents = s ? 'auto' : 'none' }
  hideTitle() { this.title.classList.add('out'); setTimeout(() => this.title.remove(), 600) }
}
