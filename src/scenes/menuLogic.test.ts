import { describe, it, expect } from 'vitest'
import { menuAccess, resumeLevel, nodeState, stains } from './menuLogic'
import { vi } from '../i18n/vi'
import { CH1 } from '../levels/ch1'

describe('menu rules', () => {
  it('Xưởng and Phòng tập open after L2, Vô tận after L3', () => {
    expect(menuAccess({ unlocked: ['l1'] })).toEqual({ forge: false, gym: false, endless: false })
    expect(menuAccess({ unlocked: ['l1', 'l2'] })).toEqual({ forge: true, gym: true, endless: false })
    expect(menuAccess({ unlocked: ['l2', 'l3'] }).endless).toBe(true)
  })
  it('Tiếp tục = level after the last cleared, capped at L8', () => {
    expect(resumeLevel({ progress: { chapter: 1, level: 1 } }).id).toBe(2)
    expect(resumeLevel({ progress: { chapter: 1, level: 8 } }).id).toBe(8)
  })
  it('map node states', () => {
    const s = { progress: { chapter: 1, level: 3 } }
    expect([1, 3, 4, 5].map(i => nodeState(s, i))).toEqual(['cleared', 'cleared', 'current', 'locked'])
  })
  it('stains are deterministic and inside the node', () => {
    expect(stains(2)).toEqual(stains(2))
    for (const [x, y, z] of stains(5)) { expect(x).toBeLessThan(100); expect(y).toBeLessThan(100); expect(z).toBeGreaterThan(5) }
  })
  it('every level has a name and every term a description', () => {
    for (const l of CH1) expect((vi as any)[l.name]).toBeTruthy()
    for (const k of Object.keys(vi).filter(k => /^term\.\w+$/.test(k))) expect((vi as any)[k + '.d']).toBeTruthy()
  })
})
