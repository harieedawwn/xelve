// Impacts per material: transient + body + low (+ extra), 3 variants each.
import type { Def, Recipe } from '../synth'

const flesh: Recipe = (s, t, v, p) => {
  const k = [1, 0.85, 1.2][v]
  s.hit(t, 0.012, 'highpass', 3200 * k, 0.7, 0.5 * p)
  s.tone(t, 'triangle', 150 * k, 80, 0.12, 0.55 * p)
  s.tone(t, 'sine', 62, 40, 0.22, 0.6 * p)
  s.hit(t + 0.004, 0.14, 'bandpass', 1100 * k, 1.2, 0.35 * p, 380)
}
const metal: Recipe = (s, t, v, p) => {
  const f = [1180, 1560, 930][v]
  s.hit(t, 0.008, 'highpass', 4500, 0.7, 0.55 * p)
  s.tone(t, 'sine', f, f * 0.985, 0.55, 0.28 * p)
  s.tone(t, 'sine', f * 2.76, f * 2.7, 0.3, 0.14 * p)
  s.tone(t, 'sine', 80, 50, 0.14, 0.45 * p)
}
const glass: Recipe = (s, t, v, p) => {
  s.hit(t, 0.01, 'highpass', 6000, 0.7, 0.5 * p)
  s.hit(t, 0.35, 'bandpass', [5200, 4300, 6100][v], 2.2, 0.35 * p, 2600)
  s.hit(t + 0.02, 0.2, 'highpass', 3500, 0.6, 0.22 * p, 2000)
  s.tone(t, 'sine', 90, 55, 0.1, 0.3 * p)
}
const rubber: Recipe = (s, t, v, p) => {
  s.hit(t, 0.01, 'highpass', 2000, 0.7, 0.3 * p)
  s.tone(t, 'sine', [220, 180, 260][v], 70, 0.18, 0.6 * p)
  s.tone(t + 0.07, 'sine', 160, 60, 0.12, 0.3 * p)
}
const stone: Recipe = (s, t, v, p) => {
  s.hit(t, 0.015, 'highpass', 2600, 0.8, 0.55 * p)
  s.hit(t, 0.09, 'bandpass', [900, 700, 1200][v], 1.4, 0.45 * p, 350)
  s.tone(t, 'sine', 70, 42, 0.2, 0.55 * p)
}
const wood: Recipe = (s, t, v, p) => {
  s.hit(t, 0.01, 'highpass', 2500, 0.8, 0.4 * p)
  s.tone(t, 'triangle', [320, 260, 400][v], 150, 0.09, 0.5 * p)
  s.hit(t, 0.08, 'bandpass', 700, 2, 0.3 * p, 400)
}
/** heavy charged hit: short silence, sub drop, crack */
const heavy: Recipe = (s, t, v, p) => {
  const T = t + 0.07
  s.tone(T, 'sine', 48, 24, 0.9, 1.0 * p)
  s.hit(T, 0.02, 'highpass', 2000, 0.7, 0.7 * p)
  s.tone(T, 'triangle', 120, 55, 0.25, 0.7 * p)
  s.hit(T, 0.5, 'lowpass', 1500, 0.6, 0.55 * p, 120)
  s.hit(T + 0.02, 0.15, 'bandpass', 2800, 2.5, 0.3 * p)
}
const weak: Recipe = (s, t, _v, p) => s.hit(t, 0.05, 'bandpass', 2400, 3, 0.25 * p)
const kill: Recipe = (s, t, v, p) => {
  s.tone(t, 'sine', 55, 30, 0.5, 0.9 * p)
  s.hit(t, 0.35, 'lowpass', 1800, 0.5, 0.6 * p, 200)
  s.hit(t + 0.03, 0.2, 'bandpass', 700, 1, 0.4 * p, 250)
  s.hit(t + 0.12 + v * 0.02, 0.5, 'bandpass', 400, 0.8, 0.12 * p, 120)
}

export const impacts: Record<string, Def> = {
  'hit.flesh': { fn: flesh, gap: 45, variants: 3 },
  'hit.metal': { fn: metal, gap: 45, variants: 3 },
  'hit.glass': { fn: glass, gap: 45, variants: 3 },
  'hit.rubber': { fn: rubber, gap: 45, variants: 3 },
  'hit.stone': { fn: stone, gap: 45, variants: 3 },
  'hit.wood': { fn: wood, gap: 45, variants: 3 },
  'hit.heavy': { fn: heavy, gap: 200 },
  'hit.weak': { fn: weak, gap: 45 },
  'kill': { fn: kill, gap: 80, variants: 3 },
}
