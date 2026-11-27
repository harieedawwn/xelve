// Vô tận (combat.md#8): pure wave rules. Waves use only enemy types the player has met; every 5th wave is a mini-boss variant.
import type { SaveData } from '../core/save'

export const ENDLESS = {
  bossEvery: 5, bossScale: 1.45, bossHpMult: 5,
  backdrops: ['corridor', 'office', 'alley', 'road'] as const, wavesPerBackdrop: 5,
  mauPerWave: 1, rewardEvery: 5, rewardAmount: 3,
  /** enemy id → unlock flag that introduces it (null = always) */
  types: [['bong', null], ['chay', 'l3'], ['nhieu', 'l4'], ['khien', 'l6'], ['vo', 'l6']] as [string, string | null][],
  /** common materials only: id → flag */
  common: [['chi', 'l3'], ['nhom', 'l3'], ['magie', 'l4'], ['thuytinh', 'l2']] as [string, string][],
}
type S = Pick<SaveData, 'unlocked'>
export const availableTypes = (s: S) => ENDLESS.types.filter(([, f]) => !f || s.unlocked.includes(f)).map(([id]) => id)
export const isBossWave = (wave: number) => wave > 0 && wave % ENDLESS.bossEvery === 0
export const backdropFor = (wave: number) => ENDLESS.backdrops[Math.floor((Math.max(1, wave) - 1) / ENDLESS.wavesPerBackdrop) % ENDLESS.backdrops.length]

/** enemy ids for a wave (1-based). Deterministic given `rnd` (0..1). */
export function waveOf(wave: number, s: S, rnd: () => number = Math.random): { ids: string[]; boss: string | null } {
  const pool = availableTypes(s), n = Math.min(7, 2 + Math.floor(wave / 2))
  const pick = () => { const k = Math.min(pool.length, 1 + Math.floor(wave / 3)); return pool[Math.floor(rnd() * k)] }
  if (isBossWave(wave)) { const b = pool[Math.min(pool.length - 1, Math.floor(wave / ENDLESS.bossEvery) - 1)]; return { ids: Array.from({ length: Math.min(3, 1 + Math.floor(wave / 10)) }, pick), boss: b } }
  return { ids: Array.from({ length: n }, pick), boss: null }
}
/** rewards for clearing `wave`: Màu every wave, a common material every 5th */
export function rewardFor(wave: number, s: S): Record<string, number> {
  const r: Record<string, number> = { mau: ENDLESS.mauPerWave }
  const own = ENDLESS.common.filter(([, f]) => s.unlocked.includes(f))
  if (wave % ENDLESS.rewardEvery === 0 && own.length) r[own[(wave / ENDLESS.rewardEvery - 1) % own.length][0]] = ENDLESS.rewardAmount
  return r
}
export const BEST_KEY = 'endless'
export const bestWave = (s: { bests?: Record<string, number> }) => s.bests?.[BEST_KEY] ?? 0
