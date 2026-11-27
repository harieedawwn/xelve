import { describe, it, expect } from 'vitest'
import { waveOf, rewardFor, isBossWave, backdropFor, availableTypes } from './endlessLogic'
import { vi } from '../i18n/vi'

const early = { unlocked: ['l1', 'l2', 'l3'] }, late = { unlocked: ['l1', 'l2', 'l3', 'l4', 'l6'] }
describe('Vô tận rules', () => {
  it('only unlocked enemy types appear', () => {
    expect(availableTypes(early)).toEqual(['bong', 'chay'])
    for (let w = 1; w < 40; w++) for (const id of waveOf(w, early, () => 0.99).ids) expect(['bong', 'chay']).toContain(id)
  })
  it('mini-boss every 5th wave only', () => {
    expect([4, 5, 10, 11].map(isBossWave)).toEqual([false, true, true, false])
    expect(waveOf(5, late).boss).toBeTruthy(); expect(waveOf(6, late).boss).toBeNull()
  })
  it('waves grow but stay capped', () => { expect(waveOf(1, late).ids.length).toBe(2); expect(waveOf(60, late).ids.length).toBeLessThanOrEqual(7) })
  it('backdrops rotate through 4', () => {
    expect([1, 5, 6, 11, 16, 21].map(backdropFor)).toEqual(['corridor', 'corridor', 'office', 'alley', 'road', 'corridor'])
  })
  it('rewards: Màu each wave, a common material every 5th', () => {
    expect(rewardFor(2, late)).toEqual({ mau: 1 }); expect(Object.keys(rewardFor(5, late)).length).toBe(2)
    expect(rewardFor(5, { unlocked: [] })).toEqual({ mau: 1 })
  })
  it('names exist', () => { for (const k of ['endless.wave', 'endless.best', 'endless.boss']) expect((vi as any)[k]).toBeTruthy() })
})
