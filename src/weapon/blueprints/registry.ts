// Bản vẽ registry: 1 file + 1 line each. SOON = Chapter 2 (shown locked, "Sắp ra mắt").
import type { BlueprintDef, PartDef } from './types'
import { khoi } from './khoi'
import { dao } from './dao'
import { kiem } from './kiem'
import { bua } from './bua'
export type { BlueprintDef, PartDef }
export const BLUEPRINTS: Record<string, BlueprintDef> = { khoi, dao, kiem, bua }
export const SOON = ['bp.giao', 'bp.phitieu', 'bp.gang', 'bp.dua'] as const
