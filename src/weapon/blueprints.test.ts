import { describe, it, expect } from 'vitest'
import { BLUEPRINTS } from './blueprints/registry'
import { makeDesign, assemble, setCell } from './model'
import { analyze } from './analyze'
import { designProfile } from './runtime'
import { storeDesign, equippedDesign, savedDesign } from './store'

const SPEC: Record<string, Record<string, [number, number]>> = {
  dao: { luoi: [4, 12], can: [3, 6] },
  kiem: { luoi: [5, 24], chan: [9, 3], can: [3, 8] },
  bua: { dau: [10, 8], can: [3, 20] },
}
const filled = (id: string) => { const d = makeDesign(id); for (const p of Object.values(d.parts)) p.cells = p.cells.map(() => ({ mat: 'tho' })); return d }

describe('P9 blueprints', () => {
  for (const [id, parts] of Object.entries(SPEC)) {
    it(`${id}: part sizes match weapon.md#3, one grip inside the cán, parts touch`, () => {
      const bp = BLUEPRINTS[id]
      expect(bp.parts.map(p => p.id).sort()).toEqual(Object.keys(parts).sort())
      for (const p of bp.parts) expect([p.w, p.h]).toEqual(parts[p.id])
      const grips = bp.parts.filter(p => p.grip); expect(grips.map(p => p.id)).toEqual(['can'])
      const g = grips[0].grip!; expect(g[0]).toBeLessThan(grips[0].w); expect(g[1]).toBeLessThan(grips[0].h)
      const a = assemble(filled(id)), st = analyze(filled(id))
      expect(st.loose.length).toBe(0); expect(st.connected.length).toBe(a.voxels.length)   // every part is joined to the grip
      expect(a.grip[1]).toBeGreaterThan(a.h / 2)                                            // held near the bottom, tip up
    })
    it(`${id}: ghost silhouette fits its part`, () => {
      for (const p of BLUEPRINTS[id].parts) { let n = 0; for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.ghost?.(x, y)) n++; expect(n).toBeGreaterThan(0) }
    })
  }
  it('Búa head is 2 deep; others 1', () => {
    expect(assemble(filled('bua')).voxels.some(v => v.depth === 2)).toBe(true)
    expect(assemble(filled('kiem')).voxels.every(v => v.depth === 1)).toBe(true)
  })
  it('swing profile: Dao < Kiếm < Búa inertia, Búa is charged', () => {
    const [d, k, b] = ['dao', 'kiem', 'bua'].map(id => designProfile(analyze(filled(id)), id))
    expect(d.inertia).toBeLessThan(k.inertia); expect(k.inertia).toBeLessThan(b.inertia)
    expect([d.charged, k.charged, b.charged]).toEqual([false, true, true])
  })
  it('a drawing cut at the neck leaves loose cells', () => {
    const d = filled('dao'); for (let x = 0; x < 3; x++) setCell(d.parts.can, x, 2, null)
    expect(analyze(d).loose.length).toBeGreaterThan(0)
  })
  it('equip flow: saving a design equips it, one saved design per Bản vẽ, switching equips the other', () => {
    storeDesign(filled('dao')); expect(equippedDesign()!.blueprint).toBe('dao')
    storeDesign(filled('kiem')); expect(equippedDesign()!.blueprint).toBe('kiem')
    storeDesign(filled('dao'), false); expect(equippedDesign()!.blueprint).toBe('kiem')
    expect(savedDesign('bua')).toBeNull()
  })
})
