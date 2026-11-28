// Hard bodies (P16): weapon samples that enter a box collider stop at its surface. The weapon is pushed back
// (no clipping), and the contact (point, normal, piece) is reported so the scene can spark and scratch.
import * as THREE from 'three'
import { FEEL } from './feel'
import type { Weapon } from './weapon'
import type { Sparks } from '../render/sparks'
import { SLASH_V } from './sweep'

/** a box in the local frame of `o` (moves with it). metal → sparks + scratch, else just stops */
export interface BoxCollider { o: THREE.Object3D; box: THREE.Box3; metal: boolean; on?: () => boolean }
export interface Hit { point: THREE.Vector3; normal: THREE.Vector3; depth: number; col: BoxCollider }

const inv = new THREE.Matrix4(), L = new THREE.Vector3(), mm = new THREE.Matrix4(), gb = new THREE.Box3()
/** local bounding box of every mesh under `o` (in o's own frame, so scale/rotation of o are applied later) */
export function boxOf(o: THREE.Object3D, metal = true, on?: () => boolean): BoxCollider {
  o.updateWorldMatrix(true, true); inv.copy(o.matrixWorld).invert()
  const box = new THREE.Box3()
  o.traverse((m) => {
    const g = (m as THREE.Mesh).geometry; if (!g || !(m as THREE.Mesh).isMesh) return
    if (!g.boundingBox) g.computeBoundingBox()
    box.union(gb.copy(g.boundingBox!).applyMatrix4(mm.multiplyMatrices(inv, m.matrixWorld)))
  })
  return { o, box, metal, on }
}

/** is world point p inside the collider? If so fill `out` with the nearest surface point (world) and outward normal */
export function probe(p: THREE.Vector3, c: BoxCollider, out: Hit): boolean {
  inv.copy(c.o.matrixWorld).invert(); L.copy(p).applyMatrix4(inv)
  const b = c.box
  if (!b.containsPoint(L)) return false
  // exit through the closest face, measured in world units (scale may differ per axis)
  const e = c.o.matrixWorld.elements
  const sx = Math.hypot(e[0], e[1], e[2]), sy = Math.hypot(e[4], e[5], e[6]), sz = Math.hypot(e[8], e[9], e[10])
  const d = [(L.x - b.min.x) * sx, (b.max.x - L.x) * sx, (L.y - b.min.y) * sy, (b.max.y - L.y) * sy, (L.z - b.min.z) * sz, (b.max.z - L.z) * sz]
  let f = 0; for (let i = 1; i < 6; i++) if (d[i] < d[f]) f = i
  const q = out.point.copy(L)
  if (f === 0) q.x = b.min.x; else if (f === 1) q.x = b.max.x; else if (f === 2) q.y = b.min.y; else if (f === 3) q.y = b.max.y; else if (f === 4) q.z = b.min.z; else q.z = b.max.z
  q.applyMatrix4(c.o.matrixWorld)
  out.normal.copy(q).sub(p); out.depth = out.normal.length()
  if (out.depth > 1e-6) out.normal.divideScalar(out.depth); else out.normal.set(0, 1, 0)
  out.col = c
  return true
}

const tmp: Hit = { point: new THREE.Vector3(), normal: new THREE.Vector3(), depth: 0, col: null as unknown as BoxCollider }
const push = new THREE.Vector3()
/** push the blade out of every collider (2 passes). Returns the deepest contact this frame, or null. */
export function resolveContact(w: Weapon, cols: BoxCollider[], out: Hit): Hit | null {
  let found: Hit | null = null
  for (let pass = 0; pass < 2; pass++) {
    let best = 0, bk = -1
    for (const c of cols) {
      if (c.on && !c.on()) continue
      for (let k = 1; k < 4; k++) if (probe(w.cur[k], c, tmp) && tmp.depth > best && tmp.depth < FEEL.pushMax) {
        best = tmp.depth; bk = k; out.point.copy(tmp.point); out.normal.copy(tmp.normal); out.depth = tmp.depth; out.col = c
      }
    }
    if (bk < 0) break
    found = out
    w.nudge(push.copy(out.normal).multiplyScalar(out.depth + 0.005))
  }
  return found
}

/** debug overlay: box outlines that follow their pieces */
export function showColliders(cols: BoxCollider[], color = 0xffffff) {
  const mat = new THREE.LineBasicMaterial({ color, depthTest: false })
  for (const c of cols) {
    const s = c.box.getSize(new THREE.Vector3()), m = c.box.getCenter(new THREE.Vector3())
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(s.x, s.y, s.z)), mat)
    l.position.copy(m); l.renderOrder = 9; c.o.add(l)
  }
}

/** deepest sample still inside a collider (debug: should stay ~0 after resolveContact) */
export function depthInside(w: Weapon, cols: BoxCollider[]) {
  let d = 0
  for (const c of cols) { if (c.on && !c.on()) continue; for (let k = 1; k < 4; k++) if (probe(w.cur[k], c, tmp) && tmp.depth < FEEL.pushMax) d = Math.max(d, tmp.depth) }
  return d
}

/** per-scene glue: push the blade out, scrape (sparks + scratch), report a fresh clank. Stats for headless checks. */
export class BladeContact {
  stats = { frames: 0, clanks: 0, residual: 0 }
  private hit: Hit = { point: new THREE.Vector3(), normal: new THREE.Vector3(), depth: 0, col: null as unknown as BoxCollider }
  private along = new THREE.Vector3()
  constructor(private w: Weapon, private sparks: Sparks, private onClank: () => void) {}
  step(cols: BoxCollider[]) {
    if (!cols.length) return
    const c = resolveContact(this.w, cols, this.hit)
    if (c) {
      this.stats.frames++; const a = this.along.copy(this.w.cur[3]).sub(this.w.prev[3]); if (a.lengthSq() > 1e-8) a.normalize()
      if (this.sparks.scrape(c.col.o, c.point, c.normal, a, c.col.metal) && this.w.tipSpeed > SLASH_V) { this.stats.clanks++; this.onClank() }
    }
    this.stats.residual = Math.max(this.stats.residual, depthInside(this.w, cols))
  }
}

const pool: BoxCollider[] = []
/** hard parts of the living targets this frame (reused array) */
export function hardOf(list: { alive: boolean; hard?: BoxCollider[] }[]) {
  pool.length = 0
  for (const e of list) if (e.alive && e.hard) for (const c of e.hard) pool.push(c)
  return pool
}
