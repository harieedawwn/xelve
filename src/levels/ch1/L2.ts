import type { LevelData } from './types'
// L2 Văn phòng: Ve's desk, faces rubbed out, sketchbook page → Xưởng 3×3. Glass partitions. Message 2.
export const L2: LevelData = {
  id: 2, name: 'level.2', room: 'office', length: 40, speed: 1.8,
  encounters: [
    { atS: 8, mode: 'stop', wave: [{ type: 'bong', door: 0 }, { type: 'bong', door: 1 }] },
    { atS: 16, mode: 'stop', wave: [{ type: 'bong', door: 2 }, { type: 'bong', door: 3 }, { type: 'bong', door: 'far' }] },
    { atS: 29, mode: 'stop', wave: [{ type: 'bong', door: 4 }, { type: 'bong', door: 5 }, { type: 'bong', door: 'far' }] },
  ],
  pickups: [{ atS: 21, object: 'page', gives: 'grid3', side: -1 }],
  message: { atS: 24, id: 2 }, doodles: [], unlocks: ['l2', 'grid3', 'thuytinh'], forge: 3,
}
