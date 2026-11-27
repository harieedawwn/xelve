// Catmull-Rom rail: body position by distance s (arc-length table), tangent and curvature.
import * as THREE from 'three'

export class Rail {
  readonly length: number
  private pts: THREE.Vector3[]
  private table: number[] = [] // cumulative arc length per sample
  private static N = 24 // samples per segment
  private a = new THREE.Vector3(); private b = new THREE.Vector3()

  constructor(points: THREE.Vector3[]) {
    if (points.length < 2) throw new Error('Rail needs 2+ points')
    this.pts = [points[0], ...points, points[points.length - 1]] // clamp ends
    let acc = 0; this.table.push(0)
    const prev = new THREE.Vector3(), cur = new THREE.Vector3()
    this.raw(0, prev)
    const total = (this.pts.length - 3) * Rail.N
    for (let i = 1; i <= total; i++) { this.raw(i / Rail.N, cur); acc += cur.distanceTo(prev); prev.copy(cur); this.table.push(acc) }
    this.length = acc
  }

  static straight(len: number) { return new Rail([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -len)]) }

  private raw(u: number, out: THREE.Vector3) {
    const segs = this.pts.length - 3
    const i = Math.min(segs - 1, Math.max(0, Math.floor(u))), t = Math.min(1, Math.max(0, u - i))
    const [p0, p1, p2, p3] = [this.pts[i], this.pts[i + 1], this.pts[i + 2], this.pts[i + 3]]
    const t2 = t * t, t3 = t2 * t
    return out.set(
      0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3))
  }

  /** distance → spline parameter (binary search in the arc table) */
  private param(s: number) {
    s = Math.min(this.length, Math.max(0, s))
    let lo = 0, hi = this.table.length - 1
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.table[m] <= s) lo = m; else hi = m }
    const span = this.table[hi] - this.table[lo] || 1
    return (lo + (s - this.table[lo]) / span) / Rail.N
  }

  pos(s: number, out = new THREE.Vector3()) { return this.raw(this.param(s), out) }

  tangent(s: number, out = new THREE.Vector3()) {
    this.pos(s - 0.15, this.a); this.pos(s + 0.15, this.b)
    return out.copy(this.b).sub(this.a).normalize()
  }

  /** signed horizontal curvature (rad/m): + = turning left */
  curvature(s: number) {
    const t0 = this.tangent(s - 0.3, new THREE.Vector3()), t1 = this.tangent(s + 0.3, new THREE.Vector3())
    return (t1.x * t0.z - t1.z * t0.x) / 0.6
  }
}
