// Single quality table (docs/spec/tech.md). Changing tier applies live.
export type Tier = 'thap' | 'tb' | 'cao'
export const TIERS: Tier[] = ['thap', 'tb', 'cao']
export interface Quality {
  h: number; fps: number; particles: number; decals: number
  blur: 'none' | 'ghost' | 'directional'; ghost: boolean
  shadows: 'blob' | 'map'; maxEnemies: number
}
export const QUALITY: Record<Tier, Quality> = {
  thap: { h: 240, fps: 30, particles: 150, decals: 20, blur: 'none', ghost: false, shadows: 'blob', maxEnemies: 6 },
  tb: { h: 360, fps: 60, particles: 500, decals: 80, blur: 'ghost', ghost: true, shadows: 'blob', maxEnemies: 10 },
  cao: { h: 480, fps: 60, particles: 1500, decals: 300, blur: 'directional', ghost: false, shadows: 'map', maxEnemies: 14 },
}

/** Pick a tier from measured average frame time (ms) of a 2 s benchmark. */
export function tierFromFrameMs(ms: number): Tier { return ms < 9 ? 'cao' : ms < 14 ? 'tb' : 'thap' }

/** Render a few heavy frames for ~2 s behind the boot logo and pick a tier. */
export function benchmark(draw: () => void, ms = 2000): Promise<Tier> {
  return new Promise((res) => {
    const t0 = performance.now(); let n = 0, last = t0, worst = 0, total = 0
    const step = (t: number) => {
      draw(); const d = t - last; last = t
      if (n++ > 4) { total += d; worst = Math.max(worst, d) }
      if (t - t0 < ms) requestAnimationFrame(step)
      else res(tierFromFrameMs(n > 6 ? total / (n - 5) : 99))
    }
    requestAnimationFrame(step)
  })
}
