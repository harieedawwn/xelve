// Region analysis (weapon.md#4 steps 3–5, 7): thickness class, tips, necks, region tags. Pure, no three.js.
import type { Voxel } from './model'
import { mat } from './materials/registry'

export type Region = 'canh' | 'mui' | 'loi' | 'dau'
export type Thick = 'sac' | 'vua' | 'cun'
/** a region hangs on a neck when mass beyond it / neck width exceeds this (density units per cell) */
export const NECK_LIMIT = 40
/** ignore tiny stubs: the cut-off part must weigh at least this much */
export const NECK_MIN_MASS = 4
/** "đầu" = farther than this share of the reach from the grip */
export const HEAD_FROM = 0.6

export interface Tagged { v: Voxel; d: number; run: number; thick: Thick; boundary: boolean; tags: Region[] }
export interface Neck { layer: number; width: number; mass: number; ratio: number; keys: Set<number> }
export const vkey = (x: number, y: number) => y * 4096 + x
export const keyOf = (v: Voxel) => vkey(v.x, v.y)
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]]
const weight = (v: Voxel) => mat(v.mat).density * v.depth

/** horizontal run (across the long axis) containing each cell, in cells */
export function thicknessRuns(vs: Voxel[]): Map<number, number> {
  const set = new Set(vs.map(keyOf)), out = new Map<number, number>()
  for (const v of vs) {
    let run = 1
    for (let x = v.x - 1; set.has(vkey(x, v.y)); x--) run++
    for (let x = v.x + 1; set.has(vkey(x, v.y)); x++) run++
    out.set(keyOf(v), run)
  }
  return out
}
export const thickClass = (run: number): Thick => (run <= 1 ? 'sac' : run === 2 ? 'vua' : 'cun')

/** boundary cells with exactly one filled 4-neighbour that sit at a local maximum of the distance from the grip */
export function findTips(vs: Voxel[], grip: [number, number]): Voxel[] {
  const map = new Map(vs.map(v => [keyOf(v), v])), dist = (v: Voxel) => Math.hypot(v.x - grip[0], v.y - grip[1])
  const tips: Voxel[] = []
  for (const v of vs) {
    let n = 0; for (const [dx, dy] of N4) if (map.has(vkey(v.x + dx, v.y + dy))) n++
    if (n !== 1) continue
    const d = dist(v); let top = true
    for (const [dx, dy] of N8) { const o = map.get(vkey(v.x + dx, v.y + dy)); if (o && dist(o) > d + 1e-9) { top = false; break } }
    if (top) tips.push(v)
  }
  return tips
}

/** The weakest connection: BFS layers from the grip, a layer's width is the cut width. */
export function findNeck(vs: Voxel[], grip: [number, number]): Neck | null {
  if (vs.length < 2) return null
  const map = new Map(vs.map(v => [keyOf(v), v]))
  let start = map.get(vkey(grip[0], grip[1])), best = Infinity
  if (!start) for (const v of vs) { const d = (v.x - grip[0]) ** 2 + (v.y - grip[1]) ** 2; if (d < best) { best = d; start = v } }
  const layerOf = new Map<number, number>([[keyOf(start!), 0]]), layers: Voxel[][] = [[start!]]
  for (let i = 0; i < layers.length; i++) {
    const next: Voxel[] = []
    for (const v of layers[i]) for (const [dx, dy] of N4) {
      const k = vkey(v.x + dx, v.y + dy), o = map.get(k)
      if (o && !layerOf.has(k)) { layerOf.set(k, i + 1); next.push(o) }
    }
    if (next.length) layers.push(next)
  }
  const mass = layers.map(l => l.reduce((s, v) => s + weight(v), 0))
  let beyond = mass.reduce((a, b) => a + b, 0) - mass[0], pick: { layer: number; ratio: number; mass: number } | null = null
  // among cuts that are too thin for what hangs on them, take the narrowest, and of those the outermost (just under the head)
  for (let L = 1; L < layers.length - 1; L++) {
    beyond -= mass[L]
    const ratio = beyond / layers[L].length
    if (beyond >= NECK_MIN_MASS && ratio > NECK_LIMIT && (!pick || layers[L].length <= layers[pick.layer].length)) pick = { layer: L, ratio, mass: beyond }
  }
  if (!pick) return null
  const keys = new Set<number>(); for (const [k, l] of layerOf) if (l > pick.layer) keys.add(k)
  return { layer: pick.layer, width: layers[pick.layer].length, mass: pick.mass, ratio: pick.ratio, keys }
}

/** cạnh / mũi / lõi / đầu per connected voxel (weapon.md#4.7) */
export function tagVoxels(vs: Voxel[], grip: [number, number], reach: number, voxel: number, tips: Voxel[]): Map<number, Tagged> {
  const set = new Set(vs.map(keyOf)), runs = thicknessRuns(vs), tipKeys = new Set(tips.map(keyOf)), out = new Map<number, Tagged>()
  for (const v of vs) {
    const k = keyOf(v), run = runs.get(k)!, thick = thickClass(run)
    const boundary = N4.some(([dx, dy]) => !set.has(vkey(v.x + dx, v.y + dy)))
    const d = Math.hypot(v.x - grip[0], v.y - grip[1]), tags: Region[] = []
    if (boundary && thick !== 'cun') tags.push('canh')
    if (tipKeys.has(k)) tags.push('mui')
    if (!boundary) tags.push('loi')
    if (d * voxel > reach * HEAD_FROM) tags.push('dau')
    out.set(k, { v, d, run, thick, boundary, tags })
  }
  return out
}
