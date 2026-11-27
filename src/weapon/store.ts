// Saved designs: one per Bản vẽ, plus which one is in hand. Lives in the versioned save (core/save).
import { persist, save } from '../core/save'
import { WeaponDesign, cloneDesign } from './model'
import { BLUEPRINTS } from './blueprints/registry'

const valid = (d: WeaponDesign | undefined): d is WeaponDesign => !!d && !!BLUEPRINTS[d.blueprint] && !!d.parts && typeof d.parts === 'object'
export const savedDesign = (bp: string): WeaponDesign | null => { const d = save().weapons.find(w => w?.blueprint === bp); return valid(d) ? cloneDesign(d) : null }
export const equippedDesign = (): WeaponDesign | null => (save().equipped ? savedDesign(save().equipped!) : null)

export function storeDesign(d: WeaponDesign, equip = true) {
  const s = save(), copy = cloneDesign(d)
  s.weapons = s.weapons.filter(w => w?.blueprint !== d.blueprint).concat(copy)
  if (equip) s.equipped = d.blueprint
  persist()
}
