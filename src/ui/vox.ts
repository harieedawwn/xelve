// Selection = the orange voxel (DESIGN.md#ui): one square per screen that snaps next to the focused / touched
// slab (transform transition 160 ms); the focused slab gets `.fx` (shifts 6px along its skew).
import { el } from './dom'

export function voxel(scope: HTMLElement, pick = 'button:not(.locked):not([aria-disabled=true])') {
  const v = el('i', 'vox'); scope.appendChild(v)
  let cur: HTMLElement | null = null
  const place = () => {
    if (!cur || !cur.isConnected) return
    const r = cur.getBoundingClientRect(), s = scope.getBoundingClientRect(), z = v.offsetWidth || 12
    v.style.transform = `translate(${Math.round(r.left - s.left - z - 6)}px, ${Math.round(r.top - s.top - z * 0.4)}px)`
    v.style.opacity = '1'
  }
  const to = (b: HTMLElement | null) => {
    if (!b || b === cur) return
    cur?.classList.remove('fx'); cur = b; b.classList.add('fx'); place()
  }
  const near = (e: Event) => { const b = (e.target as HTMLElement).closest?.(pick) as HTMLElement | null; if (b && scope.contains(b)) to(b) }
  scope.addEventListener('pointerover', near); scope.addEventListener('focusin', near)
  addEventListener('resize', place)
  return { to, place }
}
