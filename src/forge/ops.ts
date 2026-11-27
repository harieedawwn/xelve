// Pure Lưới operations: line, flood fill, mirror, Làm gọn. Unit-tested (forge.test.ts).
import { Cell, Part, getCell, inPart, setCell } from '../weapon/model'

export const same = (a: Cell, b: Cell) => (a ? a.mat : '') === (b ? b.mat : '')

/** Bresenham cells from a to b inclusive */
export function lineCells(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const out: [number, number][] = []
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  for (;;) {
    out.push([x0, y0])
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 >= dy) { err += dy; x0 += sx }
    if (e2 <= dx) { err += dx; y0 += sy }
  }
  return out
}

/** paint one cell (and its mirror across the part's vertical axis) */
export function paint(p: Part, x: number, y: number, c: Cell, mirror: boolean): boolean {
  if (!inPart(p, x, y)) return false
  let changed = !same(getCell(p, x, y), c)
  setCell(p, x, y, c ? { mat: c.mat } : null)
  if (mirror) { const mx = p.w - 1 - x; if (!same(getCell(p, mx, y), c)) changed = true; setCell(p, mx, y, c ? { mat: c.mat } : null) }
  return changed
}

/** 4-neighbour flood fill of the region that matches the start cell */
export function fill(p: Part, x: number, y: number, c: Cell, mirror: boolean): boolean {
  if (!inPart(p, x, y)) return false
  const from = getCell(p, x, y)
  if (same(from, c)) return false
  const q: [number, number][] = [[x, y]], seen = new Set<number>()
  while (q.length) {
    const [cx, cy] = q.pop()!
    const k = cy * p.w + cx
    if (!inPart(p, cx, cy) || seen.has(k) || !same(getCell(p, cx, cy), from)) continue
    seen.add(k); paint(p, cx, cy, c, mirror)
    q.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1])
  }
  return true
}

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]]
/** Làm gọn: remove lone cells (no 4-neighbour) and fill 1-cell holes (all 4 neighbours filled; takes the most common neighbour material) */
export function tidy(p: Part): number {
  const src = p.cells.slice(); let n = 0
  const at = (x: number, y: number) => (inPart(p, x, y) ? src[y * p.w + x] : null)
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const c = at(x, y), nb = N4.map(([dx, dy]) => at(x + dx, y + dy))
    if (c && nb.every(v => !v)) { setCell(p, x, y, null); n++ }
    else if (!c && nb.every(v => v)) {
      const count: Record<string, number> = {}; for (const v of nb) count[v!.mat] = (count[v!.mat] ?? 0) + 1
      const m = Object.entries(count).sort((a, b) => b[1] - a[1])[0][0]
      setCell(p, x, y, { mat: m }); n++
    }
  }
  return n
}
