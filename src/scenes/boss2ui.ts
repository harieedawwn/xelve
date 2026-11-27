// Đống arena DOM + the sticky note: boss bar, HP pips, voice message 6 (typed subtitle + waveform), white-out, chapter card.
import * as THREE from 'three'
import { DONG } from '../bosses/dong'
import { el, ICON } from '../ui/dom'
import { t } from '../i18n'

export function bossHud() {
  const ui = document.getElementById('ui')!
  const bar = el('div', 'bossbar'), fill = el('div', 'fill'), track = el('div', 'track'), ticks = el('div', 'ticks')
  for (const f of DONG.phaseAt) { const i = el('i'); i.style.left = `${f * 100}%`; ticks.append(i) }
  track.append(fill); bar.append(el('b', '', t('boss.dong')), track, ticks)
  const pips = el('div', 'hp'); for (let i = 0; i < 6; i++) pips.append(el('i'))
  ui.append(bar, pips)
  let last = -1
  return {
    setBoss(f: number) { const v = Math.round(Math.max(0, Math.min(1, f)) * 500) / 500; if (v !== last) { last = v; fill.style.transform = `scaleX(${v})` } },
    setPips(n: number) { pips.querySelectorAll('i').forEach((e, i) => e.classList.toggle('off', i >= n)) },
    hide() { bar.style.display = 'none' },
  }
}

const WAVE = '<svg viewBox="0 0 24 24"><path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2"/></svg>'
export function endingUi() {
  const ui = document.getElementById('ui')!
  return {
    whiteout(sec: number) { const w = el('div', 'whiteout'); w.style.transitionDuration = `${sec}s`; ui.append(w); requestAnimationFrame(() => w.classList.add('show')) },
    /** voice message 6: waveform + time, typed at reading speed; the line breaks off into static */
    voice(onStatic: () => void) {
      const v = el('div', 'voice'), head = el('div', 'vh', WAVE + `<span>${t('msg.6.time')}</span>`), line = el('p')
      v.append(head, line); ui.append(v); requestAnimationFrame(() => v.classList.add('show'))
      const full = t('msg.6'); let i = 0
      const tick = setInterval(() => {
        line.textContent = full.slice(0, ++i)
        if (i >= full.length) { clearInterval(tick); setTimeout(() => { v.classList.add('static'); onStatic() }, 350); setTimeout(() => v.classList.remove('show'), 4200) }
      }, 55)
      v.addEventListener('pointerdown', () => { i = full.length - 1 })
    },
    card() {
      const c = el('div', 'chcard'), h = el('h2', '', t('chapter.2')), s = el('p', '', t('locked.soon'))
      const again = el('button', 'btn', ICON.restart + t('menu.restart')); again.onclick = () => location.reload()
      c.append(h, s, again); ui.append(c); requestAnimationFrame(() => c.classList.add('show'))
    },
  }
}

/** Ve's sticky note from the dashboard: orange square, her handwriting in ink (text from i18n) */
export function noteMesh() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128
  const g = cv.getContext('2d')!
  g.fillStyle = '#E8590C'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#C94E0A'; g.fillRect(0, 0, 128, 14)
  g.fillStyle = '#16161A'; g.font = "600 15px 'Be Vietnam Pro', system-ui, sans-serif"; g.textBaseline = 'top'
  const words = t('note.l8').split(' '); let line = '', y = 30
  for (const w of words) { const tryL = line ? line + ' ' + w : w; if (g.measureText(tryL).width > 104) { g.fillText(line, 12, y); line = w; y += 22 } else line = tryL }
  g.fillText(line, 12, y)
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshBasicMaterial({ map: tex }))
  m.position.set(0, -0.7, -0.42); m.renderOrder = 10
  return m
}
