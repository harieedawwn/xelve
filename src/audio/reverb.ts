// Generated impulse responses per space (no files).
export interface Space { len: number; decay: number; wet: number; bright: number }
export const SPACES: Record<string, Space> = {
  corridor: { len: 0.9, decay: 3.2, wet: 0.16, bright: 1 },
  hall: { len: 2.2, decay: 2.4, wet: 0.24, bright: 0.7 },
  small: { len: 0.35, decay: 4, wet: 0.1, bright: 0.9 },
  open: { len: 0.25, decay: 5, wet: 0.04, bright: 0.8 },
}
export function makeIR(ctx: BaseAudioContext, sp: Space): AudioBuffer {
  const n = Math.floor(ctx.sampleRate * sp.len), ir = ctx.createBuffer(2, n, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch); let lp = 0
    for (let i = 0; i < n; i++) {
      lp += ((Math.random() * 2 - 1) - lp) * sp.bright // one-pole darkening
      d[i] = lp * Math.pow(1 - i / n, sp.decay)
    }
  }
  return ir
}
