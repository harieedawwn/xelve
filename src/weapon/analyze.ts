// analyze(design) → stats (weapon.md#4): connectivity, mass, reach, inertia, thickness, tips, necks, class, region tags, the 5 Xưởng bars.
import { assemble, Assembled, Voxel, WeaponDesign } from './model'
import { mat } from './materials/registry'
import { Neck, Tagged, findNeck, findTips, keyOf, tagVoxels, thicknessRuns, vkey } from './regions'

export interface Stats {
  connected: Voxel[]; loose: Voxel[]
  mass: number; reach: number; inertia: number   // mass in density units, reach in m, inertia Σρ·d² in m²
  sharp: number                                   // 0..1 share of thin (run ≤ 2) cells in the far half
  tips: Voxel[]; neck: Neck | null                // mũi cells; weakest connection (null = solid)
  cls: WeaponClass                                // nhẹ / vừa / nặng (inertia thresholds)
  tags: Map<number, Tagged>                       // region tags per connected voxel (key = y*4096+x)
  bars: { dmg: number; speed: number; reach: number; sharp: number; heavy: number } // 0..1 for the Xưởng bars
}
const key = vkey

/** 4-neighbour flood fill from the grip cell; with no voxel on the grip, from the voxel nearest to it. */
export function connectivity(a: Assembled): { connected: Voxel[]; loose: Voxel[] } {
  if (!a.voxels.length) return { connected: [], loose: [] }
  const map = new Map<number, Voxel>(); for (const v of a.voxels) map.set(key(v.x, v.y), v)
  let start = map.get(key(a.grip[0], a.grip[1]))
  if (!start) { let best = Infinity; for (const v of a.voxels) { const d = (v.x - a.grip[0]) ** 2 + (v.y - a.grip[1]) ** 2; if (d < best) { best = d; start = v } } }
  const seen = new Set<number>([key(start!.x, start!.y)]), q = [start!]
  while (q.length) {
    const v = q.pop()!
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = key(v.x + dx, v.y + dy), n = map.get(k)
      if (n && !seen.has(k)) { seen.add(k); q.push(n) }
    }
  }
  const connected: Voxel[] = [], loose: Voxel[] = []
  for (const v of a.voxels) (seen.has(key(v.x, v.y)) ? connected : loose).push(v)
  return { connected, loose }
}

export const BAR_NORM = { mass: 120, reach: 0.9, inertia: 4, dmg: 8 }
export type WeaponClass = 'nhe' | 'vua' | 'nang'
/** inertia Σρd² (m²) class limits: ≤ I1 nhẹ (no Lực), > I2 nặng (Lực + Đỡ) */
export const CLASS = { I1: 6, I2: 60 }
export const classOf = (inertia: number): WeaponClass => (inertia <= CLASS.I1 ? 'nhe' : inertia > CLASS.I2 ? 'nang' : 'vua')

export function analyze(d: WeaponDesign): Stats { const a = assemble(d), c = connectivity(a); return analyzeVoxels(a, c.connected, c.loose) }

/** stats of an explicit voxel set (used after a neck breaks off) */
export function analyzeVoxels(a: Assembled, connected: Voxel[], loose: Voxel[]): Stats {
  let mass = 0, reach = 0, inertia = 0
  const s = a.voxel
  for (const v of connected) {
    const rho = mat(v.mat).density * v.depth
    const dd = ((v.x - a.grip[0]) ** 2 + (v.y - a.grip[1]) ** 2) * s * s
    mass += rho; inertia += rho * dd; reach = Math.max(reach, Math.sqrt(dd) + s / 2)
  }
  // thickness = horizontal run (across the long axis) containing the cell
  const runs = thicknessRuns(connected)
  let far = 0, thin = 0
  for (const v of connected) {
    if (Math.hypot(v.x - a.grip[0], v.y - a.grip[1]) * s > reach * 0.5) { far++; if (runs.get(keyOf(v))! <= 2) thin++ }
  }
  const sharp = far ? thin / far : 0
  const c = (x: number) => Math.max(0, Math.min(1, x))
  const speed = 1 / (1 + inertia / BAR_NORM.inertia)
  const dmg = Math.sqrt(Math.min(mass, 40)) * (0.8 + 0.45 * sharp) * (0.5 + 0.5 * c(reach / BAR_NORM.reach))
  const tips = findTips(connected, a.grip)
  return {
    connected, loose, mass, reach, inertia, sharp, tips, neck: findNeck(connected, a.grip), cls: classOf(inertia),
    tags: tagVoxels(connected, a.grip, reach, s, tips),
    bars: { dmg: c(dmg / BAR_NORM.dmg), speed: c(speed), reach: c(reach / BAR_NORM.reach), sharp: c(sharp), heavy: c(mass / BAR_NORM.mass) },
  }
}
