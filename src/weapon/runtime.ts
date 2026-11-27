// Mapping (sqrt keeps Khối ≈ 1, Dao ≈ 2, Kiếm ≈ 6, Búa ≈ 9 like the old test profiles) from analyze() stats to the combat runtime profile . Class (nhẹ/vừa/nặng) comes from analyze().
import type { Profile } from '../combat/profiles'
import type { Stats } from './analyze'
import { mat } from './materials/registry'

export const RUNTIME = { inertiaK: 1.2, iMin: 0.2, iMax: 14, massK: 0.6, mMin: 2, mMax: 60, }

export function designProfile(st: Stats, id = 'design'): Profile {
  const R = RUNTIME
  // nhôm and friends make the same shape swing faster: weighted by mass share
  let fast = 0; for (const v of st.connected) fast += (mat(v.mat).speed ?? 0) * mat(v.mat).density * v.depth
  const inertia = Math.min(R.iMax, Math.max(R.iMin, Math.sqrt(st.inertia) * R.inertiaK * (1 - (st.mass ? fast / st.mass : 0))))
  return {
    id, inertia, scale: 1, charged: st.cls !== 'nhe', cls: st.connected.length <= 1 ? undefined : st.cls,
    contactMass: Math.min(R.mMax, Math.max(R.mMin, st.mass * R.massK)),
    shape: st.connected.length <= 1 ? 'khoi' : st.sharp > 0.5 ? 'sac' : 'cun',
  }
}
