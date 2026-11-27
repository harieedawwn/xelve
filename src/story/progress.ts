// Level completion (pure on SaveData): flags into save.unlocked, progress.level, Xưởng grid size, material gifts.
import type { SaveData } from '../core/save'
import type { LevelData } from '../levels/ch1/types'
import { t, Key } from '../i18n'

/** units of material a pickup gives (all other pickups are flags) */
export const MATERIAL_GIVE: Record<string, number> = { chi: 8, nhom: 8, magie: 8, thuytinh: 8, caosu: 8, dakho: 8 }
export function completeLevel(s: SaveData, lv: LevelData) {
  for (const u of lv.unlocks) if (!s.unlocked.includes(u)) s.unlocked.push(u)
  s.progress.level = Math.max(s.progress.level, lv.id)
}
export function pickupName(gives: string) {
  return t((MATERIAL_GIVE[gives] ? `mat.${gives}` : `drop.${gives}`) as Key)
}
