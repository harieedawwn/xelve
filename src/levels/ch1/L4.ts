import type { LevelData } from './types'
// L4 Con hẻm: TV repair shop (static), Bóng nhiễu flicker out of screens, welding shop → Magie, Ve's sticker. Grid 5×5. Message 4.
export const L4: LevelData = {
  id: 4, name: 'level.4', room: 'alley', length: 44, speed: 2.6,
  encounters: [
    { atS: 8, mode: 'stop', wave: [{ type: 'nhieu', entry: 'door', door: 0 }, { type: 'bong', entry: 'door', door: 1 }] },
    { atS: 17, mode: 'stop', wave: [{ type: 'nhieu', entry: 'door', door: 2 }, { type: 'nhieu', entry: 'phase' }, { type: 'bong', entry: 'left' }] },
    { atS: 30, mode: 'stop', wave: [{ type: 'nhieu', entry: 'door', door: 4 }, { type: 'bong', entry: 'right' }, { type: 'nhieu', entry: 'phase' }] },
  ],
  pickups: [{ atS: 20, object: 'weld', gives: 'magie', side: 1 }],
  message: { atS: 25, id: 4 }, doodles: [], unlocks: ['l4', 'magie', 'grid5'], forge: 5,
}
