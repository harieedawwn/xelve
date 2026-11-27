// Left-thumb contextual buttons (combat.md#1): Đỡ (hold), ‹ › Né, ↑ leap — shown only when the context allows them — and the Lực bar.
// Buttons fire on pointerdown (timing matters for Phản đòn); Đỡ releases on up/cancel. Text from i18n.
import { t } from '../i18n'
import { el } from './dom'

const SVG = {
  left: '<svg viewBox="0 0 24 24"><path d="M15 4l-8 8 8 8"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M9 4l8 8-8 8"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M4 15l8-8 8 8"/></svg>',
}

export interface PadHandlers { block(down: boolean): void; dodge(side: -1 | 1): void; leap(): void }
export interface PadShow { block: boolean; dodge: boolean; leap: boolean; luc: boolean }

export class CombatPad {
  root = el('div', 'pad')
  luc = el('div', 'luc'); private fill = el('i')
  private b: Record<'block' | 'left' | 'right' | 'leap', HTMLElement>
  private shown: PadShow = { block: false, dodge: false, leap: false, luc: false }

  constructor(h: PadHandlers) {
    const mk = (cls: string, html: string, label: string) => { const b = el('button', 'pb ' + cls, html); b.setAttribute('aria-label', label); return b }
    this.b = {
      left: mk('l', SVG.left, t('act.dodgeL')), block: mk('blk', `<span>${t('act.block')}</span>`, t('act.block')),
      right: mk('r', SVG.right, t('act.dodgeR')), leap: mk('up', SVG.up, t('act.leap')),
    }
    const down = (b: HTMLElement, f: () => void) => b.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); try { b.setPointerCapture(e.pointerId) } catch { /* synthetic pointer */ } b.classList.add('on'); f() })
    const up = (b: HTMLElement, f?: () => void) => { const u = () => { if (!b.classList.contains('on')) return; b.classList.remove('on'); f?.() }; b.addEventListener('pointerup', u); b.addEventListener('pointercancel', u); b.addEventListener('lostpointercapture', u) }
    down(this.b.block, () => h.block(true)); up(this.b.block, () => h.block(false))
    down(this.b.left, () => h.dodge(-1)); up(this.b.left)
    down(this.b.right, () => h.dodge(1)); up(this.b.right)
    down(this.b.leap, () => h.leap()); up(this.b.leap)
    this.root.append(this.b.leap, this.b.left, this.b.block, this.b.right)
    this.luc.setAttribute('aria-label', t('hud.luc')); this.luc.appendChild(this.fill)
    this.set({ block: false, dodge: false, leap: false, luc: false })
  }

  /** contextual visibility; hidden buttons keep their slot so the thumb map never shifts */
  set(s: PadShow) {
    this.shown = s
    this.b.block.classList.toggle('hide', !s.block)
    this.b.left.classList.toggle('hide', !s.dodge); this.b.right.classList.toggle('hide', !s.dodge)
    this.b.leap.classList.toggle('hide', !s.leap)
    this.root.style.display = s.block || s.dodge || s.leap ? '' : 'none'
    this.luc.style.display = s.luc ? '' : 'none'
  }
  get state() { return this.shown }
  /** Lực 0..1; full = solid with a notch */
  setLuc(v: number) { this.fill.style.transform = `scaleX(${Math.max(0, Math.min(1, v)).toFixed(3)})`; this.luc.classList.toggle('full', v >= 1) }
  /** brief press-in on a button the game answered (Phản đòn lands etc.) */
  pulse(which: 'block' | 'left' | 'right') { const b = this.b[which]; b.classList.remove('hitp'); void b.offsetWidth; b.classList.add('hitp') }
}
