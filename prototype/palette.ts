// Locked palette (docs/DESIGN.md). Mirror of src/styles/tokens.css later.
export const PAL = {
  paper: 0xecebe6, paper2: 0xcfcdc6, stone: 0x8e8c86, ink: 0x16161a, ve: 0xe8590c,
  bloodTim: 0x4a0e6b, bloodDo: 0x6e0b14, bloodLam: 0x0b2f6e, bloodLuc: 0x0e4d2a, bloodDat: 0x6b4a06,
  chi: 0x59606c,
}

export type Tier = 'thap' | 'tb' | 'cao'
export const QUALITY: Record<Tier, { h: number; fps: number; particles: number; decals: number; ghost: boolean }> = {
  thap: { h: 240, fps: 30, particles: 150, decals: 40, ghost: false },
  tb: { h: 360, fps: 60, particles: 500, decals: 120, ghost: false },
  cao: { h: 480, fps: 60, particles: 1200, decals: 300, ghost: true },
}
