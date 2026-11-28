// Material definition (weapon.md#6). An effect only triggers if the material sits in `region` AND that region made contact.
import type { Key } from '../../i18n'
import type { Region } from '../regions'
export type StatusKind = 'chaymau' | 'bong' | 'dongbang' | 'choang'
export interface MatEffect {
  /** region the material must sit in; 'any' = passive (density-like), no region needed */
  region: Region | Region[] | 'any'
  /** needs the weak point (Điểm yếu) hit */
  weak?: boolean
  /** needs lực ≥ this (charged weapons; uncharged count as 1) */
  minCharge?: number
  /** damage multiplier on the hit */ dmg?: number
  /** Đẩy lùi multiplier */ knock?: number
  /** status applied: kind, seconds, power multiplier */ status?: { kind: StatusKind; secs: number; power?: number }
  /** cuts nothing: no Chảy máu from this contact */ noCut?: boolean
  /** each hit on armour chips one voxel off the weapon (restored after the level) */ chip?: boolean
  /** weapon bounces back faster (shorter recovery) */ bounce?: number
  /** fire jumps to touching enemies */ spread?: boolean
}
export interface MaterialDef { id: string; name: Key; density: number; color: number; /** texture id in textures.ts (P19) */ tex: string; alpha?: number; effect?: MatEffect; /** share of the swing speed (nhôm) */ speed?: number }
