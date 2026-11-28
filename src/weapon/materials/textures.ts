// Per-material textures (P19): procedural 32 px tiles in one nearest-filtered atlas, generated once and cached.
// 'flat' = 2D graphic (2–3 tones, hard shapes); 'real' = low-res photo-like noise, highlights, scratches.
import * as THREE from 'three'
export const TILE = 32, COLS = 4
type Ctx = CanvasRenderingContext2D
interface Recipe { family: 'flat' | 'real'; draw: (g: Ctx, r: () => number) => void }
const px = (g: Ctx, c: string, x: number, y: number, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h) }
const fill = (g: Ctx, c: string) => px(g, c, 0, 0, TILE, TILE)
const noise = (g: Ctx, r: () => number, cols: string[], n: number) => { for (let i = 0; i < n; i++) px(g, cols[(r() * cols.length) | 0], (r() * TILE) | 0, (r() * TILE) | 0) }

export const TEXTURES: Record<string, Recipe> = {
  tho: { family: 'flat', draw: g => { fill(g, '#E8590C'); px(g, '#B8430A', 0, TILE - 4, TILE, 4); px(g, '#B8430A', TILE - 4, 0, 4, TILE) } },
  caosu: { family: 'flat', draw: g => { fill(g, '#24242A'); for (let y = 0; y < TILE; y += 8) for (let x = 0; x < TILE; x++) { const k = x % 16; const yy = y + (k < 8 ? k >> 1 : (15 - k) >> 1); px(g, '#3A3A42', x, yy, 1, 2) } } },
  gac: { family: 'flat', draw: g => { fill(g, '#16161A'); const l = [[4, 2], [5, 3], [6, 5], [6, 6], [7, 8], [9, 9], [10, 11], [10, 12], [12, 14], [13, 16], [14, 18], [16, 19], [17, 21], [19, 22], [20, 25], [22, 27], [23, 29]]; for (const [x, y] of l) px(g, '#3E6FD0', x, y, 2, 1); px(g, '#3E6FD0', 20, 4, 6, 1); px(g, '#3E6FD0', 25, 5, 1, 5) } },
  chi: { family: 'real', draw: (g, r) => { fill(g, '#59606C'); noise(g, r, ['#4C525D', '#656C79', '#545B66'], 260); for (let i = 0; i < 5; i++) { const x = (r() * 26) | 0, y = (r() * 26) | 0; px(g, '#454B55', x, y, 4, 3); px(g, '#6F7784', x, y, 3, 1) } } },
  nhom: { family: 'real', draw: (g, r) => { fill(g, '#C8D0D8'); for (let y = 0; y < TILE; y++) { px(g, ['#D8DFE6', '#B9C2CB', '#C8D0D8', '#E6EBF0'][(r() * 4) | 0], 0, y, TILE, 1) } for (let i = 0; i < 40; i++) px(g, '#EEF2F5', (r() * 28) | 0, (r() * TILE) | 0, 3 + ((r() * 6) | 0), 1) } },
  thuytinh: { family: 'real', draw: (g, r) => { fill(g, '#A6DCE8'); noise(g, r, ['#9CD3E0', '#B4E4EE'], 80); for (let i = 0; i < 3; i++) for (let k = 0; k < 12; k++) px(g, i === 1 ? '#FFFFFF' : '#E4F8FC', 3 + i * 9 + k, 28 - k * 2 - i, 1 + (i === 1 ? 1 : 0), 2) } },
  magie: { family: 'real', draw: (g, r) => { fill(g, '#D8D8CF'); noise(g, r, ['#F4F4EE', '#C4C4BA', '#FFFFFF', '#B6B6AC'], 220) } },
  dakho: { family: 'real', draw: (g, r) => { fill(g, '#C4E9FF'); noise(g, r, ['#E8F6FF', '#B0DAF4', '#FFFFFF'], 180); for (let i = 0; i < 14; i++) { const x = (r() * 28) | 0, y = (r() * 28) | 0; px(g, '#F6FBFF', x, y, 3, 2); px(g, '#DDF1FF', x + 1, y - 1, 1, 1) } } },
  dong: { family: 'real', draw: (g, r) => { fill(g, '#B5672C'); noise(g, r, ['#A55A24', '#C47838', '#9A5220'], 200); for (let i = 0; i < 7; i++) { const x = (r() * 28) | 0, y = (r() * 28) | 0; px(g, '#3E9C7C', x, y, 3, 2); px(g, '#5FBF9C', x + 1, y, 1, 1) } } },
  dong_core: { family: 'real', draw: (g, r) => { fill(g, '#7A4A34'); noise(g, r, ['#6A3E2A', '#8A5A3E', '#5A3322', '#A0663C'], 240); for (let i = 0; i < 6; i++) px(g, '#C9C3B0', (r() * 26) | 0, (r() * 28) | 0, 4, 3) } },
}
export const TEX_IDS = Object.keys(TEXTURES)
const slot = (id: string) => Math.max(0, TEX_IDS.indexOf(id))
const rows = Math.ceil(TEX_IDS.length / COLS)
/** uv rectangle [u0, v0, u1, v1] of a tile, inset half a texel so nearest sampling never bleeds a neighbour */
export function tileUV(id: string): [number, number, number, number] {
  const i = slot(id), cx = i % COLS, cy = (i / COLS) | 0, W = COLS * TILE, H = rows * TILE, e = 0.5
  return [(cx * TILE + e) / W, 1 - (cy * TILE + TILE - e) / H, (cx * TILE + TILE - e) / W, 1 - (cy * TILE + e) / H]
}
function rng(seed: number) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296) }
let canvas: HTMLCanvasElement | null = null, tex: THREE.CanvasTexture | null = null
const urls = new Map<string, string>()
export function atlasCanvas(): HTMLCanvasElement {
  if (canvas) return canvas
  canvas = document.createElement('canvas'); canvas.width = COLS * TILE; canvas.height = rows * TILE
  const g = canvas.getContext('2d')!
  TEX_IDS.forEach((id, i) => { g.save(); g.translate((i % COLS) * TILE, ((i / COLS) | 0) * TILE); g.beginPath(); g.rect(0, 0, TILE, TILE); g.clip(); TEXTURES[id].draw(g, rng(i * 7919 + 13)); g.restore() })
  return canvas
}
/** shared atlas texture (created once) */
export function atlasTexture(): THREE.CanvasTexture | null {
  if (tex) return tex
  if (typeof document === 'undefined') return null // unit tests (node)
  tex = new THREE.CanvasTexture(atlasCanvas()); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
/** CSS url() of one tile for Xưởng swatches */
export function tileDataUrl(id: string): string {
  let u = urls.get(id); if (u) return u
  const c = document.createElement('canvas'); c.width = c.height = TILE
  c.getContext('2d')!.drawImage(atlasCanvas(), (slot(id) % COLS) * TILE, ((slot(id) / COLS) | 0) * TILE, TILE, TILE, 0, 0, TILE, TILE)
  u = `url(${c.toDataURL()})`; urls.set(id, u); return u
}
/** source rectangle of a tile in the atlas canvas (for 2D drawing) */
export const tileSrc = (id: string): [HTMLCanvasElement, number, number] => [atlasCanvas(), (slot(id) % COLS) * TILE, ((slot(id) / COLS) | 0) * TILE]
