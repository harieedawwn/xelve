// Pure menu rules: what is open, which level Tiếp tục starts, which map nodes are playable.
import type { SaveData } from '../core/save'
import { CH1, level } from '../levels/ch1'
import type { LevelData } from '../levels/ch1/types'

export interface Access { forge: boolean; gym: boolean; endless: boolean }
/** Xưởng + Phòng tập open after L2, Vô tận after L3. */
export function menuAccess(s: Pick<SaveData, 'unlocked'>): Access {
  return { forge: s.unlocked.includes('l2'), gym: s.unlocked.includes('l2'), endless: s.unlocked.includes('l3') }
}
/** next level to play: the one after the last cleared, or the last level when the chapter is done */
export function resumeLevel(s: Pick<SaveData, 'progress'>): LevelData {
  return level(Math.min(s.progress.level + 1, CH1.length)) ?? CH1[0]
}
export type NodeState = 'cleared' | 'current' | 'locked'
export const nodeState = (s: Pick<SaveData, 'progress'>, id: number): NodeState =>
  id <= s.progress.level ? 'cleared' : id === s.progress.level + 1 ? 'current' : 'locked'
/** deterministic stain squares for a cleared level: [x%, y%, size] inside its node */
export function stains(id: number): [number, number, number][] {
  const out: [number, number, number][] = []; let r = id * 7919 + 13
  for (let i = 0; i < 5; i++) { r = (r * 16807) % 2147483647; const x = r % 100; r = (r * 16807) % 2147483647; out.push([x, r % 100, 6 + (r % 9)]) }
  return out
}
