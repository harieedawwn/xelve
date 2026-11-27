import type { LevelData } from './types'
// L3 Cầu thang thoát hiểm: Bóng chạy come up the stairs; pipes → Chì, window frames → Nhôm. Message 3 on the floor-7 landing.
export const L3: LevelData = {
  id: 3, name: 'level.3', room: 'stairwell', length: 44, speed: 2.6,
  encounters: [
    { atS: 6, mode: 'stop', wave: [{ type: 'bong', entry: 'door', door: 0 }, { type: 'chay', entry: 'left' }] },
    { atS: 14, mode: 'stop', wave: [{ type: 'chay', entry: 'right' }, { type: 'chay', entry: 'left' }, { type: 'bong', entry: 'door', door: 2 }] },
    { atS: 29, mode: 'stop', wave: [{ type: 'chay', entry: 'right' }, { type: 'bong', entry: 'door', door: 4 }, { type: 'chay', entry: 'left' }] },
  ],
  pickups: [{ atS: 11, object: 'pipe9', gives: 'chi', side: 1 }, { atS: 17, object: 'frame13', gives: 'nhom', side: -1 }],
  message: { atS: 23, id: 3 }, doodles: [], unlocks: ['l3', 'chi', 'nhom'],
}
