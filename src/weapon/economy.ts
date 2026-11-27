// Economy (weapon.md#7): every drawn cell costs 1 Màu (+1 of its own stock for special materials). Erasing refunds 100%,
// so what is "left" is always owned − cost(current design). Màu drops from blood, stock from slashing objects (P12 wires the sources).
import type { WeaponDesign } from './model'
import { save, persist } from '../core/save'

export interface Wallet { mau: number; stock: Record<string, number> }
export const BASE_MATERIAL = 'tho'
const MAU = 'mau'

export function cost(d: WeaponDesign): Wallet {
  const out: Wallet = { mau: 0, stock: {} }
  for (const p of Object.values(d.parts)) for (const c of p.cells) {
    if (!c) continue
    out.mau++
    if (c.mat !== BASE_MATERIAL) out.stock[c.mat] = (out.stock[c.mat] ?? 0) + 1
  }
  return out
}
/** what the player could still spend with this design drawn (never negative) */
export function left(owned: Wallet, d: WeaponDesign): Wallet {
  const c = cost(d), stock: Record<string, number> = {}
  for (const k of new Set([...Object.keys(owned.stock), ...Object.keys(c.stock)])) stock[k] = Math.max(0, (owned.stock[k] ?? 0) - (c.stock[k] ?? 0))
  return { mau: Math.max(0, owned.mau - c.mau), stock }
}
/** can one more cell of `mat` be drawn? (painting over a cell of the same material is free) */
export function canPaint(owned: Wallet, d: WeaponDesign, mat: string, replacing: string | null = null): boolean {
  if (replacing === mat) return true
  const l = left(owned, d)
  if (replacing === null && l.mau < 1) return false
  return mat === BASE_MATERIAL || (l.stock[mat] ?? 0) >= 1 || false
}
/** is the whole design affordable (loading a saved one after a stock change) */
export const affordable = (owned: Wallet, d: WeaponDesign) => { const c = cost(d); return c.mau <= owned.mau && Object.entries(c.stock).every(([k, n]) => n <= (owned.stock[k] ?? 0)) }

// ---- the saved wallet: save().materials holds stock per material id, plus Màu under 'mau'
export const wallet = (): Wallet => { const { [MAU]: mau = 0, ...stock } = save().materials; return { mau, stock } }
export function earn(id: 'mau' | string, n: number) { const m = save().materials; m[id] = Math.max(0, (m[id] ?? 0) + n); persist() }

/** Xưởng grid side from the unlock flags (levels.md: L2 3×3, L4 5×5, L6 8×8) */
export function khoiSize(s: { unlocked: string[] }) { return s.unlocked.includes('grid8') ? 8 : s.unlocked.includes('grid5') ? 5 : s.unlocked.includes('grid3') ? 3 : 1 }
