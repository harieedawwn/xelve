// analyze(design) → stats (weapon.md#4). P6 part: connectivity, mass, reach, inertia, thickness, the 5 Xưởng bars.
// P7 adds tips, necks, class thresholds and region tags on top of this.
import { assemble, Assembled, Voxel, WeaponDesign } from './model'
import { mat } from './materials/registry'

export interface Stats {
  connected: Voxel[]; loose: Voxel[]
  mass: number; reach: number; inertia: number   // mass in density units, reach in m, inertia Σρ·d² in m²
  sharp: number                                   // 0..1 share of thin (run ≤ 2) cells in the far half
  bars: { dmg: number; speed: number; reach: number; sharp: number; heavy: number } // 0..1 for the Xưởng bars
}
const key = (x: number, y: number) => y * 4096 + x

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

export function analyze(d: WeaponDesign): Stats {
  const a = assemble(d), { connected, loose } = connectivity(a)
  let mass = 0, reach = 0, inertia = 0
  const s = a.voxel, rows = new Map<number, number[]>()
  for (const v of connected) {
    const rho = mat(v.mat).density * v.depth
    const dd = ((v.x - a.grip[0]) ** 2 + (v.y - a.grip[1]) ** 2) * s * s
    mass += rho; inertia += rho * dd; reach = Math.max(reach, Math.sqrt(dd) + s / 2)
    const r = rows.get(v.y) ?? []; r.push(v.x); rows.set(v.y, r)
  }
  // thickness = horizontal run (across the long axis) containing the cell
  let far = 0, thin = 0
  for (const v of connected) {
    const xs = rows.get(v.y)!; let run = 1
    for (let x = v.x - 1; xs.includes(x); x--) run++
    for (let x = v.x + 1; xs.includes(x); x++) run++
    if (Math.hypot(v.x - a.grip[0], v.y - a.grip[1]) * s > reach * 0.5) { far++; if (run <= 2) thin++ }
  }
  const sharp = far ? thin / far : 0
  const c = (x: number) => Math.max(0, Math.min(1, x))
  const speed = 1 / (1 + inertia / BAR_NORM.inertia)
  const dmg = Math.sqrt(Math.min(mass, 40)) * (0.8 + 0.45 * sharp) * (0.5 + 0.5 * c(reach / BAR_NORM.reach))
  return {
    connected, loose, mass, reach, inertia, sharp,
    bars: { dmg: c(dmg / BAR_NORM.dmg), speed: c(speed), reach: c(reach / BAR_NORM.reach), sharp: c(sharp), heavy: c(mass / BAR_NORM.mass) },
  }
}
