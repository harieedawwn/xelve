// Bóng: appear, telegraph (warning before an attack), lunge, hurt, death.
import type { Def, Recipe } from '../synth'

const appear: Recipe = (s, t) => { s.hit(t, 0.6, 'bandpass', 300, 1.5, 0.25, 900); s.tone(t, 'sine', 45, 60, 0.6, 0.3) }
const telegraph: Recipe = (s, t, v) => {
  s.hit(t, 0.28, 'bandpass', [1200, 1000, 1400][v], 3, 0.3, 2200)
  s.tone(t, 'sine', 85, 110, 0.28, 0.35)
}
const lunge: Recipe = (s, t) => { s.hit(t, 0.22, 'bandpass', 600, 1.2, 0.45, 2000); s.tone(t, 'sine', 100, 45, 0.25, 0.5) }
const hurt: Recipe = (s, t, v) => { s.hit(t, 0.12, 'bandpass', [900, 700, 1100][v], 2, 0.3, 400) }
const death: Recipe = (s, t, v) => {
  s.hit(t, 0.7, 'bandpass', 1800, 1.5, 0.35, 150)
  s.hit(t + 0.1, 0.5, 'highpass', 4000, 0.6, 0.15, 1200)
  s.tone(t, 'sine', 70 + v * 6, 30, 0.7, 0.55)
}

export const bong: Record<string, Def> = {
  'bong.appear': { fn: appear, gap: 150 },
  'bong.telegraph': { fn: telegraph, gap: 120, variants: 3 },
  'bong.lunge': { fn: lunge, gap: 120 },
  'bong.hurt': { fn: hurt, gap: 60, variants: 3 },
  'bong.death': { fn: death, gap: 80, variants: 3 },
}
