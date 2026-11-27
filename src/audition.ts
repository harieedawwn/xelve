// Dev-only audition page (/audition.html). Labels are dev text, not player-facing.
import { Audio, RECIPES } from './audio/engine'
import { SPACES } from './audio/reverb'

const a = new Audio(); const app = document.getElementById('app')!
const ensure = () => a.unlock()
const sec = (title: string) => { const h = document.createElement('h2'); h.textContent = title; const r = document.createElement('div'); r.className = 'row'; app.append(h, r); return r }
const btn = (row: HTMLElement, label: string, fn: () => void) => {
  const b = document.createElement('button'); b.textContent = label
  b.onclick = () => { ensure(); fn() }; row.append(b)
}

// whoosh by speed slider
const w = sec('Vung vũ khí (tốc độ đầu vũ khí)')
const lab = document.createElement('label'); const sl = document.createElement('input'); sl.type = 'range'; sl.min = '0'; sl.max = '12'; sl.step = '0.1'; sl.value = '0'
const out = document.createElement('span'); out.textContent = '0 m/s'; lab.append(sl, out); w.append(lab)
let tick = 0
sl.oninput = () => { ensure(); out.textContent = sl.value + ' m/s'; a.swing(+sl.value, 1); clearTimeout(tick); tick = window.setTimeout(() => { sl.value = '0'; out.textContent = '0 m/s'; a.swing(0, 1) }, 1500) }
sl.onpointerup = () => { a.swing(0, 1); sl.value = '0'; out.textContent = '0 m/s' }

const groups: [string, string][] = [
  ['Va chạm theo vật liệu', 'hit.'], ['Bước chân theo nền', 'step.'], ['Giao diện', 'ui.'], ['Bóng', 'bong.'], ['Khác', ''],
]
const used = new Set<string>()
for (const [title, pre] of groups) {
  const row = sec(title)
  for (const [name, d] of Object.entries(RECIPES)) {
    if (used.has(name)) continue
    if (pre ? !name.startsWith(pre) : false) continue
    used.add(name)
    if (d.variants) for (let v = 0; v < d.variants; v++) btn(row, `${name} ${v + 1}`, () => { a.play(name, 1, v) })
    else btn(row, name, () => { a.play(name, 1) })
  }
}
const sm = sec('Slow-mo')
btn(sm, 'slow vào', () => a.slowIn()); btn(sm, 'slow ra', () => a.slowOut())
const rv = sec('Không gian (reverb) — rồi bấm hit.stone')
for (const k of Object.keys(SPACES)) btn(rv, k, () => { a.setSpace(k); a.play('hit.stone', 1, 0) })
