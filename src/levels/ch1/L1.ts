import type { LevelData } from './types'
// L1 Hành lang: wake, Ve's swipe doodle, first Bóng. Message 1 after the fight. (corridor.ts has the doors/doodle/clock)
export const L1: LevelData = {
  id: 1, name: 'level.1', room: 'corridor', length: 31, speed: 1.8,
  encounters: [
    { atS: 8.5, mode: 'stop', wave: [{ type: 'bong', door: 'far' }] },
    { atS: 19, mode: 'stop', wave: [{ type: 'bong', door: 0 }, { type: 'bong', door: 1 }, { type: 'bong', door: 5 }] },
  ],
  pickups: [], message: { atS: 24, id: 1 }, doodles: [], unlocks: ['l1'],
}
