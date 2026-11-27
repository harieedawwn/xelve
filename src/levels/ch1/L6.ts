import type { LevelData } from './types'
// L6 Đường cái: parked cars, a crashed van, Bóng khiên (block-breakers) + Bóng vỡ. Hammer page (Bản vẽ Búa), tyres → Cao su, bus-stop page → Lưới 8×8. Message 5.
export const L6: LevelData = {
  id: 6, name: 'level.6', room: 'road', length: 48, speed: 1.9,
  encounters: [
    { atS: 8, mode: 'stop', wave: [{ type: 'khien', door: 0 }, { type: 'bong', door: 1 }] },
    { atS: 17, mode: 'stop', wave: [{ type: 'khien', door: 2 }, { type: 'khien', door: 3 }, { type: 'chay', door: 'far' }] },
    { atS: 32, mode: 'stop', wave: [{ type: 'khien', door: 4 }, { type: 'vo', door: 'far' }, { type: 'nhieu', door: 5 }] },
    { atS: 41, mode: 'stop', wave: [{ type: 'khien', door: 'far' }, { type: 'vo', door: 'far' }] },
  ],
  pickups: [
    { atS: 21, object: 'hoard', gives: 'bua', side: -1 }, { atS: 28, object: 'tyre', gives: 'caosu', side: 1 },
    { atS: 38, object: 'page8', gives: 'grid8', side: -1 },
  ],
  message: { atS: 25, id: 5 }, doodles: [], unlocks: ['l6', 'bua', 'caosu', 'grid8'], forge: 8,
}
