// Metal contact (P16): sparks = hard-edged unlit quads (white + orange) that fly and fall; scratches = thin flat
// strips parented to the piece that was hit (they move with it). Both pooled, no per-frame allocation.
import * as THREE from 'three'
import { PAL } from './palette'
import { FEEL } from '../combat/feel'

const MAXS = 96
export class Sparks {
  private m: THREE.InstancedMesh
  private p = new Float32Array(MAXS * 3); private v = new Float32Array(MAXS * 3); private life = new Float32Array(MAXS)
  private n = 0
  private scr: THREE.Mesh[] = []; private si = 0
  private scrMat = new THREE.MeshBasicMaterial({ color: PAL.paper, polygonOffset: true, polygonOffsetFactor: -3 })
  private scrGeo = new THREE.PlaneGeometry(1, 1)
  private m4 = new THREE.Matrix4(); private q = new THREE.Quaternion(); private s = new THREE.Vector3(); private t = new THREE.Vector3()
  private c = new THREE.Color(); private z = new THREE.Vector3(0, 0, 1)
  private inv = new THREE.Matrix4(); private a = new THREE.Vector3(); private b = new THREE.Vector3(); private nl = new THREE.Vector3()
  last = 0
  constructor(private scene: THREE.Scene, private cam: THREE.Camera) {
    this.m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), MAXS)
    this.m.count = 0; this.m.frustumCulled = false; this.m.renderOrder = 6
    for (let i = 0; i < MAXS; i++) this.m.setColorAt(i, this.c.setHex(i % 3 ? PAL.paper : PAL.ve))
    scene.add(this.m)
  }
  get count() { return this.n }
  /** burst at a contact point, thrown off the surface (normal) and along the slash */
  burst(at: THREE.Vector3, normal: THREE.Vector3, along: THREE.Vector3, k: number = FEEL.sparkN) {
    for (let i = 0; i < k && this.n < MAXS; i++) {
      const j = this.n * 3, sp = 2 + Math.random() * 3.5
      this.p[j] = at.x; this.p[j + 1] = at.y; this.p[j + 2] = at.z
      this.v[j] = (normal.x * 0.8 + along.x * 0.7 + (Math.random() - 0.5)) * sp
      this.v[j + 1] = (normal.y * 0.8 + along.y * 0.7 + Math.random() * 0.8) * sp
      this.v[j + 2] = (normal.z * 0.8 + along.z * 0.7 + (Math.random() - 0.5)) * sp
      this.life[this.n++] = 0.18 + Math.random() * 0.2
    }
  }
  /** a scratch strip from world a → b on the surface with world normal n, parented to `o` */
  scratch(o: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, n: THREE.Vector3) {
    if (a.distanceToSquared(b) < 1e-4) return
    let m = this.scr[this.si % FEEL.scratchMax]
    if (!m) { m = new THREE.Mesh(this.scrGeo, this.scrMat); this.scr.push(m) }
    this.si++
    // build in world, then express in o's frame
    const mid = this.t.copy(a).add(b).multiplyScalar(0.5).addScaledVector(n, 0.006), dir = this.a.copy(b).sub(a), len = dir.length()
    dir.divideScalar(len)
    const x = dir, y = this.b.crossVectors(n, x).normalize(), z = this.nl.crossVectors(x, y)
    this.m4.makeBasis(x, y, z).setPosition(mid)
    this.m4.scale(this.s.set(len + FEEL.scratchW, FEEL.scratchW * (0.6 + Math.random() * 0.8), 1))
    o.updateWorldMatrix(true, false); this.inv.copy(o.matrixWorld).invert()
    this.m4.premultiply(this.inv); m.matrixAutoUpdate = false
    m.matrix.copy(this.m4); m.matrixWorldNeedsUpdate = true
    if (m.parent !== o) o.add(m)
  }
  private lastO: THREE.Object3D | null = null; private lastP = new THREE.Vector3(); private lastT = -1; private sparkT = -1
  /** one contact frame: scratch from the last contact on the same piece, sparks at most every FEEL.sparkEvery.
   *  Returns true when this is a fresh contact (not a continuing scrape) — the scene plays the clank then. */
  scrape(o: THREE.Object3D, at: THREE.Vector3, normal: THREE.Vector3, along: THREE.Vector3, metal = true) {
    const now = this.clock
    const cont = this.lastO === o && now - this.lastT < 0.08
    if (metal && cont) this.scratch(o, this.lastP, at, normal)
    if (metal && now - this.sparkT > FEEL.sparkEvery) { this.burst(at, normal, along, cont ? 3 : FEEL.sparkN); this.sparkT = now }
    this.lastO = o; this.lastP.copy(at); this.lastT = now
    return !cont
  }
  private clock = 0
  update(dt: number) {
    this.clock += dt
    const cq = this.cam.getWorldQuaternion(this.q)
    for (let i = 0; i < this.n; i++) {
      const j = i * 3
      this.life[i] -= dt
      if (this.life[i] <= 0) { const l = --this.n; if (i !== l) { this.p.copyWithin(j, l * 3, l * 3 + 3); this.v.copyWithin(j, l * 3, l * 3 + 3); this.life[i] = this.life[l] } i--; continue }
      this.v[j + 1] -= 9.8 * dt
      this.p[j] += this.v[j] * dt; this.p[j + 1] += this.v[j + 1] * dt; this.p[j + 2] += this.v[j + 2] * dt
      const sz = 0.012 + this.life[i] * 0.04
      this.m4.compose(this.t.set(this.p[j], this.p[j + 1], this.p[j + 2]), cq, this.s.set(sz, sz, 1))
      this.m.setMatrixAt(i, this.m4)
    }
    this.m.count = this.n; this.m.instanceMatrix.needsUpdate = true
  }
}
