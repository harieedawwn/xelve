import { describe, it, expect } from 'vitest'
import { makeDesign, makePart, setCell, getCell, assemble, countCells, WeaponDesign } from '../weapon/model'
import { lineCells, paint, fill, tidy } from './ops'
import { History } from './history'
import { analyze, connectivity } from '../weapon/analyze'
import { voxelGeometry } from '../weapon/mesh'
import { BLUEPRINTS } from '../weapon/blueprints/registry'
import { khoiSize } from '../weapon/blueprints/khoi'
import { designProfile } from '../weapon/runtime'

const T = { mat: 'tho' }
function rng(seed: number) { return () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) }
function randomDesign(bp: string, seed: number, density = 0.45): WeaponDesign {
  const d = makeDesign(bp, 8), r = rng(seed), mats = ['tho', 'chi', 'nhom', 'caosu']
  for (const p of Object.values(d.parts)) for (let i = 0; i < p.cells.length; i++) if (r() < density) p.cells[i] = { mat: mats[Math.floor(r() * 4)] }
  return d
}

describe('Lưới ops', () => {
  it('line covers both ends without gaps', () => {
    const c = lineCells(0, 0, 5, 2)
    expect(c[0]).toEqual([0, 0]); expect(c[c.length - 1]).toEqual([5, 2])
    for (let i = 1; i < c.length; i++) expect(Math.max(Math.abs(c[i][0] - c[i - 1][0]), Math.abs(c[i][1] - c[i - 1][1]))).toBe(1)
  })
  it('mirror paints both sides', () => {
    const p = makePart('a', 5, 3); paint(p, 0, 1, T, true)
    expect(getCell(p, 4, 1)).toEqual(T); expect(getCell(p, 0, 1)).toEqual(T)
  })
  it('fill stops at borders and other materials', () => {
    const p = makePart('a', 4, 4); for (let y = 0; y < 4; y++) setCell(p, 2, y, { mat: 'chi' })
    fill(p, 0, 0, T, false)
    expect(p.cells.filter(c => c?.mat === 'tho').length).toBe(8); expect(getCell(p, 3, 0)).toBeNull()
  })
  it('Làm gọn removes lone cells and fills 1-cell holes', () => {
    const p = makePart('a', 5, 5)
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) if (!(x === 1 && y === 1)) setCell(p, x, y, T)
    setCell(p, 4, 4, T)
    expect(tidy(p)).toBe(2); expect(getCell(p, 1, 1)).toEqual(T); expect(getCell(p, 4, 4)).toBeNull()
  })
  it('history undo/redo round-trips and pop skips redo', () => {
    const d = makeDesign('khoi', 3), h = new History()
    h.push(d); setCell(d.parts.khoi, 0, 0, T)
    const back = h.undo(d)!; expect(countCells(back)).toBe(0)
    const fwd = h.redo(back)!; expect(countCells(fwd)).toBe(1)
    h.push(fwd); expect(h.pop()).not.toBeNull(); expect(h.canRedo).toBe(false)
  })
})

describe('design + analyze', () => {
  it('Khối grid follows progression', () => { expect([0, 2, 3, 4, 6, 9].map(khoiSize)).toEqual([1, 3, 3, 5, 8, 8]) })
  it('1-voxel Khối starts with the orange voxel at the grip', () => {
    const st = analyze(makeDesign('khoi', 1)); expect(st.connected.length).toBe(1); expect(st.loose.length).toBe(0)
  })
  it('parts sit on the assembled grid with the grip in the cán', () => {
    const a = assemble(makeDesign('kiem'))
    expect(a.w).toBe(9); expect(a.h).toBe(35); expect(a.grip).toEqual([4, 31])
    const b = assemble(makeDesign('bua')); expect(b.grip).toEqual([4, 25])
  })
  it('cells not connected to the grip are loose', () => {
    const d = makeDesign('dao'); const c = d.parts.can
    for (let y = 0; y < 6; y++) setCell(c, 1, y, T)
    setCell(d.parts.luoi, 1, 11, T) // touches cán top row → connected
    setCell(d.parts.luoi, 3, 2, T)  // floating
    const { connected, loose } = connectivity(assemble(d))
    expect(connected.length).toBe(7); expect(loose.length).toBe(1)
  })
  it('heavier material and longer reach raise mass, reach, inertia; speed drops', () => {
    const short = makeDesign('khoi', 8), long = makeDesign('khoi', 8)
    for (let y = 4; y < 8; y++) setCell(short.parts.khoi, 4, y, T)
    for (let y = 0; y < 8; y++) setCell(long.parts.khoi, 4, y, { mat: 'chi' })
    const a = analyze(short), b = analyze(long)
    expect(b.mass).toBeGreaterThan(a.mass); expect(b.reach).toBeGreaterThan(a.reach); expect(b.inertia).toBeGreaterThan(a.inertia)
    expect(b.bars.speed).toBeLessThan(a.bars.speed)
    expect(designProfile(b).inertia).toBeGreaterThan(designProfile(a).inertia)
  })
  it('thin far half reads as sharp, a solid slab as blunt', () => {
    const thin = makeDesign('khoi', 8), slab = makeDesign('khoi', 8)
    for (let y = 0; y < 8; y++) setCell(thin.parts.khoi, 4, y, T)
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) setCell(slab.parts.khoi, x, y, T)
    expect(analyze(thin).sharp).toBe(1); expect(analyze(slab).sharp).toBe(0)
  })
  it('bars stay in 0..1 for random drawings on every Bản vẽ', () => {
    for (const bp of Object.keys(BLUEPRINTS)) for (let s = 1; s < 20; s++) {
      const st = analyze(randomDesign(bp, s, s / 20))
      for (const v of Object.values(st.bars)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1) }
    }
  })
})

describe('mesh from ugly drawings', () => {
  it('random designs give finite, closed-looking geometry with textured faces', () => {
    for (const bp of Object.keys(BLUEPRINTS)) for (let s = 1; s < 15; s++) {
      const d = randomDesign(bp, s * 7), st = analyze(d), a = assemble(d)
      if (!st.connected.length) continue
      const g = voxelGeometry(st.connected, a.grip, a.voxel), pos = g.attributes.position.array as Float32Array
      expect(pos.length % 9).toBe(0)
      for (const v of pos) expect(Number.isFinite(v)).toBe(true)
      // one front quad per voxel
      const front = [...(g.attributes.normal.array as Float32Array)].filter((_, i) => i % 3 === 2).filter(z => z === 1).length / 6
      expect(front).toBeLessThanOrEqual(st.connected.length)
    }
  })
  it('a full 8×8 Khối has one textured quad per voxel face and no inner side faces', () => {
    const d = makeDesign('khoi', 8); for (let i = 0; i < 64; i++) d.parts.khoi.cells[i] = { mat: 'tho' }
    const st = analyze(d), a = assemble(d), g = voxelGeometry(st.connected, a.grip, a.voxel)
    expect(g.attributes.position.count).toBe(6 * 2 * 64 + 6 * 32) // 64 front + 64 back quads, 32 boundary edges
    expect(g.attributes.uv.count).toBe(g.attributes.position.count)
  })
  it('side faces point outward', () => {
    const d = makeDesign('khoi', 1), st = analyze(d), a = assemble(d), g = voxelGeometry(st.connected, a.grip, a.voxel)
    const p = g.attributes.position, n = g.attributes.normal
    for (let t = 0; t < p.count; t += 3) {
      const ax = p.getX(t), ay = p.getY(t), az = p.getZ(t)
      const ux = p.getX(t + 1) - ax, uy = p.getY(t + 1) - ay, uz = p.getZ(t + 1) - az
      const vx = p.getX(t + 2) - ax, vy = p.getY(t + 2) - ay, vz = p.getZ(t + 2) - az
      const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx
      expect(cx * n.getX(t) + cy * n.getY(t) + cz * n.getZ(t)).toBeGreaterThan(0)
    }
  })
})
