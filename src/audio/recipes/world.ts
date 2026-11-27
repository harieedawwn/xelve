// Footsteps per floor, player hurt, slow-mo cues, heartbeat.
import type { Def, Recipe } from '../synth'

const step = (lp: number, body: number, ring = 0): Recipe => (s, t, v) => {
  const k = [1, 0.9, 1.1][v]
  s.hit(t, 0.05, 'lowpass', s.r(lp * k), 0.8, 0.16)
  s.tone(t, 'sine', body * k, body * 0.63, 0.06, 0.12)
  if (ring) s.tone(t, 'sine', ring * k, ring * 0.98, 0.18, 0.05)
}
const wetStep: Recipe = (s, t, v) => {
  s.hit(t, 0.09, 'bandpass', [600, 500, 700][v], 1.1, 0.18, 250)
  s.tone(t, 'sine', 80, 50, 0.07, 0.1)
}
const hurt: Recipe = (s, t) => {
  s.tone(t, 'sine', 90, 45, 0.3, 0.9); s.hit(t, 0.18, 'lowpass', 600, 0.7, 0.6, 150)
}
const heartbeat: Recipe = (s, t) => {
  s.tone(t, 'sine', 62, 40, 0.14, 0.7); s.tone(t + 0.2, 'sine', 55, 36, 0.16, 0.5)
}
const slowIn: Recipe = (s, t) => s.tone(t, 'sine', 70, 38, 0.9, 0.45)
const slowOut: Recipe = (s, t) => s.hit(t, 0.25, 'bandpass', 500, 0.9, 0.25, 2400)

export const world: Record<string, Def> = {
  'step.concrete': { fn: step(900, 95), gap: 180, variants: 3 },
  'step.metal': { fn: step(1400, 110, 520), gap: 180, variants: 3 },
  'step.wood': { fn: step(700, 130, 240), gap: 180, variants: 3 },
  'step.wet': { fn: wetStep, gap: 180, variants: 3 },
  'player.hurt': { fn: hurt, gap: 150 },
  'heartbeat': { fn: heartbeat, gap: 400 },
  'slow.in': { fn: slowIn, gap: 100 },
  'slow.out': { fn: slowOut, gap: 100 },
}
