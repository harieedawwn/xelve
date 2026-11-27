import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { ENEMIES } from './registry'
import { Vo } from './vo'
import { Khien } from './khien'
import { Chay } from './chay'
import { Nhieu } from './nhieu'
import { Bong } from './bong'

const fx: any = { blood() {}, splash() {}, addDebris() {} }
const mk = () => new THREE.Scene()
const at = new THREE.Vector3(0, 1.2, -1), dir = new THREE.Vector3(0, 0, -1)
const player = new THREE.Vector3(0, 0, 0)
const run = (e: any, s: number, strike = () => {}) => { for (let i = 0; i < s * 60; i++) e.update(1 / 60, player, strike) }

describe('enemies', () => {
  it('registry builds all five', () => { for (const id of Object.keys(ENEMIES)) expect(ENEMIES[id](mk(), new THREE.Vector3(0, 0, -5)).alive).toBe(true); expect(Object.keys(ENEMIES).length).toBe(5) })
  it('vo splits 1 → 2 small → 4 tiny each', () => {
    const born: Vo[] = []; const v = new Vo(mk(), new THREE.Vector3(0, 0, -3)); v.onSpawn = (k) => { born.push(k as Vo); k.onSpawn = v.onSpawn }
    v.takeHit(99, at, dir, fx, false); expect(born.length).toBe(2); expect(born[0].hp).toBe(12)
    born[0].takeHit(99, at, dir, fx, false); expect(born.length).toBe(6); expect(born[2].hp).toBe(4)
    born[2].takeHit(99, at, dir, fx, false); expect(born.length).toBe(6)
  })
  it('khien blocks light hits, breaks on charge / blunt / hand', () => {
    const k = new Khien(mk(), new THREE.Vector3(0, 0, -5)); k.state = 'approach'
    expect(k.takeHit(30, at, dir, fx, false, { charge: 0, blunt: false })).toBe(false); expect(k.hp).toBe(50); expect(k.blocked).toBe(true)
    k.hitCooldown = 0; k.takeHit(10, at, dir, fx, false, { charge: 1, blunt: false }); expect(k.guard).toBe(false); expect(k.hp).toBeLessThan(50)
    const k2 = new Khien(mk(), new THREE.Vector3(0, 0, -5)); k2.state = 'approach'; k2.update(0.016, player, () => {})
    k2.takeHit(10, k2.signHand().clone(), dir, fx, false, { charge: 0, blunt: false }); expect(k2.guard).toBe(false)
  })
  it('khien guard is open while attacking', () => {
    const k = new Khien(mk(), new THREE.Vector3(0, 0, -5)); k.state = 'windup'
    k.takeHit(10, at, dir, fx, false, { charge: 0, blunt: false }); expect(k.hp).toBe(40)
  })
  it('chay: grounded hits glance, airborne hits land', () => {
    const c = new Chay(mk(), new THREE.Vector3(0, 0, -5)); c.takeHit(10, at, dir, fx, false); expect(c.hp).toBe(17)
    c.hitCooldown = 0; c.root.position.y = 0.6; c.state = 'lunge'; c.takeHit(10, at, dir, fx, false); expect(c.hp).toBe(7)
  })
  it('chay leaps and strikes with a windup', () => {
    const c = new Chay(mk(), new THREE.Vector3(0, 0, -6)); let hit = 0, maxY = 0, wind = false
    for (let i = 0; i < 600; i++) { c.update(1 / 60, player, () => hit++); maxY = Math.max(maxY, c.root.position.y); if (c.state === 'windup') wind = true }
    expect(wind && maxY > 0.5 && hit > 0).toBe(true)
  })
  it('nhieu is only hittable while solid and ignores hits otherwise', () => {
    const n = new Nhieu(mk(), new THREE.Vector3(0, 0, -6)); let solid = 0, phased = 0
    for (let i = 0; i < 60 * 12; i++) { n.update(1 / 60, player, () => {}); n.hittable ? solid++ : phased++ }
    expect(solid).toBeGreaterThan(60); expect(phased).toBeGreaterThan(60)
    n.state = "stagger"; for (let i = 0; i < 400 && n.hittable; i++) { n.st = 0; n.update(1 / 60, player, () => {}) }; expect(n.hittable).toBe(false)
    n.takeHit(30, at, dir, fx, false); expect(n.hp).toBe(35)
  })
  it('bong attack: windup then strike once per cycle', () => {
    const b = new Bong(mk(), new THREE.Vector3(0, 0, -1)); let n = 0; run(b, 6, () => n++); expect(n).toBeGreaterThanOrEqual(2)
  })
})
