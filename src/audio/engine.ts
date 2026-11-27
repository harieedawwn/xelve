// Audio engine: buses (sfx / ui / music) → master → lowpass → limiter. Reverb send per space.
// All sounds are recipes in ./recipes/* registered below; play(name) enforces min gap per sound.
import { Synth, type Def } from './synth'
import { SPACES, makeIR } from './reverb'
import { Music } from './music'
import { impacts } from './recipes/impacts'
import { world } from './recipes/world'
import { ui } from './recipes/ui'
import { bong } from './recipes/bong'
import { duel } from './recipes/duel'
import { dong } from './recipes/dong'

export const RECIPES: Record<string, Def> = { ...impacts, ...world, ...ui, ...bong, ...duel, ...dong }

export class Audio {
  ctx: AudioContext | null = null
  private master!: GainNode; private sfx!: GainNode; private uiBus!: GainNode; private musicBus!: GainNode
  private wet!: GainNode; private conv!: ConvolverNode; private lp!: BiquadFilterNode
  private syn!: Synth; private uiSyn!: Synth
  private whooshGain!: GainNode; private whooshBP!: BiquadFilterNode; private whooshBP2!: BiquadFilterNode
  private last: Record<string, number> = {}
  music!: Music
  muted = false; level = 1; musicLevel = 0.6

  unlock() {
    if (this.ctx) { this.ctx.resume(); return }
    const ctx = new AudioContext(); this.ctx = ctx
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -10; lim.ratio.value = 6; lim.connect(ctx.destination)
    this.master = ctx.createGain(); this.lp = ctx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 20000
    this.master.connect(this.lp); this.lp.connect(lim)
    this.sfx = ctx.createGain(); this.sfx.connect(this.master)
    this.uiBus = ctx.createGain(); this.uiBus.gain.value = 0.9; this.uiBus.connect(this.master)
    this.musicBus = ctx.createGain(); this.musicBus.connect(this.master)
    this.conv = ctx.createConvolver(); this.wet = ctx.createGain()
    this.sfx.connect(this.conv); this.conv.connect(this.wet); this.wet.connect(this.master)
    this.setSpace('corridor')
    this.syn = new Synth(ctx, this.sfx); this.uiSyn = new Synth(ctx, this.uiBus); this.uiSyn.noise = this.syn.noise
    this.music = new Music(ctx, this.musicBus)
    // continuous whoosh: noise → 2 band-passes, driven by tip speed every frame
    const src = ctx.createBufferSource(); src.buffer = this.syn.noise; src.loop = true
    this.whooshBP = ctx.createBiquadFilter(); this.whooshBP.type = 'bandpass'; this.whooshBP.Q.value = 1.4
    this.whooshBP2 = ctx.createBiquadFilter(); this.whooshBP2.type = 'bandpass'; this.whooshBP2.Q.value = 6
    this.whooshGain = ctx.createGain(); this.whooshGain.gain.value = 0
    src.connect(this.whooshBP); src.connect(this.whooshBP2)
    const g2 = ctx.createGain(); g2.gain.value = 0.35; this.whooshBP2.connect(g2); g2.connect(this.whooshGain)
    this.whooshBP.connect(this.whooshGain); this.whooshGain.connect(this.sfx); src.start()
    this.applyGain()
    // pause on hidden
    document.addEventListener('visibilitychange', () => { document.hidden ? ctx.suspend() : ctx.resume() })
  }

  /** reverb per space: corridor | hall | small | open */
  setSpace(name: string) {
    if (!this.ctx) return
    const sp = SPACES[name] ?? SPACES.corridor
    this.conv.buffer = makeIR(this.ctx, sp); this.wet.gain.value = sp.wet
  }
  setMuted(m: boolean) { this.muted = m; this.applyGain() }
  setLevel(v: number) { this.level = v; this.applyGain() }
  setMusic(v: number) { this.musicLevel = v; this.applyGain() }
  private applyGain() {
    if (!this.master) return
    this.master.gain.value = this.muted ? 0 : 0.8 * this.level
    this.musicBus.gain.value = 0.5 * this.musicLevel
  }

  /** play a registered recipe. v = variant (random if omitted), p = power */
  play(name: string, p = 1, v?: number) {
    const d = RECIPES[name]; if (!this.ctx || !d) return
    const now = performance.now(); if ((this.last[name] ?? 0) + d.gap > now) return
    this.last[name] = now
    const vv = v ?? Math.floor(Math.random() * (d.variants ?? 1))
    d.fn(d.bus === 'ui' ? this.uiSyn : this.syn, this.ctx.currentTime, vv, Math.min(1.5, p))
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

  // ---- game-event wrappers ----
  hit(power: number, weak: boolean, material = 'flesh', heavy = false) {
    this.play(heavy ? 'hit.heavy' : 'hit.' + material, power)
    if (weak) this.play('hit.weak')
  }
  kill() { this.play('kill') }
  playerHurt() {
    if (!this.ctx) return
    this.play('player.hurt'); const t = this.ctx.currentTime
    this.lp.frequency.cancelScheduledValues(t)
    this.lp.frequency.setValueAtTime(700, t); this.lp.frequency.exponentialRampToValueAtTime(20000, t + 0.9)
  }
  step(floor = 'concrete') { this.play('step.' + floor) }
  slowIn() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.lp.frequency.cancelScheduledValues(t); this.lp.frequency.setValueAtTime(20000, t); this.lp.frequency.exponentialRampToValueAtTime(900, t + 0.12)
    this.play('slow.in')
  }
  slowOut() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.lp.frequency.cancelScheduledValues(t); this.lp.frequency.setValueAtTime(900, t); this.lp.frequency.exponentialRampToValueAtTime(20000, t + 0.08)
    this.play('slow.out')
  }
  ui(kind: 'tap' | 'on' | 'off' | 'back' = 'tap') { this.play('ui.' + kind) }
}
