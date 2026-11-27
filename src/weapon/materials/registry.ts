// Material registry: 1 file + 1 line per material.
import type { MaterialDef } from './types'
import { tho } from './tho'
import { chi } from './chi'
import { nhom } from './nhom'
import { thuytinh } from './thuytinh'
import { magie } from './magie'
import { caosu } from './caosu'
import { dakho } from './dakho'
export type { MaterialDef }
export const MATERIALS: Record<string, MaterialDef> = { tho, chi, nhom, thuytinh, magie, caosu, dakho }
export const mat = (id: string): MaterialDef => MATERIALS[id] ?? tho
