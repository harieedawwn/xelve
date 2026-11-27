import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { NguoiGac, DATA } from './nguoigac'
import { MOVES } from '../combat/duel'

const fx: any = { blood() {}, splash() {}, addDebris() {} }
const at = new THREE.Vector3(0, 1.2, -1), dir = new THREE.Vector3(0, 0, -1), player = new THREE.Vector3()
const mk = () => new NguoiGac(new THREE.Scene(), new THREE.Vector3(0, 0, -3))
const run = (b: NguoiGac, s: number) => { for (let i = 0; i < s * 60; i++) b.update(1 / 60, player) }

describe('Người gác', () => {
  it('phase from hp: 100/66/33 %', () => {
    expect([1, 0.67, 0.66, 0.5, 0.33, 0.1].map(f => NguoiGac.phaseFor(f * 300, 300))).toEqual([0, 0, 1, 1, 2, 2])
  })
  it('every move in every phase can be answered with Né alone', () => {
    for (const p of DATA.phases) for (const id of p.order) {
      const m = MOVES[id], to = m.feint ? MOVES[m.feint.to] : m
      expect(m.dodge, id).not.toBeNull(); expect(to.dodge, id).not.toBeNull()
    }
  })
  it('phases get faster and phase 3 has a feint', () => {
    expect(DATA.phases.map(p => p.tempo)).toEqual([...DATA.phases.map(p => p.tempo)].sort((a, b) => b - a))
    expect(DATA.phases[2].order).toContain('feint'); expect(DATA.phases[0].order).not.toContain('feint')
  })
  it('hits are blocked by his baton until a counter window, then land', () => {
    const b = mk(); run(b, 1.2) // into the first wind-up
    expect(b.takeHit(5, at, dir, fx, false)).toBe(false); expect(b.hp).toBe(DATA.hp)
    b.open = true; b.takeHit(5, at, dir, fx, false); expect(b.hp).toBeLessThan(DATA.hp)
  })
  it('after a flurry he walks his round and every hit lands, ×1.5 harder', () => {
    const b = mk()
    let walked = false
    for (let i = 0; i < 60 * 40 && !walked; i++) { b.update(1 / 60, player); walked = b.walking }
    expect(walked).toBe(true)
    b.mult = 1.5; const hp = b.hp; b.takeHit(10, at, dir, fx, false); expect(hp - b.hp).toBeCloseTo(10 * DATA.openMult, 5)
    run(b, DATA.phases[0].walk + 0.5); expect(b.walking).toBe(false)
  })
  it('phase change staggers him and fires onPhase; defeat fires onDefeat once', () => {
    const b = mk(); const seen: number[] = []; let dead = 0
    b.onPhase = (n) => seen.push(n); b.onDefeat = () => dead++
    b.open = true; b.hp = DATA.hp * 0.6; run(b, 0.1); expect(seen).toEqual([2]); expect(b.script.state).toBe('stagger')
    b.takeHit(999, at, dir, fx, false); expect(dead).toBe(1); expect(b.defeated).toBe(true)
  })
})
