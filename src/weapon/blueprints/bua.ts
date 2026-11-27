// Búa: đầu 10×8 (2 voxels deep), cán 3×20, grip at the cán end. Nặng. Đối xứng on by default.
import type { BlueprintDef } from './types'
export const bua: BlueprintDef = {
  id: 'bua', name: 'bp.bua', voxel: 0.03, mirror: true,
  parts: [
    { id: 'dau', name: 'part.dau', w: 10, h: 8, at: [0, 0], depth: 2, ghost: (x, y) => (y > 0 && y < 7) || (x > 0 && x < 9) },
    { id: 'can', name: 'part.can', w: 3, h: 20, at: [3, 8], grip: [1, 17], ghost: (x, y) => x === 1 || y >= 14 },
  ],
}
