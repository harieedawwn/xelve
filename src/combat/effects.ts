// Material effects on a hit (weapon.md#6): pure. An effect fires only if the material sits in its region AND that region touched the target.
import { mat } from '../weapon/materials/registry'
import type { Region } from '../weapon/regions'
import type { StatusKind } from '../weapon/materials/types'

export interface Contact { mat: string; tags: readonly Region[] }
export interface HitCtx { charge: number; weak: boolean; sharp: boolean }
export interface HitFx {
  dmgMult: number; knock: number; cut: boolean; chip: boolean; bounce: number; spread: boolean
  statuses: { kind: StatusKind; secs: number; power: number }[]
  /** a mũi (tip) made contact */ tip: boolean
}
export const BASE_BLEED = { secs: 3, power: 1 }
const has = (tags: readonly Region[], r: Region | Region[] | 'any') => r === 'any' || (Array.isArray(r) ? r : [r]).some(x => tags.includes(x))

export function resolveEffects(contacts: readonly Contact[], ctx: HitCtx): HitFx {
  const fx: HitFx = { dmgMult: 1, knock: 1, cut: true, chip: false, bounce: 1, spread: false, statuses: [], tip: false }
  const done = new Set<string>(); let edge = false
  for (const c of contacts) {
    if (c.tags.includes('mui')) fx.tip = true
    if (c.tags.includes('canh')) edge = true
    if (done.has(c.mat)) continue
    const e = mat(c.mat).effect
    if (!e || !has(c.tags, e.region) || (e.weak && !ctx.weak) || (e.minCharge !== undefined && ctx.charge < e.minCharge)) continue
    done.add(c.mat)
    fx.dmgMult *= e.dmg ?? 1; fx.knock *= e.knock ?? 1; fx.bounce = Math.max(fx.bounce, e.bounce ?? 1)
    if (e.noCut) fx.cut = false
    if (e.chip) fx.chip = true
    if (e.spread) fx.spread = true
    if (e.status) fx.statuses.push({ kind: e.status.kind, secs: e.status.secs, power: e.status.power ?? 1 })
  }
  // every sharp edge that touches cuts: Chảy máu, unless a rubber contact says otherwise
  if (fx.cut && ctx.sharp && edge) fx.statuses.push({ kind: 'chaymau', ...BASE_BLEED })
  return fx
}
