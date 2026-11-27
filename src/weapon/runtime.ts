// Stand-in mapping (sqrt keeps Khối ≈ 1, Dao ≈ 2, Kiếm ≈ 6, Búa ≈ 9 like the old test profiles) from analyze() stats to the combat runtime profile until P7 sets class thresholds.
import type { Profile } from '../combat/profiles'
import type { Stats } from './analyze'

export const RUNTIME = { inertiaK: 1.2, iMin: 0.2, iMax: 14, massK: 0.6, mMin: 2, mMax: 60, chargedAbove: 2.5 }

export function designProfile(st: Stats, id = 'design'): Profile {
  const R = RUNTIME
  const inertia = Math.min(R.iMax, Math.max(R.iMin, Math.sqrt(st.inertia) * R.inertiaK))
  return {
    id, inertia, scale: 1, charged: inertia > R.chargedAbove,
    contactMass: Math.min(R.mMax, Math.max(R.mMin, st.mass * R.massK)),
    shape: st.connected.length <= 1 ? 'khoi' : st.sharp > 0.5 ? 'sac' : 'cun',
  }
}
