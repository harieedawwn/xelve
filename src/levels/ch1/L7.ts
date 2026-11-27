import type { LevelData } from './types'
// L7 Bãi đỗ xe: pillars and parked cars, Bóng vỡ splitting in crowds, a cooler box of dry ice → Đá khô. The giant waits on the roof (L8).
export const L7: LevelData = {
  id: 7, name: 'level.7', room: 'carpark', length: 48, speed: 2.6,
  encounters: [
    { atS: 8, mode: 'stop', wave: [{ type: 'vo', entry: 'door', door: 0 }, { type: 'bong', entry: 'right' }] },
    { atS: 16, mode: 'stop', wave: [{ type: 'vo', entry: 'door', door: 2 }, { type: 'khien', entry: 'right' }, { type: 'chay', entry: 'left' }] },
    { atS: 28, mode: 'stop', wave: [{ type: 'vo', entry: 'door', door: 4 }, { type: 'vo', entry: 'left' }, { type: 'nhieu', entry: 'phase' }] },
    { atS: 39, mode: 'stop', wave: [{ type: 'vo', entry: 'left' }, { type: 'khien', entry: 'right' }, { type: 'khien', entry: 'left' }] },
  ],
  pickups: [{ atS: 21, object: 'cooler', gives: 'dakho', side: 1 }],
  doodles: [], unlocks: ['l7', 'dakho'],
}
