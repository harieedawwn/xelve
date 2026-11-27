// Voxel wipe: squares fill the screen in the given direction (1 = left→right, -1 = right→left), 450 ms.
// Transforms only. Calls `mid` when the screen is covered; `out` true wipes back out afterwards.
import { el } from './dom'
export function wipe(dir: 1 | -1, mid: () => void, out = false) {
  const cols = 16, rows = 9, host = el('div', 'wipe')
  host.style.gridTemplateColumns = `repeat(${cols}, 1fr)`; host.style.gridTemplateRows = `repeat(${rows}, 1fr)`
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const b = el('i'); const k = dir === 1 ? c : cols - 1 - c
    b.style.transitionDelay = `${k * 17 + ((r * 7 + c * 3) % 5) * 9}ms`; host.appendChild(b)
  }
  document.body.appendChild(host)
  requestAnimationFrame(() => requestAnimationFrame(() => host.classList.add('in')))
  setTimeout(() => {
    mid()
    if (out) { host.classList.add('out'); host.classList.remove('in'); setTimeout(() => host.remove(), 700) }
  }, 450)
}
