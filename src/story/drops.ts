// Boss / level drops (story.md): pure. A drop unlocks Bản vẽ and records items in the save.
import type { SaveData } from '../core/save'
export interface Drop { id: string; item: string; blueprints: string[] }
export const DROPS: Record<string, Drop> = {
  nguoigac: { id: 'nguoigac', item: 'loi_nguoigac', blueprints: ['dao', 'kiem'] },
}
/** apply once; returns the newly gained blueprint ids ([] if already collected) */
export function grant(s: SaveData, id: string): string[] {
  const d = DROPS[id]; if (!d || s.drops.includes(id)) return []
  s.drops.push(id)
  const gained = d.blueprints.filter(b => !s.unlocked.includes(b)); s.unlocked.push(...gained)
  return gained
}
