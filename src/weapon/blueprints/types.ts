// Bản vẽ definition (weapon.md#3). `at` = anchor of the part on the assembled grid (cells), grip only on the held part.
import type { Key } from '../../i18n'
export interface PartDef {
  id: string; name: Key; w: number; h: number; at: [number, number]
  depth?: number; grip?: [number, number]
  ghost?: (x: number, y: number) => boolean   // faint silhouette, optional to trace
}
export interface BlueprintDef { id: string; name: Key; voxel: number; mirror: boolean; parts: PartDef[]; soon?: boolean }
