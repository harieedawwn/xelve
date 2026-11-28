// Tutorial prompts (pure part): which prompts exist, and the per-save counters. DESIGN.md#ui: shown the first time a mechanic appears, hidden after it was done twice.
import type { Key } from '../i18n'

export const TUTORIAL = {
  need: 2,       // times the player must perform it before the prompt retires
  fastSpeed: 6,  // m/s tip speed that counts as "Vuốt nhanh"
  showSecs: 14,  // a prompt that was ignored fades after this long (it returns next time)
}

export type TutId = 'swipe' | 'fast' | 'head' | 'forge' | 'luc' | 'block' | 'dodge' | 'cover' | 'leap' | 'draw' | 'mirror' | 'try'
export const TUT_KEY: Record<TutId, Key> = {
  swipe: 'tut.swipe', fast: 'tut.fast', head: 'tut.head', forge: 'tut.forge', luc: 'tut.luc', block: 'tut.block', dodge: 'tut.dodge', cover: 'tut.cover', leap: 'tut.leap',
  draw: 'tut.draw', mirror: 'tut.mirror', try: 'tut.try',
}
export const FORGE_SEQ: TutId[] = ['draw', 'mirror', 'try']

type Counts = Record<string, number>
export const needed = (c: Counts, id: TutId) => (c[id] ?? 0) < TUTORIAL.need
export const bump = (c: Counts, id: TutId) => { c[id] = Math.min(TUTORIAL.need, (c[id] ?? 0) + 1); return !needed(c, id) }
/** first prompt of an ordered list the player still needs */
export const nextOf = (c: Counts, ids: TutId[]): TutId | null => ids.find(i => needed(c, i)) ?? null
