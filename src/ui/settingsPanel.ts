// Cài đặt sheet: Đồ hoạ, Âm thanh, Nhạc, Giảm rung camera, Ngôn ngữ. DOM over canvas.
import { t } from '../i18n'
import { TIERS, Tier } from '../core/quality'
import { settings, setSetting } from '../core/settings'
import { el, ICON } from './dom'

export class SettingsPanel {
  root = el('div', 'sheet')
  onClick: () => void = () => {}
  private tierBtns: Record<string, HTMLElement> = {}

  constructor() {
    const box = el('div', 'sheet-box')
    const head = el('div', 'sheet-head'); head.appendChild(el('h2', '', t('menu.settings')))
    const close = el('button', 'ib', ICON.close); close.setAttribute('aria-label', t('menu.close'))
    close.onclick = (e) => { e.stopPropagation(); this.onClick(); this.show(false) }
    head.appendChild(close)
    const s = settings()
    const seg = el('div', 'seg')
    for (const k of TIERS) {
      const b = el('button', '', t(`tier.${k}` as 'tier.thap')) as HTMLButtonElement
      b.onclick = (e) => { e.stopPropagation(); this.onClick(); setSetting('tier', k); this.sync() }
      this.tierBtns[k] = b; seg.appendChild(b)
    }
    const rows = el('div', 'rows')
    rows.append(
      this.row(t('settings.graphics'), seg),
      this.row(t('settings.sound'), this.toggle('sound')),
      this.row(t('settings.music'), this.slider()),
      this.row(t('settings.reduceShake'), this.toggle('reduceShake')),
      this.row(t('settings.language'), this.lang()),
    )
    box.append(head, rows); this.root.appendChild(box)
    this.root.onclick = (e) => { if (e.target === this.root) this.show(false) }
    void s; this.sync()
  }

  private row(label: string, ctl: HTMLElement) { const r = el('div', 'row'); r.append(el('span', 'lbl', label), ctl); return r }
  private toggle(k: 'sound' | 'reduceShake') {
    const b = el('button', 'tg') as HTMLButtonElement
    b.onclick = (e) => { e.stopPropagation(); this.onClick(); setSetting(k, !settings()[k]); this.sync() }
    b.dataset.k = k; return b
  }
  private slider() {
    const i = el('input', 'rng') as HTMLInputElement; i.type = 'range'; i.min = '0'; i.max = '100'
    i.value = String(Math.round(settings().music * 100)); i.setAttribute('aria-label', t('settings.music'))
    i.oninput = () => setSetting('music', +i.value / 100); i.onclick = (e) => e.stopPropagation(); return i
  }
  private lang() {
    const seg = el('div', 'seg')
    const vi = el('button', 'on', t('lang.vi'))
    const en = el('button', 'locked', ICON.lock + `<span>${t('lang.en')}</span><small>${t('locked.soon')}</small>`)
    en.setAttribute('aria-disabled', 'true')
    seg.append(vi, en); return seg
  }
  sync() {
    const s = settings()
    for (const k of TIERS) this.tierBtns[k].classList.toggle('on', s.tier === k)
    this.root.querySelectorAll<HTMLElement>('.tg').forEach(b => {
      const on = !!s[b.dataset.k as 'sound' | 'reduceShake']
      b.classList.toggle('on', on); b.textContent = on ? t('toggle.on') : t('toggle.off')
      b.setAttribute('aria-pressed', String(on))
    })
  }
  show(v: boolean) { this.root.classList.toggle('show', v) }
  setTier(k: Tier) { void k; this.sync() }
}
