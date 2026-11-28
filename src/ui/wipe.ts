// "Chém màn" (DESIGN.md#ui): leaving a screen, two ink halves close along a diagonal seam (260 ms) and `mid` runs;
// the next screen (same page with `out`, or the next page load via reveal()) gets a slash along the seam (220 ms),
// then the halves slide apart (380 ms). dir -1 = back (mirrored seam). Tap skips. Reduced motion: 150 ms crossfade.
import { el } from './dom'

const KEY = 'xelve.cut'
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
let pending: HTMLElement | null = null

function build(dir: 1 | -1) {
  const host = el('div', 'cut' + (dir < 0 ? ' rev' : '') + (reduced() ? ' rm' : ''))
  // seam runs from (0, 62.4%) to (100%, 38.4%) of the viewport: angle and length follow the aspect
  const dy = innerHeight * 0.24, w = innerWidth
  host.style.setProperty('--ang', `${(-Math.atan2(dy, w) * 180 / Math.PI).toFixed(2)}deg`)
  host.style.setProperty('--len', `${Math.hypot(w, dy) + 4}px`)
  host.append(el('i', 'h a'), el('i', 'h b'), el('b', 'sl'))
  document.body.appendChild(host)
  return host
}

function open(host: HTMLElement) {
  if (!host.isConnected) return
  const end = () => host.remove()
  host.onpointerdown = end
  if (host.classList.contains('rm')) { host.classList.remove('shut'); setTimeout(end, 170); return }
  host.classList.add('slash')
  setTimeout(() => { host.classList.add('open'); host.classList.remove('shut') }, 220)
  setTimeout(end, 220 + 400)
}

export function wipe(dir: 1 | -1, mid: () => void, out = false) {
  try { sessionStorage.setItem(KEY, String(dir)) } catch { /* private mode */ }
  const host = build(dir); host.classList.add('closing')
  let done = false
  const fire = () => {
    if (done) return; done = true; mid()
    if (out) { try { sessionStorage.removeItem(KEY) } catch { /* */ } host.classList.remove('closing'); open(host) }
  }
  host.onpointerdown = fire
  requestAnimationFrame(() => requestAnimationFrame(() => host.classList.add('shut')))
  setTimeout(fire, reduced() ? 160 : 280)
}

/** call first thing on page load: if the last page left with a cut, start covered (opened by cutOpen) */
export function reveal() {
  let v: string | null = null
  try { v = sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY) } catch { /* */ }
  if (!v) return
  const host = build(v === '-1' ? -1 : 1); host.classList.add('shut'); pending = host
  host.onpointerdown = () => cutOpen()
  setTimeout(cutOpen, 3000) // never leave the screen covered
}
/** the new screen is ready: slash + split */
export function cutOpen() { const h = pending; pending = null; if (h) open(h) }
