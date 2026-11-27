import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { pickThreat, clampPitch, threatScore, THREAT } from './threat'

const eye = new THREE.Vector3(0, 1.72, 0)
const en = (x: number, z: number, o: Partial<{ attacking: boolean; onScreen: boolean; y: number }> = {}) =>
  ({ pos: new THREE.Vector3(x, 0, z), aim: new THREE.Vector3(x, o.y ?? 1.6, z), attacking: !!o.attacking, onScreen: o.onScreen ?? true })

describe('threat look', () => {
  it('closer beats farther', () => { expect(pickThreat([en(0, -6), en(0.4, -1.4)], eye)).toBe(1) })
  it('an attacking enemy at the feet beats a closer-looking far crowd', () => {
    const list = [en(0, -3), en(0.3, -3.2), en(-0.2, -1.1, { attacking: true, y: 0.5 })]
    expect(pickThreat(list, eye)).toBe(2)
  })
  it('a lunging enemy within 1.5 m wins even off-screen', () => {
    expect(pickThreat([en(0, -1.6), en(1.2, -0.6, { attacking: true, onScreen: false })], eye)).toBe(1)
  })
  it('a walking off-screen enemy waits for an on-screen one', () => {
    expect(pickThreat([en(0, -2.2), en(2, -0.5, { onScreen: false })], eye)).toBe(0)
  })
  it('keeps the current target unless clearly beaten', () => {
    const list = [en(0, -2), en(0.3, -1.95)]
    expect(pickThreat(list, eye, 0)).toBe(0)
    expect(threatScore(list[1], eye)).toBeGreaterThan(threatScore(list[0], eye))
  })
  it('head pitches down at most 40°', () => {
    const p = clampPitch(eye, new THREE.Vector3(0, 0, -0.4))
    expect(Math.atan2(p.y - eye.y, 0.4)).toBeCloseTo(THREAT.maxDown, 5)
  })
})
