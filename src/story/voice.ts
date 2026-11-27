// Voice messages 1–6 (story.md): bottom-centre subtitle typed at reading speed, waveform + time, tap to finish, hold 0.6 s to skip.
import { el } from '../ui/dom'
import { t, Key } from '../i18n'

const WAVE = '<svg viewBox="0 0 24 24"><path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2"/></svg>'
export const CPS = 18 // characters per second

/** how long a message stays on screen (typing + read time), seconds */
export const voiceSeconds = (id: number) => t(`msg.${id}` as Key).length / CPS + 2.2

/** plays message `id`; returns a promise that resolves when it is gone. `ending` = break off into static (message 6). */
export function playVoice(id: number, onDone: () => void = () => {}, ending = false) {
  const ui = document.getElementById('ui')!
  const v = el('div', 'voice'), head = el('div', 'vh', WAVE + `<span>${t(`msg.${id}.time` as Key)}</span>`), line = el('p')
  const ring = el('i', 'ring'); v.append(head, line, ring); ui.append(v)
  requestAnimationFrame(() => v.classList.add('show'))
  const full = t(`msg.${id}` as Key); let i = 0, done = false, hold = 0
  const finish = () => { if (done) return; done = true; clearInterval(tick); clearInterval(holdT); v.classList.remove('show'); setTimeout(() => { v.remove(); onDone() }, 320) }
  const tick = setInterval(() => {
    line.textContent = full.slice(0, ++i)
    if (i >= full.length) {
      clearInterval(tick)
      if (ending) { setTimeout(() => v.classList.add('static'), 350) }
      setTimeout(finish, ending ? 4200 : 2200)
    }
  }, 1000 / CPS)
  // tap = show all text, hold 0.6 s = skip (ring fills)
  const holdT = setInterval(() => { if (hold > 0) { hold += 0.05; ring.style.transform = `scaleX(${Math.min(1, hold / 0.6)})`; if (hold >= 0.6) finish() } }, 50)
  v.addEventListener('pointerdown', () => { i = Math.max(i, full.length - 1); hold = 0.05 })
  const up = () => { hold = 0; ring.style.transform = 'scaleX(0)' }
  v.addEventListener('pointerup', up); v.addEventListener('pointercancel', up); v.addEventListener('pointerleave', up)
  return finish
}
