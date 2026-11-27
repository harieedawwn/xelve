import type { LevelData } from './types'
// L2 Văn phòng: Ve's desk, faces rubbed out, sketchbook page → Xưởng 3×3. Glass partitions. Message 2.
export const L2: LevelData = {
  id: 2, name: 'level.2', room: 'office', length: 40, speed: 2.6,
  encounters: [
    { atS: 8, mode: 'stop', wave: [{ type: 'bong', entry: 'door', door: 0 }, { type: 'bong', entry: 'door', door: 1 }] },
    { atS: 16, mode: 'stop', wave: [{ type: 'bong', entry: 'door', door: 2 }, { type: 'bong', entry: 'right' }, { type: 'bong', entry: 'left' }] },
    { atS: 29, mode: 'stop', wave: [{ type: 'bong', entry: 'left' }, { type: 'bong', entry: 'door', door: 5 }, { type: 'bong', entry: 'right' }] },
  ],
  pickups: [{ atS: 21, object: 'page', gives: 'grid3', side: -1 }],
  message: { atS: 24, id: 2 }, doodles: [], unlocks: ['l2', 'grid3', 'thuytinh'], forge: 3,
}
