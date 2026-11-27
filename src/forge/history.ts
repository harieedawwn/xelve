// Hoàn tác / Làm lại: snapshots of the whole design (small grids, so JSON copies are cheap).
import { WeaponDesign, cloneDesign } from '../weapon/model'

export class History {
  private past: WeaponDesign[] = []; private future: WeaponDesign[] = []
  constructor(private limit = 60) {}
  push(d: WeaponDesign) { this.past.push(cloneDesign(d)); if (this.past.length > this.limit) this.past.shift(); this.future = [] }
  /** drop the last snapshot (a stroke that turned into a pinch) */
  drop() { this.past.pop() }
  /** take back the last snapshot without touching redo (cancelled stroke) */
  pop(): WeaponDesign | null { return this.past.pop() ?? null }
  undo(cur: WeaponDesign): WeaponDesign | null { const p = this.past.pop(); if (!p) return null; this.future.push(cloneDesign(cur)); return p }
  redo(cur: WeaponDesign): WeaponDesign | null { const f = this.future.pop(); if (!f) return null; this.past.push(cloneDesign(cur)); return f }
  get canUndo() { return this.past.length > 0 }
  get canRedo() { return this.future.length > 0 }
}
