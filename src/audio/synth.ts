// Tiny synth toolbox shared by all recipes. Pure WebAudio, no samples.
export class Synth {
  noise: AudioBuffer
  constructor(public ctx: AudioContext, public out: AudioNode) {
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = this.noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  /** ±3 % pitch randomisation */
  r(x: number) { return x * (1 + (Math.random() - 0.5) * 0.06) }
  hit(t: number, dur: number, type: BiquadFilterType, f: number, q: number, gain: number, f2?: number) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = this.r(1)
    const bf = c.createBiquadFilter(); bf.type = type; bf.frequency.setValueAtTime(f, t); bf.Q.value = q
    if (f2) bf.frequency.exponentialRampToValueAtTime(f2, t + dur)
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur)
    s.connect(bf); bf.connect(g); g.connect(this.out); s.start(t, Math.random() * 1.5, dur + 0.05)
  }
  tone(t: number, type: OscillatorType, f0: number, f1: number, dur: number, gain: number) {
    const c = this.ctx, o = c.createOscillator(); o.type = type
    o.frequency.setValueAtTime(this.r(f0), t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur)
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur)
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.05)
  }
}
/** A recipe plays one sound at time t. v = variant 0..2, p = power ~0..1.5 */
export type Recipe = (s: Synth, t: number, v: number, p: number) => void
export interface Def { fn: Recipe; gap: number; bus?: 'sfx' | 'ui'; variants?: number }
