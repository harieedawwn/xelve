// Synthesised, layered, realistic-leaning SFX. No samples. Tuned by ear later (audition page in P4).
export class Audio {
  ctx: AudioContext | null = null
  private master!: GainNode; private sfx!: GainNode; private wet!: GainNode; private lp!: BiquadFilterNode
  private noise!: AudioBuffer
  private whooshGain!: GainNode; private whooshBP!: BiquadFilterNode; private whooshBP2!: BiquadFilterNode
  private last: Record<string, number> = {}
  muted = false; level = 1

  unlock() {
    if (this.ctx) { this.ctx.resume(); return }
    const ctx = new AudioContext(); this.ctx = ctx
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 6; comp.connect(ctx.destination)
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.8 * this.level
    this.lp = ctx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 20000
    this.master.connect(this.lp); this.lp.connect(comp)
    this.sfx = ctx.createGain(); this.sfx.connect(this.master)
    // generated corridor IR: short, bright-ish, hard walls
    const conv = ctx.createConvolver(); const len = Math.floor(ctx.sampleRate * 0.9)
    const ir = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) }
    conv.buffer = ir; this.wet = ctx.createGain(); this.wet.gain.value = 0.16
    this.sfx.connect(conv); conv.connect(this.wet); this.wet.connect(this.master)
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const nd = this.noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
    // continuous whoosh: noise → 2 band-passes, driven by tip speed every frame
    const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true
    this.whooshBP = ctx.createBiquadFilter(); this.whooshBP.type = 'bandpass'; this.whooshBP.Q.value = 1.4
    this.whooshBP2 = ctx.createBiquadFilter(); this.whooshBP2.type = 'bandpass'; this.whooshBP2.Q.value = 6
    this.whooshGain = ctx.createGain(); this.whooshGain.gain.value = 0
    src.connect(this.whooshBP); src.connect(this.whooshBP2)
    const g2 = ctx.createGain(); g2.gain.value = 0.35; this.whooshBP2.connect(g2); g2.connect(this.whooshGain)
    this.whooshBP.connect(this.whooshGain); this.whooshGain.connect(this.sfx); src.start()
    document.addEventListener('visibilitychange', () => { document.hidden ? ctx.suspend() : ctx.resume() })
  }

  setMuted(m: boolean) { this.muted = m; this.applyGain() }
  setLevel(v: number) { this.level = v; this.applyGain() }
  private applyGain() { if (this.master) this.master.gain.value = this.muted ? 0 : 0.8 * this.level }

  private gap(key: string, ms: number) {
    const t = performance.now(); if ((this.last[key] ?? 0) + ms > t) return false; this.last[key] = t; return true
  }
  private r(x: number) { return x * (1 + (Math.random() - 0.5) * 0.06) } // ±3%

  private noiseHit(t: number, dur: number, type: BiquadFilterType, f: number, q: number, gain: number, f2?: number) {
    const c = this.ctx!, s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = this.r(1)
    const bf = c.createBiquadFilter(); bf.type = type; bf.frequency.setValueAtTime(f, t); bf.Q.value = q
    if (f2) bf.frequency.exponentialRampToValueAtTime(f2, t + dur)
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur)
    s.connect(bf); bf.connect(g); g.connect(this.sfx); s.start(t, Math.random() * 1.5, dur + 0.05)
  }
  private tone(t: number, type: OscillatorType, f0: number, f1: number, dur: number, gain: number) {
    const c = this.ctx!, o = c.createOscillator(); o.type = type
    o.frequency.setValueAtTime(this.r(f0), t); o.frequency.exponentialRampToValueAtTime(f1, t + dur)
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur)
    o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + dur + 0.05)
  }

  /** called every frame with the weapon tip speed (m/s) */
  swing(speed: number, timeScale: number) {
    if (!this.ctx) return
    const t = this.ctx.currentTime, s = Math.max(0, speed - 1.2)
    const g = Math.min(0.55, Math.pow(s / 7, 1.6) * 0.55)
    this.whooshGain.gain.setTargetAtTime(g, t, 0.025)
    const f = (260 + s * 150) * (0.6 + 0.4 * timeScale)
    this.whooshBP.frequency.setTargetAtTime(f, t, 0.03); this.whooshBP2.frequency.setTargetAtTime(f * 2.3, t, 0.03)
  }

  /** layered flesh impact: tách + cộc + low thump + wet squelch */
  hit(power: number, weak: boolean) {
    if (!this.ctx || !this.gap('hit', 45)) return
    const t = this.ctx.currentTime, p = Math.min(1.5, power)
    this.noiseHit(t, 0.012, 'highpass', 3200, 0.7, 0.5 * p)                // transient
    this.tone(t, 'triangle', 150, 80, 0.12, 0.55 * p)                     // body
    this.tone(t, 'sine', 62, 40, 0.22, 0.6 * p)                           // low
    this.noiseHit(t + 0.004, 0.14, 'bandpass', 1100, 1.2, 0.35 * p, 380)  // wet
    if (weak) this.noiseHit(t, 0.05, 'bandpass', 2400, 3, 0.25)           // crack
  }
  kill() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.tone(t, 'sine', 55, 30, 0.5, 0.9)
    this.noiseHit(t, 0.35, 'lowpass', 1800, 0.5, 0.6, 200)
    this.noiseHit(t + 0.03, 0.2, 'bandpass', 700, 1, 0.4, 250)
    // tiny silence-then-tail: a reverse-ish swell
    this.noiseHit(t + 0.12, 0.5, 'bandpass', 400, 0.8, 0.12, 120)
  }
  playerHurt() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.tone(t, 'sine', 90, 45, 0.3, 0.9); this.noiseHit(t, 0.18, 'lowpass', 600, 0.7, 0.6, 150)
    this.lp.frequency.setValueAtTime(700, t); this.lp.frequency.exponentialRampToValueAtTime(20000, t + 0.9)
  }
  step() {
    if (!this.ctx || !this.gap('step', 180)) return
    const t = this.ctx.currentTime
    this.noiseHit(t, 0.05, 'lowpass', this.r(900), 0.8, 0.16); this.tone(t, 'sine', 95, 60, 0.06, 0.12)
  }
  slowIn() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.lp.frequency.cancelScheduledValues(t); this.lp.frequency.setValueAtTime(20000, t); this.lp.frequency.exponentialRampToValueAtTime(900, t + 0.12)
    this.tone(t, 'sine', 70, 38, 0.9, 0.45)
  }
  slowOut() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.lp.frequency.cancelScheduledValues(t); this.lp.frequency.setValueAtTime(900, t); this.lp.frequency.exponentialRampToValueAtTime(20000, t + 0.08)
    this.noiseHit(t, 0.25, 'bandpass', 500, 0.9, 0.25, 2400)
  }
  ui() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.noiseHit(t, 0.006, 'highpass', 3000, 0.7, 0.25); this.tone(t, 'triangle', 170, 145, 0.07, 0.35)
  }
}
