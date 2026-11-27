import { describe, it, expect } from 'vitest'
import { makeDesign, setCell, WeaponDesign } from './model'
import { analyze, classOf, CLASS } from './analyze'
import { BLUEPRINTS } from './blueprints/registry'
import { cost, left, canPaint, affordable } from './economy'
import { NECK_LIMIT } from './regions'

/** Khối 8×8 from rows (row 0 = top, grip bottom-centre x=4,y=7). Chars: '.' empty, 'o' tho, other = material id first letter map */
const M: Record<string, string> = { o: 'tho', c: 'chi', t: 'thuytinh', m: 'magie' }
function khoi(rows: string[]): WeaponDesign {
  const d = makeDesign('khoi', 8), p = d.parts.khoi, off = 8 - rows.length
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') setCell(p, x, y + off, { mat: M[ch] }) }))
  return d
}
const sword = khoi(['....o...', '....o...', '....o...', '....o...', '....o...', '....o...', '....o...', '....o...'])
const club = khoi(['..oooo..', '..oooo..', '..oooo..', '..oooo..', '...oo...', '....o...', '....o...', '....o...'])

describe('analyze: tips, thickness, tags', () => {
  it('a pole has one tip at its far end; run 1 = sắc, all cạnh', () => {
    const st = analyze(sword)
    expect(st.tips.map(t => [t.x, t.y])).toEqual([[4, 0]])
    const tip = st.tags.get(0 * 4096 + 4)!
    expect(tip.thick).toBe('sac'); expect(tip.tags).toContain('mui'); expect(tip.tags).toContain('canh'); expect(tip.tags).toContain('dau')
  })
  it('blunt block: thickness ≥3 is cùn and gets no cạnh; interior is lõi', () => {
    const st = analyze(club), c = st.tags.get(1 * 4096 + 3)!
    expect(c.thick).toBe('cun'); expect(c.boundary).toBe(false); expect(c.tags).toEqual(expect.arrayContaining(['loi', 'dau']))
    const edge = st.tags.get(0 * 4096 + 2)!; expect(edge.boundary).toBe(true); expect(edge.tags).not.toContain('canh')
  })
  it('vừa = run 2 still counts as cạnh', () => {
    const st = analyze(khoi(['....oo..', '....oo..', '....oo..', '....oo..']))
    expect(st.tags.get(0 * 4096 + 4 + 4 * 4096 /* y offset */) ?? st.tags.get(4 * 4096 + 4)!).toBeTruthy()
    const t = [...st.tags.values()].find(x => x.run === 2)!; expect(t.thick).toBe('vua'); expect(t.tags).toContain('canh')
  })
  it('đầu = beyond 60 % of the reach only', () => {
    const st = analyze(sword), near = st.tags.get(6 * 4096 + 4)!, far = st.tags.get(0 * 4096 + 4)!
    expect(near.tags).not.toContain('dau'); expect(far.tags).toContain('dau')
  })
  it('a blob has no spurious tips, a spike on a blob does', () => {
    expect(analyze(club).tips.length).toBe(0)
    const st = analyze(khoi(['....o...', '..oooo..', '..oooo..', '..oooo..', '....o...', '....o...']))
    expect(st.tips.map(t => t.y)).toEqual([2])
  })
})

describe('analyze: necks', () => {
  it('thin handle under a heavy head is dễ gãy and the cut-off part is the head', () => {
    const d = khoi(['cccccccc', 'cccccccc', 'cccccccc', 'cccccccc', '....o...', '....o...', '....o...', '....o...'])
    const st = analyze(d)
    expect(st.neck).not.toBeNull(); expect(st.neck!.ratio).toBeGreaterThan(NECK_LIMIT)
    expect(st.neck!.width).toBeLessThanOrEqual(2); expect(st.neck!.keys.size).toBeGreaterThanOrEqual(30)
    expect(st.neck!.keys.has(0 * 4096 + 0)).toBe(true); expect(st.neck!.keys.has(7 * 4096 + 4)).toBe(false)
  })
  it('a plain sword or a light head is solid', () => {
    expect(analyze(sword).neck).toBeNull()
    expect(analyze(khoi(['..oooo..', '..oooo..', '....o...', '....o...'])).neck).toBeNull()
  })
  it('thickening the handle removes the neck', () => {
    const thin = khoi(['cccccccc', 'cccccccc', 'cccccccc', 'cccccccc', '....o...', '....o...'])
    const fat = khoi(['cccccccc', 'cccccccc', 'cccccccc', 'cccccccc', '..oooooo', '..oooooo'])
    expect(analyze(thin).neck).not.toBeNull(); expect(analyze(fat).neck).toBeNull()
  })
  it('tiny stubs are ignored', () => expect(analyze(khoi(['....o...', '....o...', '....o...'])).neck).toBeNull())
})

describe('analyze: class', () => {
  it('thresholds', () => { expect(classOf(CLASS.I1)).toBe('nhe'); expect(classOf(CLASS.I1 + 0.1)).toBe('vua'); expect(classOf(CLASS.I2 + 1)).toBe('nang') })
  it('Khối is nhẹ; fully filled blueprints order nhẹ < vừa < nặng by inertia', () => {
    expect(analyze(sword).cls).toBe('nhe')
    const full = (id: string) => { const d = makeDesign(id); for (const p of Object.values(d.parts)) p.cells = p.cells.map(() => ({ mat: 'tho' })); return analyze(d) }
    const [dao, kiem, bua] = ['dao', 'kiem', 'bua'].map(full)
    expect(dao.inertia).toBeLessThan(kiem.inertia); expect(kiem.inertia).toBeLessThan(bua.inertia)
    expect(dao.cls).toBe('nhe'); expect(kiem.cls).toBe('vua'); expect(bua.cls).toBe('nang')
  })
  it('heavy material pushes the same shape up a class', () => {
    const light = analyze(khoi(['....o...', '....o...', '....o...', '....o...'])), heavy = analyze(khoi(['....c...', '....c...', '....c...', '....c...']))
    expect(heavy.inertia).toBeGreaterThan(light.inertia * 2.5)
  })
})

describe('economy', () => {
  const owned = { mau: 10, stock: { chi: 2 } }
  it('cost counts Màu per cell and stock per special cell', () => {
    const c = cost(khoi(['....o...', '....c...', '....c...'])); expect(c.mau).toBe(3); expect(c.stock).toEqual({ chi: 2 })
  })
  it('left = owned − cost, never negative; erasing refunds 100 %', () => {
    const d = khoi(['....o...', '....c...']); expect(left(owned, d)).toEqual({ mau: 8, stock: { chi: 1 } })
    setCell(d.parts.khoi, 4, 7, null); expect(left(owned, d)).toEqual({ mau: 9, stock: { chi: 2 } })
    setCell(d.parts.khoi, 4, 6, null); expect(left(owned, d)).toEqual({ mau: 10, stock: { chi: 2 } })
    expect(left({ mau: 0, stock: {} }, khoi(['....c...'])).mau).toBe(0)
  })
  it('canPaint: needs Màu and own stock; replacing a cell costs no extra Màu', () => {
    const d = khoi(['....c...', '....c...'])
    expect(canPaint(owned, d, 'chi')).toBe(false)           // 2 chì used
    expect(canPaint(owned, d, 'tho')).toBe(true)
    expect(canPaint({ mau: 2, stock: { chi: 2 } }, d, 'tho')).toBe(false)  // no Màu left
    expect(canPaint({ mau: 2, stock: { chi: 2 } }, d, 'tho', 'chi')).toBe(true)  // swap a cell: free in Màu
    expect(canPaint({ mau: 9, stock: {} }, d, 'magie')).toBe(false)
  })
  it('affordable', () => { expect(affordable(owned, khoi(['....c...']))).toBe(true); expect(affordable({ mau: 1, stock: {} }, khoi(['....c...']))).toBe(false) })
  it('Khối blueprint registered', () => expect(BLUEPRINTS.khoi).toBeTruthy())
})
