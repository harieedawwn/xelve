import { describe, it, expect } from 'vitest'
import { MATERIALS } from './registry'
import { TEX_IDS, tileUV } from './textures'
describe('material textures', () => {
  it('every material names a texture recipe; tiles are distinct and inside 0..1', () => {
    const seen = new Set<string>()
    for (const m of Object.values(MATERIALS)) {
      expect(TEX_IDS).toContain(m.tex)
      const uv = tileUV(m.tex); seen.add(uv.join(','))
      for (const v of uv) { expect(v).toBeGreaterThan(0); expect(v).toBeLessThan(1) }
    }
    expect(seen.size).toBe(Object.keys(MATERIALS).length)
  })
})
