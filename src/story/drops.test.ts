import { describe, it, expect } from 'vitest'
import { defaults } from '../core/save'
import { grant } from './drops'
describe('drops', () => {
  it('Người gác unlocks Dao + Kiếm once', () => {
    const s = defaults()
    expect(grant(s, 'nguoigac')).toEqual(['dao', 'kiem'])
    expect(s.unlocked).toEqual(['khoi', 'dao', 'kiem'])
    expect(grant(s, 'nguoigac')).toEqual([])
    expect(s.drops).toEqual(['nguoigac'])
  })
})
