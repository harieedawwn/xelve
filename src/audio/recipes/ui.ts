// UI: low "cộc" body + dry "tách" transient. No high chimes.
import type { Def, Recipe } from '../synth'

const tap: Recipe = (s, t) => { s.hit(t, 0.006, 'highpass', 3000, 0.7, 0.25); s.tone(t, 'triangle', 170, 145, 0.07, 0.35) }
const on: Recipe = (s, t) => { s.hit(t, 0.006, 'highpass', 3000, 0.7, 0.22); s.tone(t, 'triangle', 150, 190, 0.08, 0.35) }
const off: Recipe = (s, t) => { s.hit(t, 0.006, 'highpass', 2600, 0.7, 0.2); s.tone(t, 'triangle', 170, 120, 0.09, 0.35) }
const back: Recipe = (s, t) => { s.hit(t, 0.006, 'highpass', 2400, 0.7, 0.2); s.tone(t, 'triangle', 130, 100, 0.1, 0.38) }

export const ui: Record<string, Def> = {
  'ui.tap': { fn: tap, gap: 40, bus: 'ui' },
  'ui.on': { fn: on, gap: 40, bus: 'ui' },
  'ui.off': { fn: off, gap: 40, bus: 'ui' },
  'ui.back': { fn: back, gap: 40, bus: 'ui' },
}
