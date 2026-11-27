import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { resolveEffects, Contact } from './effects'
import { Status, STATUS } from './status'
import { Weapon } from './weapon'
import { makeDesign, setCell } from '../weapon/model'
import { MATERIALS } from '../weapon/materials/registry'

const hit = (c: Contact[], o: Partial<{ charge: number; weak: boolean; sharp: boolean }> = {}) => resolveEffects(c, { charge: 1, weak: false, sharp: true, ...o })
const kinds = (c: Contact[], o = {}) => hit(c, o).statuses.map(s => s.kind)

describe('material effects need their region AND contact', () => {
  it('thô does nothing; a sharp edge alone causes Chảy máu', () => {
    expect(hit([{ mat: 'tho', tags: ['loi'] }]).statuses).toEqual([])
    expect(kinds([{ mat: 'tho', tags: ['canh'] }])).toEqual(['chaymau'])
    expect(kinds([{ mat: 'tho', tags: ['canh'] }], { sharp: false })).toEqual([])       // blunt weapon: no cut
  })
  it('Chì: more damage and knockback, anywhere', () => { const f = hit([{ mat: 'chi', tags: ['loi'] }]); expect(f.dmgMult).toBeGreaterThan(1); expect(f.knock).toBeGreaterThan(1) })
  it('Thuỷ tinh: Chảy máu ×1.6 only from cạnh, and it chips', () => {
    const f = hit([{ mat: 'thuytinh', tags: ['canh'] }]); expect(f.statuses.find(s => s.kind === 'chaymau' && s.power === 1.6)).toBeTruthy(); expect(f.chip).toBe(true)
    expect(hit([{ mat: 'thuytinh', tags: ['loi'] }]).chip).toBe(false)               // glass in the core: just density
  })
  it('Magie: Bỏng only from cạnh/mũi AND Điểm yếu, and it spreads', () => {
    const m: Contact[] = [{ mat: 'magie', tags: ['mui', 'canh'] }]
    expect(kinds(m)).not.toContain('bong'); expect(kinds(m, { weak: true })).toContain('bong'); expect(hit(m, { weak: true }).spread).toBe(true)
    expect(kinds([{ mat: 'magie', tags: ['loi'] }], { weak: true })).not.toContain('bong')
  })
  it('Cao su: no cut, Đẩy lùi ×2.5, bounces', () => {
    const f = hit([{ mat: 'caosu', tags: ['canh'] }]); expect(f.cut).toBe(false); expect(f.statuses).toEqual([]); expect(f.knock).toBe(2.5); expect(f.bounce).toBeGreaterThan(1)
  })
  it('Đá khô: Đóng băng only at lực ≥ 0.9', () => {
    const d: Contact[] = [{ mat: 'dakho', tags: ['loi'] }]
    expect(kinds(d, { charge: 0.5 })).not.toContain('dongbang'); expect(kinds(d, { charge: 0.9 })).toContain('dongbang')
  })
  it('each material counts once even if many voxels touch', () => {
    const c: Contact = { mat: 'chi', tags: ['canh'] }; expect(hit([c, c, c]).dmgMult).toBe(hit([c]).dmgMult)
  })
  it('every registered effect has a valid shape', () => {
    for (const m of Object.values(MATERIALS)) if (m.effect) { expect(m.effect.region).toBeTruthy(); if (m.effect.status) expect(m.effect.status.secs).toBeGreaterThan(0) }
  })
})

describe('status', () => {
  it('Chảy máu and Bỏng deal damage over time then stop; power scales', () => {
    const s = new Status(); s.apply('chaymau', 3); let d = 0; for (let i = 0; i < 400; i++) d += s.tick(0.01)
    expect(d).toBeCloseTo(STATUS.dps.chaymau * 3, 1); expect(s.bleeding).toBe(false)
    const b = new Status(); b.apply('chaymau', 3, 1.6); let e = 0; for (let i = 0; i < 400; i++) e += b.tick(0.01); expect(e / d).toBeCloseTo(1.6, 1)
    const f = new Status(); f.apply('bong', 3); expect(f.burning).toBe(true)
  })
  it('Đóng băng stops time: no DoT, thaws after its timer; a heavy hit shatters', () => {
    const s = new Status(); s.apply('bong', 3); s.apply('dongbang', 2)
    expect(s.tick(1)).toBe(0); expect(s.frozen).toBe(true); expect(s.bong).toBe(3)
    expect(s.shatter(0.2, false)).toBe(1); expect(s.frozen).toBe(true)
    expect(s.shatter(1, false)).toBe(STATUS.shatterMult); expect(s.frozen).toBe(false)
    const t = new Status(); t.apply('dongbang', 2); t.tick(2.1); expect(t.frozen).toBe(false)
  })
  it('a blunt (cùn) hit also shatters; Choáng times out', () => {
    const s = new Status(); s.apply('dongbang', 2); expect(s.shatter(0, true)).toBe(STATUS.shatterMult)
    s.apply('choang', 1.2); expect(s.stunned).toBe(true); s.tick(1.3); expect(s.stunned).toBe(false)
  })
  it('longer timer / stronger power wins, clear resets', () => { const s = new Status(); s.apply('bong', 3); s.apply('bong', 1); expect(s.bong).toBe(3); s.clear(); expect(s.burning).toBe(false) })
})

describe('weapon runtime: necks, glass chips, contacts', () => {
  const axe = () => {
    const d = makeDesign('khoi', 8), p = d.parts.khoi
    for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) setCell(p, x, y, { mat: 'chi' })
    for (let y = 4; y < 8; y++) setCell(p, 4, y, { mat: 'tho' })
    return d
  }
  it('first full-charge hit snaps the head off, once; restore() regrows it', () => {
    const w = new Weapon(new THREE.PerspectiveCamera()); w.setDesign(axe())
    const before = w.current!.connected.length, ineBefore = w.profile.inertia
    expect(w.current!.neck).not.toBeNull()
    expect(w.breakNeck()).toBe(true); expect(w.current!.connected.length).toBeLessThanOrEqual(5); expect(w.profile.inertia).toBeLessThan(ineBefore)
    expect(w.breakNeck()).toBe(false)
    w.restore(); expect(w.current!.connected.length).toBe(before)
  })
  it('contacts: tip sample sees the tip voxel material and tags', () => {
    const d = makeDesign('khoi', 8); for (let y = 0; y < 8; y++) setCell(d.parts.khoi, 4, y, { mat: y === 0 ? 'magie' : 'tho' })
    const w = new Weapon(new THREE.PerspectiveCamera()); w.setDesign(d)
    const tip = w.contacts[3][0]; expect(tip.mat).toBe('magie'); expect(tip.tags).toContain('mui')
    expect(w.contacts[0].every(c => c.mat === 'tho')).toBe(true)
  })
  it('glass chips off the weapon on armour, never the last voxel; restore() puts it back', () => {
    const d = makeDesign('khoi', 8); for (let y = 0; y < 6; y++) setCell(d.parts.khoi, 4, y + 2, { mat: y < 3 ? 'thuytinh' : 'tho' })
    const w = new Weapon(new THREE.PerspectiveCamera()); w.setDesign(d)
    const n = w.current!.connected.length; expect(w.chip(3)).toBe(true); expect(w.current!.connected.length).toBe(n - 1)
    w.restore(); expect(w.current!.connected.length).toBe(n)
  })
  it('Nhôm swings faster than the same shape in thô; class sets Lực', () => {
    const mk = (m: string) => { const d = makeDesign('khoi', 8); for (let y = 0; y < 8; y++) setCell(d.parts.khoi, 4, y, { mat: m }); const w = new Weapon(new THREE.PerspectiveCamera()); w.setDesign(d); return w.profile }
    expect(mk('nhom').inertia).toBeLessThan(mk('tho').inertia); expect(mk('tho').charged).toBe(false)
  })
})

describe('Phòng tập demos', () => {
  it('Búa with a chì head is nặng, charged and has a neck; material poles carry their material at the tip', async () => {
    const { neckDemo, materialDemo } = await import('../weapon/demo')
    const w = new Weapon(new THREE.PerspectiveCamera()); w.setDesign(neckDemo())
    expect(w.current!.cls).toBe('nang'); expect(w.profile.charged).toBe(true); expect(w.current!.neck).not.toBeNull()
    for (const id of Object.keys(MATERIALS)) { const p = new Weapon(new THREE.PerspectiveCamera()); p.setDesign(materialDemo(id)); expect(p.contacts[3][0].mat).toBe(id) }
  })
})
