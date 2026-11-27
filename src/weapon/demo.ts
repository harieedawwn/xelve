// Demo weapons for the Phòng tập: one per material, drawn so the material sits in its effect region (weapon.md#6),
// plus a hammer with a head too heavy for its handle (dễ gãy). Dev only — never in the player's save.
import { makeDesign, setCell, WeaponDesign } from './model'

/** thin pole, the material on the top half (mũi + cạnh), thô handle: nhẹ, uncharged, lực = 1 */
export function materialDemo(id: string): WeaponDesign {
  const d = makeDesign('khoi', 8)
  for (let y = 0; y < 8; y++) setCell(d.parts.khoi, 4, y, { mat: y < 4 ? id : 'tho' })
  return d
}
/** Búa: chì head (2 deep) on a 3-wide thô handle that is too thin for it — nặng, charged, breaks on its first full-lực hit */
export function neckDemo(): WeaponDesign {
  const d = makeDesign('bua')
  for (const c of d.parts.dau.cells.keys()) d.parts.dau.cells[c] = { mat: 'chi' }
  for (const c of d.parts.can.cells.keys()) d.parts.can.cells[c] = { mat: 'tho' }
  return d
}
