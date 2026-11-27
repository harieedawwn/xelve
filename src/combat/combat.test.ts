import { describe, it, expect } from 'vitest'
import { damage, luc, swingSpring, speedCap, chargeTime, BASE } from './damage'
import { PlayerHP, MAX_HP, REGEN_S } from './player'

describe('damage', () => {
  const base = { mContact: 12, v: 4, shape: 'sac' as const }
  it('scales with √mass', () => expect(damage({ ...base, mContact: 48 }) / damage(base)).toBeCloseTo(2, 5))
  it('speed clamps 0.2..2', () => {
    expect(damage({ ...base, v: 0 })).toBeCloseTo(BASE * Math.sqrt(12) * 0.2, 5)
    expect(damage({ ...base, v: 99 })).toBeCloseTo(BASE * Math.sqrt(12) * 2, 5)
  })
  it('shape multipliers', () => {
    expect(damage({ ...base, shape: 'mui' }) / damage(base)).toBeCloseTo(1.25, 5)
    expect(damage({ ...base, shape: 'cun' }) / damage(base)).toBeCloseTo(0.8, 5)
  })
  it('weak point doubles, lực = 0.2+0.8c²', () => {
    expect(damage({ ...base, weak: true }) / damage(base)).toBeCloseTo(2, 5)
    expect(luc(0)).toBeCloseTo(0.2); expect(luc(1)).toBeCloseTo(1)
    expect(damage({ ...base, charge: 0.5 }) / damage(base)).toBeCloseTo(0.4, 5)
  })
  it('Khối rubbing: small mass, many hits, low each', () => {
    expect(damage({ mContact: 3, v: 2.2, shape: 'khoi' })).toBeLessThan(damage(base) / 2)
  })
})

describe('swing', () => {
  it('heavy lags: lower stiffness, lower speed cap, slower charge', () => {
    const l = swingSpring(1), h = swingSpring(9)
    expect(h.k).toBeLessThan(l.k / 5); expect(h.freq).toBeLessThan(l.freq)
    expect(speedCap(9)).toBeLessThan(speedCap(1)); expect(chargeTime(9)).toBeGreaterThan(chargeTime(1))
  })
  it('damping is 0.8 of critical', () => { const s = swingSpring(3); expect(s.c / (2 * Math.sqrt(s.k))).toBeCloseTo(0.8, 5) })
})

describe('player hp', () => {
  it('6 segments, dies at 0', () => {
    const p = new PlayerHP(); expect(p.hp).toBe(MAX_HP)
    for (let i = 0; i < 5; i++) expect(p.hit()).toBe(false)
    expect(p.hit()).toBe(true); expect(p.dead).toBe(true)
  })
  it('regens 1 per 6 s only out of combat', () => {
    const p = new PlayerHP(); p.hit(2)
    expect(p.update(10, true)).toBe(false); expect(p.hp).toBe(4)
    expect(p.update(REGEN_S + 0.1, false)).toBe(true); expect(p.hp).toBe(5)
  })
})
