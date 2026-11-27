// Khối: free square grid (1 → 3 → 5 → 8 by progression), 4 cm voxels, grip bottom-centre.
import type { BlueprintDef } from './types'
export const khoi: BlueprintDef = { id: 'khoi', name: 'bp.khoi', voxel: 0.04, mirror: false, parts: [{ id: 'khoi', name: 'bp.khoi', w: 8, h: 8, at: [0, 0] }] }
/** Khối grid by progress (weapon.md#2): start 1, L2 → 3, L4 → 5, L6 → 8 */
export const KHOI_GRID: [number, number][] = [[6, 8], [4, 5], [2, 3]]
export const khoiSize = (level: number) => KHOI_GRID.find(([l]) => level >= l)?.[1] ?? 1
