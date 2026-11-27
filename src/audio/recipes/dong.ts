// Đống (L8): metal groan telegraph, car scrape in flight, crash, slam rumble, heavy sweep, panel tear, wind on the fall, collapse.
import type { Def, Recipe } from '../synth'

const groan: Recipe = (s, t, v) => { // bent sheet metal under load
  const f = [62, 55, 70][v]
  s.tone(t, 'sawtooth', f, f * 0.8, 1.2, 0.08); s.tone(t, 'sine', f * 0.5, f * 0.42, 1.2, 0.5)
  s.hit(t, 1.1, 'bandpass', 380, 6, 0.2, 260)
}
const scrape: Recipe = (s, t) => { s.hit(t, 1.2, 'bandpass', 900, 3, 0.18, 2400); s.hit(t + 0.2, 0.9, 'highpass', 3200, 0.8, 0.05) }
const crash: Recipe = (s, t, v) => {
  s.tone(t, 'sine', 60, 26, 0.6, 1.0); s.hit(t, 0.5, 'lowpass', 1400, 0.7, 0.9, 160)
  s.hit(t + 0.02, 0.7, 'bandpass', [2200, 1900, 2500][v], 2, 0.25, 900) // glass + panels
  s.hit(t + 0.15, 0.6, 'highpass', 4200, 0.6, 0.08)
}
const slam: Recipe = (s, t) => { s.tone(t, 'sine', 48, 20, 1.2, 1.1); s.hit(t, 1.0, 'lowpass', 500, 0.7, 0.9, 60); s.hit(t + 0.05, 0.4, 'bandpass', 1200, 1.5, 0.2, 400) }
const sweep: Recipe = (s, t) => { s.hit(t, 0.7, 'bandpass', 300, 1.1, 0.7, 900); s.tone(t, 'sine', 70, 40, 0.6, 0.4) }
const rip: Recipe = (s, t) => { s.hit(t, 0.9, 'bandpass', 1500, 4, 0.35, 600); s.tone(t, 'sawtooth', 140, 60, 0.8, 0.06); s.hit(t + 0.6, 0.4, 'lowpass', 800, 0.7, 0.4, 100) }
const wind: Recipe = (s, t) => s.hit(t, 1.4, 'bandpass', 420, 0.7, 0.35, 900)
const fall: Recipe = (s, t) => { for (let i = 0; i < 5; i++) crash(s, t + i * 0.32, i % 3, 1); s.tone(t, 'sine', 40, 22, 2.5, 0.9) }
const wave: Recipe = (s, t) => { s.hit(t, 0.35, 'bandpass', 1300, 1.6, 0.35, 500); s.tone(t, 'sine', 220, 120, 0.3, 0.12) }

export const dong: Record<string, Def> = {
  'dong.groan': { fn: groan, gap: 400, variants: 3 },
  'dong.scrape': { fn: scrape, gap: 300 },
  'dong.crash': { fn: crash, gap: 120, variants: 3 },
  'dong.slam': { fn: slam, gap: 300 },
  'dong.sweep': { fn: sweep, gap: 300 },
  'dong.rip': { fn: rip, gap: 500 },
  'dong.wind': { fn: wind, gap: 500 },
  'dong.fall': { fn: fall, gap: 2000 },
  'dong.wave': { fn: wave, gap: 200 },
}
