// Kiếm: lưỡi 5×24, chắn 9×3, cán 3×8. Vừa. Đối xứng on by default.
import type { BlueprintDef } from './types'
export const kiem: BlueprintDef = {
  id: 'kiem', name: 'bp.kiem', voxel: 0.03, mirror: true,
  parts: [
    { id: 'luoi', name: 'part.luoi', w: 5, h: 24, at: [2, 0], ghost: (x, y) => (y === 0 ? x === 2 : x >= 1 && x <= 3) },
    { id: 'chan', name: 'part.chan', w: 9, h: 3, at: [0, 24], ghost: (x, y) => y === 1 || (x > 0 && x < 8) },
    { id: 'can', name: 'part.can', w: 3, h: 8, at: [3, 27], grip: [1, 4], ghost: (x, y) => x === 1 || y === 7 || (y > 0 && y < 6) },
  ],
}
