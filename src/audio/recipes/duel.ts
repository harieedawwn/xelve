// Duel cues: Đỡ, Phản đòn, Né, baton telegraph/whoosh. Phản đòn must stand apart from every hit: silence → bright ring + sub + tail.
import type { Def, Recipe } from '../synth'

const parry: Recipe = (s, t, v, p) => {
  const T = t + 0.05, f = [1480, 1320, 1660][v]
  s.hit(T, 0.012, 'highpass', 6000, 0.7, 0.8 * p)
  s.tone(T, 'sine', f, f * 0.99, 1.1, 0.34 * p)
  s.tone(T, 'sine', f * 1.5, f * 1.49, 0.8, 0.16 * p)
  s.tone(T, 'sine', f * 2.76, f * 2.74, 0.5, 0.1 * p)
  s.tone(T, 'sine', 52, 28, 0.7, 0.95 * p)
  s.hit(T + 0.01, 0.6, 'bandpass', 2400, 4, 0.18 * p, 900)
}
const block: Recipe = (s, t, v, p) => {
  s.hit(t, 0.01, 'highpass', 3500, 0.7, 0.5 * p)
  s.tone(t, 'triangle', [520, 470, 580][v], 300, 0.16, 0.38 * p)
  s.tone(t, 'sine', 70, 45, 0.18, 0.6 * p)
  s.hit(t, 0.12, 'lowpass', 900, 0.8, 0.35 * p, 200)
}
const dodge: Recipe = (s, t, v) => {
  s.hit(t, 0.28, 'bandpass', [700, 800, 620][v], 1.4, 0.32, 2600)
  s.tone(t, 'sine', 110, 70, 0.2, 0.15)
}
const guardUp: Recipe = (s, t) => { s.hit(t, 0.06, 'bandpass', 1800, 2, 0.12); s.tone(t, 'sine', 140, 110, 0.06, 0.1) }
const telegraph: Recipe = (s, t, v) => { // leather creak + inhale
  s.hit(t, 0.35, 'bandpass', [420, 380, 460][v], 3, 0.22, 900)
  s.hit(t + 0.05, 0.3, 'highpass', 2500, 0.6, 0.06, 4000)
}
const whoosh: Recipe = (s, t, v) => s.hit(t, 0.22, 'bandpass', [500, 560, 450][v], 1.2, 0.4, 1800)

const radio: Recipe = (s, t) => { // one crackle of an old radio: band-limited noise burst + faint carrier
  s.hit(t, 0.5, 'bandpass', 1700, 1.2, 0.3, 3200)
  s.hit(t + 0.18, 0.25, 'highpass', 3000, 0.7, 0.12)
  s.tone(t, 'sawtooth', 310, 305, 0.45, 0.05)
}

export const duel: Record<string, Def> = {
  'parry': { fn: parry, gap: 150, variants: 3 },
  'block': { fn: block, gap: 80, variants: 3 },
  'dodge': { fn: dodge, gap: 120, variants: 3 },
  'guard.up': { fn: guardUp, gap: 120 },
  'duel.telegraph': { fn: telegraph, gap: 200, variants: 3 },
  'radio.crackle': { fn: radio, gap: 500 },
  'duel.whoosh': { fn: whoosh, gap: 120, variants: 3 },
}
