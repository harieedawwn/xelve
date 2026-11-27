import type { LevelData } from './types'
// L7 Bãi đỗ xe: pillars and parked cars, Bóng vỡ splitting in crowds, a cooler box of dry ice → Đá khô. The giant waits on the roof (L8).
export const L7: LevelData = {
  id: 7, name: 'level.7', room: 'carpark', length: 48, speed: 1.9,
  encounters: [
    { atS: 8, mode: 'stop', wave: [{ type: 'vo', door: 0 }, { type: 'bong', door: 1 }] },
    { atS: 16, mode: 'stop', wave: [{ type: 'vo', door: 2 }, { type: 'khien', door: 3 }, { type: 'chay', door: 'far' }] },
    { atS: 28, mode: 'stop', wave: [{ type: 'vo', door: 4 }, { type: 'vo', door: 5 }, { type: 'nhieu', door: 'far' }] },
    { atS: 39, mode: 'stop', wave: [{ type: 'vo', door: 'far' }, { type: 'khien', door: 'far' }, { type: 'khien', door: 'far' }] },
  ],
  pickups: [{ atS: 21, object: 'cooler', gives: 'dakho', side: 1 }],
  doodles: [], unlocks: ['l7', 'dakho'],
}
