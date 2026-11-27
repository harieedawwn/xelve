import { describe, it, expect } from 'vitest'
import { migrate, SAVE_VERSION, defaults } from './save'
import { tierFromFrameMs, QUALITY } from './quality'
import { Time } from './time'

describe('save', () => {
  it('fills defaults for empty/garbage', () => { expect(migrate(null)).toEqual(defaults()); expect(migrate('x').v).toBe(SAVE_VERSION) })
  it('merges partial old save', () => {
    const d = migrate({ v: 0, settings: { sound: false } })
    expect(d.v).toBe(SAVE_VERSION); expect(d.settings.sound).toBe(false); expect(d.settings.music).toBe(0.7)
  })
})
describe('quality', () => {
  it('table matches spec', () => { expect(QUALITY.thap.h).toBe(240); expect(QUALITY.cao.decals).toBe(300); expect(QUALITY.tb.maxEnemies).toBe(10) })
  it('benchmark picks tier', () => { expect(tierFromFrameMs(6)).toBe('cao'); expect(tierFromFrameMs(12)).toBe('tb'); expect(tierFromFrameMs(30)).toBe('thap') })
})
describe('time', () => {
  it('hitstop freezes sim, then resumes', () => {
    const t = new Time(); t.freeze(0.05)
    expect(t.tick(0.02)).toBe(0); expect(t.tick(0.02)).toBe(0); expect(t.tick(0.02)).toBeCloseTo(0.02)
  })
  it('slow-mo scales and ends', () => {
    const t = new Time(); let ended = 0; t.slowmo(0.1)
    expect(t.tick(0.05, () => ended++)).toBeCloseTo(0.0125); t.tick(0.06, () => ended++); expect(ended).toBe(1); expect(t.scale).toBe(1)
  })
})
