// Lưới view: 2D canvas, one finger draws, two fingers pan + pinch-zoom (cells stay ≥ 18 px). Bản vẽ parts lie
// horizontally (tip to the right) so long parts use the landscape width; Khối stays upright.
import type { Part } from '../weapon/model'
import { getCell } from '../weapon/model'
import { mat } from '../weapon/materials/registry'

export const CELL_MIN = 18, CELL_MAX = 56
const css = (n: number) => '#' + n.toString(16).padStart(6, '0')
export interface DrawState {
  part: Part; rotate: boolean; ghost?: (x: number, y: number) => boolean
  loose: Set<number>; preview: [number, number][]; mirror: boolean; grip?: [number, number]
}
export interface StrokeHandler { start(x: number, y: number): void; move(x: number, y: number): void; end(): void; cancel(): void }

export class GridView {
  root = document.createElement('div')
  canvas = document.createElement('canvas')
  cs = 24; ox = 0; oy = 0
  private ctx = this.canvas.getContext('2d')!
  private pts = new Map<number, { x: number; y: number }>()
  private stroking = false; private gesture: { d: number; mx: number; my: number } | null = null
  private st: DrawState | null = null
  private fitted = ''

  constructor(private h: StrokeHandler) {
    this.root.className = 'lw'; this.root.appendChild(this.canvas)
    const c = this.canvas
    c.addEventListener('pointerdown', e => {
      c.setPointerCapture(e.pointerId); this.pts.set(e.pointerId, this.local(e))
      if (this.pts.size === 1 && e.button === 0) { this.stroking = true; const [x, y] = this.cellAt(this.local(e)); h.start(x, y) }
      else if (this.pts.size === 2) { if (this.stroking) { this.stroking = false; h.cancel() } this.gesture = this.measure() }
    })
    c.addEventListener('pointermove', e => {
      if (!this.pts.has(e.pointerId)) return
      this.pts.set(e.pointerId, this.local(e))
      if (this.stroking) { const [x, y] = this.cellAt(this.local(e)); h.move(x, y) }
      else if (this.gesture && this.pts.size >= 2) {
        const g = this.measure(), k = g.d / Math.max(1, this.gesture.d)
        this.zoomAt(g.mx, g.my, this.cs * k); this.ox += g.mx - this.gesture.mx; this.oy += g.my - this.gesture.my
        this.gesture = g; this.clampPan(); this.draw()
      }
    })
    const up = (e: PointerEvent) => {
      if (!this.pts.delete(e.pointerId)) return
      if (this.stroking) { this.stroking = false; h.end() }
      if (this.pts.size < 2) this.gesture = null
    }
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up)
    c.addEventListener('wheel', e => {
      e.preventDefault(); const p = this.local(e)
      if (e.ctrlKey) this.zoomAt(p.x, p.y, this.cs * Math.exp(-e.deltaY * 0.01)); else { this.ox -= e.deltaX; this.oy -= e.deltaY }
      this.clampPan(); this.draw()
    }, { passive: false })
    new ResizeObserver(() => { this.fitted = ''; this.layout() }).observe(this.root)
  }

  private local(e: { clientX: number; clientY: number }) { const r = this.canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
  private measure() {
    const [a, b] = [...this.pts.values()]
    return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }
  }
  /** view size in cells */
  private dims() { const p = this.st!.part; return this.st!.rotate ? [p.h, p.w] : [p.w, p.h] }
  /** screen point → part cell (may be outside the part) */
  cellAt(p: { x: number; y: number }): [number, number] {
    const c = Math.floor((p.x - this.ox) / this.cs), r = Math.floor((p.y - this.oy) / this.cs)
    return this.st!.rotate ? [r, this.st!.part.h - 1 - c] : [c, r]
  }
  private toView(x: number, y: number): [number, number] { return this.st!.rotate ? [this.st!.part.h - 1 - y, x] : [x, y] }
  private zoomAt(px: number, py: number, cs: number) {
    const n = Math.min(CELL_MAX, Math.max(CELL_MIN, cs)), k = n / this.cs
    this.ox = px - (px - this.ox) * k; this.oy = py - (py - this.oy) * k; this.cs = n
  }
  private clampPan() {
    const [vw, vh] = this.dims(), W = this.root.clientWidth, H = this.root.clientHeight, gw = vw * this.cs, gh = vh * this.cs
    this.ox = gw <= W ? (W - gw) / 2 : Math.min(this.cs, Math.max(W - gw - this.cs, this.ox))
    this.oy = gh <= H ? (H - gh) / 2 : Math.min(this.cs, Math.max(H - gh - this.cs, this.oy))
  }
  /** fit the part: biggest cell that fits, never under 18 px (then the grip end shows first and the rest pans) */
  fit() {
    const [vw, vh] = this.dims(), W = this.root.clientWidth, H = this.root.clientHeight
    this.cs = Math.min(CELL_MAX, Math.max(CELL_MIN, Math.floor(Math.min((W - 8) / vw, (H - 8) / vh))))
    this.ox = 4; this.oy = 4; this.clampPan()
  }
  set(st: DrawState) {
    const id = `${st.part.id}:${st.part.w}x${st.part.h}:${st.rotate}`
    this.st = st
    if (id !== this.fitted && this.root.clientWidth) { this.fitted = id; this.layout(); return }
    this.draw()
  }
  private layout() {
    if (!this.st) return
    const W = this.root.clientWidth, H = this.root.clientHeight, dpr = Math.min(2, devicePixelRatio || 1)
    this.canvas.width = Math.round(W * dpr); this.canvas.height = Math.round(H * dpr)
    this.canvas.style.width = W + 'px'; this.canvas.style.height = H + 'px'
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (!this.fitted) this.fitted = `${this.st.part.id}:${this.st.part.w}x${this.st.part.h}:${this.st.rotate}`
    this.fit(); this.draw()
  }

  draw() {
    const st = this.st; if (!st) return
    const g = this.ctx, cs = this.cs, p = st.part, W = this.root.clientWidth, H = this.root.clientHeight
    g.clearRect(0, 0, W, H)
    g.fillStyle = '#ECEBE6'; g.fillRect(0, 0, W, H)
    const [vw, vh] = this.dims()
    const R = (x: number, y: number) => { const [c, r] = this.toView(x, y); return [this.ox + c * cs, this.oy + r * cs] }
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const [sx, sy] = R(x, y)
      if (sx > W || sy > H || sx + cs < 0 || sy + cs < 0) continue
      const c = getCell(p, x, y)
      if (c) {
        g.fillStyle = css(mat(c.mat).color); g.fillRect(sx, sy, cs, cs)
        if (st.loose.has(y * p.w + x)) { // loose: red frame + hatch, falls off on equip
          g.strokeStyle = '#ECEBE6'; g.lineWidth = 1; g.strokeRect(sx + 4.5, sy + 4.5, cs - 9, cs - 9)
          g.strokeStyle = '#6E0B14'; g.lineWidth = 2; g.strokeRect(sx + 2, sy + 2, cs - 4, cs - 4)
          g.beginPath(); g.moveTo(sx + 3, sy + cs - 3); g.lineTo(sx + cs - 3, sy + 3); g.stroke()
        }
      } else if (st.ghost?.(x, y)) { g.fillStyle = '#CFCDC6'; g.fillRect(sx + cs * 0.18, sy + cs * 0.18, cs * 0.64, cs * 0.64) }
    }
    // preview of a straight line in progress
    g.fillStyle = 'rgba(22,22,26,.35)'
    for (const [x, y] of st.preview) { const [sx, sy] = R(x, y); g.fillRect(sx + 3, sy + 3, cs - 6, cs - 6) }
    // grid lines
    g.strokeStyle = '#8E8C86'; g.lineWidth = 1; g.beginPath()
    for (let i = 0; i <= vw; i++) { const x = Math.round(this.ox + i * cs) + 0.5; g.moveTo(x, this.oy); g.lineTo(x, this.oy + vh * cs) }
    for (let j = 0; j <= vh; j++) { const y = Math.round(this.oy + j * cs) + 0.5; g.moveTo(this.ox, y); g.lineTo(this.ox + vw * cs, y) }
    g.stroke()
    g.strokeStyle = '#16161A'; g.lineWidth = 2; g.strokeRect(this.ox, this.oy, vw * cs, vh * cs)
    if (st.mirror) { // axis of Đối xứng (the part's centre line)
      g.strokeStyle = '#E8590C'; g.lineWidth = 2; g.beginPath()
      if (st.rotate) { const y = this.oy + vh * cs / 2; g.moveTo(this.ox - 6, y); g.lineTo(this.ox + vw * cs + 6, y) }
      else { const x = this.ox + vw * cs / 2; g.moveTo(x, this.oy - 6); g.lineTo(x, this.oy + vh * cs + 6) }
      g.stroke()
    }
    if (st.grip) { // grip mark: ink corner brackets
      const [sx, sy] = R(st.grip[0], st.grip[1]), k = Math.max(4, cs * 0.3)
      const dark = getCell(p, st.grip[0], st.grip[1])
      g.strokeStyle = dark ? '#ECEBE6' : '#16161A'; g.lineWidth = 2; g.beginPath()
      g.moveTo(sx + 1, sy + k); g.lineTo(sx + 1, sy + 1); g.lineTo(sx + k, sy + 1)
      g.moveTo(sx + cs - 1, sy + cs - k); g.lineTo(sx + cs - 1, sy + cs - 1); g.lineTo(sx + cs - k, sy + cs - 1)
      g.stroke()
    }
  }
}
