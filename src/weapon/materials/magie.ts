// Material magie: effect per region (weapon.md#6).
import type { MaterialDef } from './types'
export const magie: MaterialDef = { id: 'magie', name: 'mat.magie', density: 0.6, color: 0xd8d8cf, tex: 'magie', effect: { region: ['canh', 'mui'], weak: true, status: { kind: 'bong', secs: 3 }, spread: true } }
