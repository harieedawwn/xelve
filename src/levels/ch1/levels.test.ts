import { describe, it, expect } from 'vitest'
import { CH1, level } from '.'
import { ENEMIES } from '../../enemies/registry'
import { vi } from '../../i18n/vi'
import { completeLevel, pickupName } from '../../story/progress'
import { khoiSize } from '../../weapon/economy'
import { defaults } from '../../core/save'
import * as THREE from 'three'
import { spawnPoint, visibleEntry } from '../entry'
import { EYE, FIGHT_FOV, FIGHT_PITCH } from '../../camera/consts'

// P15: no enemy may appear inside the view (door/phase entries excepted), for phone and tablet aspects and a turned head
describe('spawn entries', () => {
  const cams: THREE.PerspectiveCamera[] = []
  for (const aspect of [20 / 9, 16 / 9, 4 / 3]) for (const yaw of [-0.3, 0, 0.3]) for (const pitch of [FIGHT_PITCH, -0.5]) {
    const c = new THREE.PerspectiveCamera(FIGHT_FOV, aspect, 0.03, 80); c.rotation.order = 'YXZ'; c.rotation.set(pitch, yaw, 0); cams.push(c)
  }
  const fr = new THREE.Frustum(), m = new THREE.Matrix4(), doors = Array.from({ length: 6 }, () => new THREE.Vector3())
  it('left/right/drop spawns start outside the camera frustum', () => {
    let n = 0
    for (const l of CH1) for (const e of l.encounters) e.wave.forEach((w, i) => {
      if (visibleEntry(w)) return
      const z = -(e.atS - 0.5), p = spawnPoint(w, i, z, doors)
      for (const c of cams) {
        c.position.set(0, EYE, z); c.updateMatrixWorld(); m.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse); fr.setFromProjectionMatrix(m)
        for (const h of [0, 0.9, 1.75]) expect(fr.containsPoint(p.clone().setY(p.y + h)), `L${l.id}@${e.atS} ${w.type} ${w.entry}`).toBe(false)
      }
      n++
    })
    expect(n).toBeGreaterThan(10)
  })
})

describe('chapter 1 level data', () => {
  it('ids are 1..n, in order, and found by level()', () => { CH1.forEach((l, i) => { expect(l.id).toBe(i + 1); expect(level(l.id)).toBe(l) }) })
  it('encounters are sorted, inside the rail, use known enemies and door slots 0..5', () => {
    for (const l of CH1) {
      let last = 0
      for (const e of l.encounters) {
        expect(e.atS).toBeGreaterThan(last); last = e.atS; expect(e.atS).toBeLessThan(l.length - 1)
        for (const w of e.wave) { expect(ENEMIES[w.type]).toBeDefined(); if (w.entry === 'door') { expect(w.door).toBeGreaterThanOrEqual(0); expect(w.door).toBeLessThan(6) } if (w.entry === 'phase') expect(w.type).toBe('nhieu') }
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
  it('messages 1-6 map to L1-L4, L6, L8 in order; L5 and L8 are boss scenes', () => {
    expect(CH1.map(l => l.message?.id)).toEqual([1, 2, 3, 4, undefined, 5, undefined, 6]); expect(CH1.filter(l => l.boss).map(l => l.boss)).toEqual(['nguoigac', 'dong'])
  })
  it('rail levels have encounters and pickups name known objects/gives; bosses have none', () => {
    for (const l of CH1) { if (l.boss) { expect(l.encounters).toEqual([]); continue }; expect(l.encounters.length).toBeGreaterThan(0); for (const p of l.pickups) expect(pickupName(p.gives)).toBeTruthy() }
  })
  it('completing levels unlocks flags, grid sizes and progress (once)', () => {
    const s = defaults(); expect(khoiSize(s)).toBe(1)
    completeLevel(s, level(2)!); expect(khoiSize(s)).toBe(3); expect(s.progress.level).toBe(2); expect(s.unlocked).toContain('thuytinh')
    completeLevel(s, level(4)!); expect(khoiSize(s)).toBe(5)
    completeLevel(s, level(1)!); expect(s.progress.level).toBe(4)
    const n = s.unlocked.length; completeLevel(s, level(4)!); expect(s.unlocked.length).toBe(n)
  })
  it('pickup names resolve (material or drop key)', () => { for (const g of ['chi', 'nhom', 'magie', 'grid3', 'grid8', 'bua', 'caosu', 'dakho']) expect(pickupName(g)).toBeTruthy() })
  it('forge opens only where the level says (L2 3×3, L4 5×5, L6 8×8)', () => {
    expect(CH1.filter(l => l.forge).map(l => [l.id, l.forge])).toEqual([[2, 3], [4, 5], [6, 8]])
    const s = defaults(); completeLevel(s, level(6)!); expect(khoiSize(s)).toBe(8); expect(s.unlocked).toContain('bua')
  })
})
