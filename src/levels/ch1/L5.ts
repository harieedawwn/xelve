import type { LevelData } from './types'
// L5 Sảnh — Người gác: boss room (scenes/boss1.ts). Drops (Bản vẽ Dao, Kiếm, Lõi) come from src/story/drops.ts.
export const L5: LevelData = { id: 5, name: 'level.5', room: 'lobby', length: 1, speed: 0, boss: 'nguoigac', encounters: [], pickups: [], doodles: [], unlocks: ['l5'] }
