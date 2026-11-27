// Dao: lưỡi 4×12 on cán 3×6, grip in the cán. Nhẹ, very fast.
import type { BlueprintDef } from './types'
export const dao: BlueprintDef = {
  id: 'dao', name: 'bp.dao', voxel: 0.03, mirror: false,
  parts: [
    { id: 'luoi', name: 'part.luoi', w: 4, h: 12, at: [0, 0], ghost: (x, y) => x < Math.min(4, 1 + y * 0.8) },
    { id: 'can', name: 'part.can', w: 3, h: 6, at: [0, 12], grip: [1, 3], ghost: (x, y) => !(y === 5 && x !== 1) },
  ],
}
