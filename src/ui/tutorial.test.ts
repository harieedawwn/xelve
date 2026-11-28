import { describe, it, expect } from 'vitest'
import { needed, bump, nextOf, FORGE_SEQ, TUT_KEY } from './tutorialLogic'
import { vi } from '../i18n/vi'
import { defaults, migrate } from '../core/save'

describe('tutorial counters', () => {
  it('hides after two performances', () => {
    const c: Record<string, number> = {}
    expect(needed(c, 'swipe')).toBe(true); expect(bump(c, 'swipe')).toBe(false); expect(needed(c, 'swipe')).toBe(true)
    expect(bump(c, 'swipe')).toBe(true); expect(needed(c, 'swipe')).toBe(false); bump(c, 'swipe'); expect(c.swipe).toBe(2)
  })
  it('Xưởng sequence advances in order', () => {
    const c: Record<string, number> = {}
    expect(nextOf(c, FORGE_SEQ)).toBe('draw'); bump(c, 'draw'); bump(c, 'draw'); expect(nextOf(c, FORGE_SEQ)).toBe('mirror')
    bump(c, 'mirror'); bump(c, 'mirror'); bump(c, 'try'); bump(c, 'try'); expect(nextOf(c, FORGE_SEQ)).toBeNull()
  })
  it('every prompt has a short Vietnamese line', () => { for (const k of Object.values(TUT_KEY)) expect(vi[k].split(' ').length).toBeLessThanOrEqual(9) })
  it('old saves get an empty tutorial map', () => { expect(migrate({ v: 1 }).tutorial).toEqual({}); expect(defaults().tutorial).toEqual({}) })
})
