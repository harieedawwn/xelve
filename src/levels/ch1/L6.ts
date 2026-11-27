import type { LevelData } from './types'
// L6 Đường cái: parked cars, a crashed van, Bóng khiên (block-breakers) + Bóng vỡ. Hammer page (Bản vẽ Búa), tyres → Cao su, bus-stop page → Lưới 8×8. Message 5.
export const L6: LevelData = {
  id: 6, name: 'level.6', room: 'road', length: 48, speed: 2.6,
  encounters: [
    { atS: 8, mode: 'stop', wave: [{ type: 'khien', entry: 'door', door: 0 }, { type: 'bong', entry: 'right' }] },
    { atS: 17, mode: 'stop', wave: [{ type: 'khien', entry: 'door', door: 2 }, { type: 'khien', entry: 'right' }, { type: 'chay', entry: 'left' }] },
    { atS: 32, mode: 'stop', wave: [{ type: 'khien', entry: 'door', door: 4 }, { type: 'vo', entry: 'right' }, { type: 'nhieu', entry: 'phase' }] },
    { atS: 41, mode: 'stop', wave: [{ type: 'khien', entry: 'left' }, { type: 'vo', entry: 'right' }] },
  ],
  pickups: [
    { atS: 21, object: 'hoard', gives: 'bua', side: -1 }, { atS: 28, object: 'tyre', gives: 'caosu', side: 1 },
    { atS: 38, object: 'page8', gives: 'grid8', side: -1 },
  ],
  message: { atS: 25, id: 5 }, doodles: [], unlocks: ['l6', 'bua', 'caosu', 'grid8'], forge: 8,
}
