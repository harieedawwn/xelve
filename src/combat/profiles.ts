// Weapon runtime profiles (until the Xưởng feeds analyze() stats in P7). Registry: 1 entry per profile.
import type { Shape } from './damage'
export interface Profile { id: string; inertia: number; contactMass: number; shape: Shape; scale: number; charged: boolean; cls?: 'nhe' | 'vua' | 'nang' }
export const PROFILES: Record<string, Profile> = {
  nhe: { id: 'nhe', inertia: 1, contactMass: 12, shape: 'sac', scale: 1, charged: false, cls: 'nhe' },
  nang: { id: 'nang', inertia: 9, contactMass: 40, shape: 'cun', scale: 1.7, charged: true, cls: 'nang' },
  vua: { id: 'vua', inertia: 4, contactMass: 22, shape: 'sac', scale: 1.3, charged: true, cls: 'vua' },
  khoi: { id: 'khoi', inertia: 0.4, contactMass: 3, shape: 'khoi', scale: 0.8, charged: false },
}
