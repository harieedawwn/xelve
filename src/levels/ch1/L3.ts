import type { LevelData } from './types'
// L3 Cầu thang thoát hiểm: Bóng chạy come up the stairs; pipes → Chì, window frames → Nhôm. Message 3 on the floor-7 landing.
export const L3: LevelData = {
  id: 3, name: 'level.3', room: 'stairwell', length: 44, speed: 1.9,
  encounters: [
    { atS: 6, mode: 'stop', wave: [{ type: 'bong', door: 0 }, { type: 'chay', door: 'far' }] },
    { atS: 14, mode: 'stop', wave: [{ type: 'chay', door: 'far' }, { type: 'chay', door: 'far' }, { type: 'bong', door: 3 }] },
    { atS: 29, mode: 'stop', wave: [{ type: 'chay', door: 'far' }, { type: 'bong', door: 4 }, { type: 'chay', door: 'far' }] },
  ],
  pickups: [{ atS: 11, object: 'pipe9', gives: 'chi', side: 1 }, { atS: 17, object: 'frame13', gives: 'nhom', side: -1 }],
  message: { atS: 23, id: 3 }, doodles: [], unlocks: ['l3', 'chi', 'nhom'],
}
