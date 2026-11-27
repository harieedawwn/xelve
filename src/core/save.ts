// Versioned save. localStorage (web); mirrored to Capacitor Preferences on Android.
import type { Tier } from './quality'
import type { WeaponDesign } from '../weapon/model'

export const SAVE_VERSION = 1
export interface Settings { tier: Tier | null; sound: boolean; music: number; reduceShake: boolean; lang: 'vi' }
export interface SaveData { v: number; settings: Settings; progress: { chapter: number; level: number }; weapons: WeaponDesign[]; equipped: string | null; materials: Record<string, number>; unlocked: string[]; drops: string[]; bests: Record<string, number> }

export const defaults = (): SaveData => ({
  v: SAVE_VERSION,
  settings: { tier: null, sound: true, music: 0.7, reduceShake: false, lang: 'vi' },
  progress: { chapter: 1, level: 0 }, weapons: [], equipped: null, materials: {}, unlocked: ['khoi'], drops: [], bests: {},
})

type Migration = (d: any) => any
export const MIGRATIONS: Record<number, Migration> = {} // MIGRATIONS[n] upgrades v n → n+1

export function migrate(raw: unknown): SaveData {
  const base = defaults()
  if (!raw || typeof raw !== 'object') return base
  let d: any = raw
  let v = typeof d.v === 'number' ? d.v : 0
  while (v < SAVE_VERSION) { d = (MIGRATIONS[v] ?? ((x: any) => x))(d); v++; d.v = v }
  return { ...base, ...d, v: SAVE_VERSION, settings: { ...base.settings, ...(d.settings ?? {}) }, progress: { ...base.progress, ...(d.progress ?? {}) } }
}

const KEY = 'xelve.save'
let data: SaveData = defaults()
const pref = (): any => (window as any).Capacitor?.Plugins?.Preferences

export async function loadSave(): Promise<SaveData> {
  let raw: string | null = null
  try { raw = localStorage.getItem(KEY) } catch { /* private mode */ }
  if (!raw && pref()) { try { raw = (await pref().get({ key: KEY })).value } catch { /* none */ } }
  try { data = migrate(raw ? JSON.parse(raw) : null) } catch { data = defaults() }
  return data
}
export const save = () => data
export function persist() {
  const s = JSON.stringify(data)
  try { localStorage.setItem(KEY, s) } catch { /* full or blocked */ }
  try { pref()?.set({ key: KEY, value: s }) } catch { /* web */ }
}
