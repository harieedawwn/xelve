// Level data shape (levels.md). A level = a room builder id + a straight rail + encounters, pickups, one message, doodles.
export type RoomId = 'corridor' | 'office' | 'stairwell' | 'alley' | 'lobby' | 'road' | 'carpark'
export interface Spawn { type: string; door: number | 'far' }
export interface Encounter { atS: number; wave: Spawn[]; mode: 'stop' | 'run' }
export interface Pickup { atS: number; object: string; gives: string; side: -1 | 1; y?: number }
export interface Doodle { atS: number; id: string; side: -1 | 1; y: number }
export interface LevelData {
  id: number; name: string /* i18n key */; room: RoomId
  length: number                 // metres of rail
  speed: number                  // walking speed m/s
  encounters: Encounter[]
  pickups: Pickup[]
  message?: { atS: number; id: number }
  doodles: Doodle[]
  /** what clearing the level unlocks (flags in save.unlocked) */
  unlocks: string[]
  /** Xưởng opens at the end of the level with this khoi size (L2: 3, L4: 5) */
  forge?: number
  /** set on boss levels: run that boss scene instead of the rail runner */
  boss?: 'nguoigac' | 'dong'
}
