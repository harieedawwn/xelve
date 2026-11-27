import { describe, it, expect } from 'vitest'
import { CH1, level } from '.'
import { ENEMIES } from '../../enemies/registry'
import { vi } from '../../i18n/vi'
import { completeLevel, pickupName } from '../../story/progress'
import { khoiSize } from '../../weapon/economy'
import { defaults } from '../../core/save'

describe('chapter 1 level data', () => {
  it('ids are 1..n, in order, and found by level()', () => { CH1.forEach((l, i) => { expect(l.id).toBe(i + 1); expect(level(l.id)).toBe(l) }) })
  it('encounters are sorted, inside the rail, use known enemies and door slots 0..5', () => {
    for (const l of CH1) {
      let last = 0
      for (const e of l.encounters) {
        expect(e.atS).toBeGreaterThan(last); last = e.atS; expect(e.atS).toBeLessThan(l.length - 1)
        for (const w of e.wave) { expect(ENEMIES[w.type]).toBeDefined(); if (w.door !== 'far') { expect(w.door).toBeGreaterThanOrEqual(0); expect(w.door).toBeLessThan(6) } }
      }
    }
  })
  it('message and pickups sit inside the rail and the message text exists', () => {
    for (const l of CH1) {
      if (l.message) { expect(l.message.atS).toBeLessThan(l.length); expect(vi[`msg.${l.message.id}` as keyof typeof vi]).toBeTruthy(); expect(vi[`msg.${l.message.id}.time` as keyof typeof vi]).toBeTruthy() }
      for (const p of l.pickups) expect(p.atS).toBeLessThan(l.length)
      expect(vi[l.name as keyof typeof vi]).toBeTruthy()
    }
  })
  it('messages 1-4 map to L1-L4 in order', () => { expect(CH1.map(l => l.message?.id)).toEqual([1, 2, 3, 4]) })
  it('completing levels unlocks flags, grid sizes and progress (once)', () => {
    const s = defaults(); expect(khoiSize(s)).toBe(1)
    completeLevel(s, level(2)!); expect(khoiSize(s)).toBe(3); expect(s.progress.level).toBe(2); expect(s.unlocked).toContain('thuytinh')
    completeLevel(s, level(4)!); expect(khoiSize(s)).toBe(5)
    completeLevel(s, level(1)!); expect(s.progress.level).toBe(4)
    const n = s.unlocked.length; completeLevel(s, level(4)!); expect(s.unlocked.length).toBe(n)
  })
  it('pickup names resolve (material or drop key)', () => { for (const g of ['chi', 'nhom', 'magie', 'grid3']) expect(pickupName(g)).toBeTruthy() })
  it('forge opens only where the level says (L2 3×3, L4 5×5)', () => { expect(CH1.filter(l => l.forge).map(l => [l.id, l.forge])).toEqual([[2, 3], [4, 5]]) })
})
