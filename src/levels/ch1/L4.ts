import type { LevelData } from './types'
// L4 Con hẻm: TV repair shop (static), Bóng nhiễu flicker out of screens, welding shop → Magie, Ve's sticker. Grid 5×5. Message 4.
export const L4: LevelData = {
  id: 4, name: 'level.4', room: 'alley', length: 44, speed: 1.9,
  encounters: [
    { atS: 8, mode: 'stop', wave: [{ type: 'nhieu', door: 0 }, { type: 'bong', door: 1 }] },
    { atS: 17, mode: 'stop', wave: [{ type: 'nhieu', door: 2 }, { type: 'nhieu', door: 3 }, { type: 'bong', door: 'far' }] },
    { atS: 30, mode: 'stop', wave: [{ type: 'nhieu', door: 4 }, { type: 'bong', door: 5 }, { type: 'nhieu', door: 'far' }] },
  ],
  pickups: [{ atS: 20, object: 'weld', gives: 'magie', side: 1 }],
  message: { atS: 25, id: 4 }, doodles: [], unlocks: ['l4', 'magie', 'grid5'], forge: 5,
}
