// Weapon design data (weapon.md#1): parts are 2D grids extruded to voxels. Row 0 = top (tip end).
import { BLUEPRINTS, BlueprintDef, PartDef } from './blueprints/registry'

export type Cell = { mat: string } | null
export interface Part { id: string; w: number; h: number; cells: Cell[]; grip?: [number, number] }
export interface WeaponDesign { blueprint: string; parts: Record<string, Part> }
export interface Voxel { x: number; y: number; mat: string; depth: number; part: string }
export interface Assembled { voxels: Voxel[]; grip: [number, number]; voxel: number; w: number; h: number }

export const makePart = (id: string, w: number, h: number): Part => ({ id, w, h, cells: new Array(w * h).fill(null) })
export const inPart = (p: Part, x: number, y: number) => x >= 0 && y >= 0 && x < p.w && y < p.h
export const getCell = (p: Part, x: number, y: number): Cell => (inPart(p, x, y) ? p.cells[y * p.w + x] : null)
export function setCell(p: Part, x: number, y: number, c: Cell) { if (inPart(p, x, y)) p.cells[y * p.w + x] = c }
export const clonePart = (p: Part): Part => ({ ...p, cells: p.cells.map(c => (c ? { mat: c.mat } : null)) })
export const cloneDesign = (d: WeaponDesign): WeaponDesign => ({ blueprint: d.blueprint, parts: Object.fromEntries(Object.entries(d.parts).map(([k, p]) => [k, clonePart(p)])) })
export const countCells = (d: WeaponDesign) => Object.values(d.parts).reduce((n, p) => n + p.cells.filter(Boolean).length, 0)

/** Khối takes its grid size from progression (weapon.md#2); Bản vẽ parts are fixed. */
export function makeDesign(bpId: string, khoiSize = 8): WeaponDesign {
  const bp = BLUEPRINTS[bpId]
  const parts: Record<string, Part> = {}
  for (const d of bp.parts) {
    const w = bp.id === 'khoi' ? khoiSize : d.w, h = bp.id === 'khoi' ? khoiSize : d.h
    parts[d.id] = makePart(d.id, w, h)
  }
  if (bp.id === 'khoi' && khoiSize === 1) setCell(parts.khoi, 0, 0, { mat: 'tho' })
  return { blueprint: bp.id, parts }
}

export const partDef = (bp: BlueprintDef, id: string): PartDef => bp.parts.find(p => p.id === id)!
/** grip cell of a part: the def's fixed grip, or bottom-centre for the free Khối grid */
export const gripOf = (bp: BlueprintDef, p: Part): [number, number] => partDef(bp, p.id).grip ?? [Math.floor(p.w / 2), p.h - 1]

/** All parts placed on one global grid at their anchors. */
export function assemble(d: WeaponDesign): Assembled {
  const bp = BLUEPRINTS[d.blueprint]
  const voxels: Voxel[] = []
  let grip: [number, number] = [0, 0], w = 0, h = 0
  for (const def of bp.parts) {
    const p = d.parts[def.id]; if (!p) continue
    const [ax, ay] = def.at
    w = Math.max(w, ax + p.w); h = Math.max(h, ay + p.h)
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const c = p.cells[y * p.w + x]
      if (c) voxels.push({ x: ax + x, y: ay + y, mat: c.mat, depth: def.depth ?? 1, part: def.id })
    }
    if (def.grip || bp.parts.length === 1) { const g = gripOf(bp, p); grip = [ax + g[0], ay + g[1]] }
  }
  return { voxels, grip, voxel: bp.voxel, w, h }
}
