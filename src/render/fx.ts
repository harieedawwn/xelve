// Blood (pixel droplets → wall/floor decals), slash smear (solid crescent), debris.
import * as THREE from 'three'
import { surfaceHit, HALF_W, HEIGHT } from '../levels/corridor'
import { PAL } from '../render/palette'

const MAXP = 1500, MAXD = 300

function splatTex() {
  const s = 32, cv = document.createElement('canvas'); cv.width = cv.height = s
  const g = cv.getContext('2d')!; g.fillStyle = '#fff'
  let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 9; i++) { // irregular blob from squares = pixel splat
    const w = 4 + r() * 12, x = 16 + (r() - 0.5) * 14 - w / 2, y = 16 + (r() - 0.5) * 14 - w / 2
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(w * (0.6 + r() * 0.6)))
  }
  for (let i = 0; i < 10; i++) g.fillRect(Math.round(r() * 30), Math.round(r() * 30), 2, 2)
  const t = new THREE.CanvasTexture(cv); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false
  return t
}

export class FX {
  // particles
  private pm: THREE.InstancedMesh
  private pp = new Float32Array(MAXP * 3); private pv = new Float32Array(MAXP * 3)
  private pl = new Float32Array(MAXP); private pc: THREE.Color[] = []
  private pn = 0
  maxParticles = 500
  // decals
  private dm: THREE.InstancedMesh; private di = 0; maxDecals = 120
  // smear
  private trail: { a: THREE.Vector3; b: THREE.Vector3; t: number }[] = []
  private sm: THREE.Mesh; private sg: THREE.BufferGeometry; private spos: Float32Array
  // debris
  debris: { o: THREE.Object3D; v: THREE.Vector3; w: THREE.Vector3; life: number }[] = []
  private m4 = new THREE.Matrix4(); private q = new THREE.Quaternion(); private v3 = new THREE.Vector3(); private s3 = new THREE.Vector3()
  private hit = { p: new THREE.Vector3(), n: new THREE.Vector3() }
  private z = new THREE.Vector3(0, 0, 1)
  // scratch (no per-frame allocation)
  private sq = new THREE.Quaternion(); private sc = new THREE.Color(); private sp = new THREE.Vector3(); private sn = new THREE.Vector3(); private sd = new THREE.Vector3()
  private up = new THREE.Vector3(0, 1, 0); private dn = new THREE.Vector3(0, -1, 0); private wn = new THREE.Vector3()
  get particleCount() { return this.pn }
  get decalCount() { return this.dm.count }

  /** room bounds for droplet landing (corridor by default; open arenas pass a wide box) */
  constructor(private scene: THREE.Scene, private halfW = HALF_W, private height = HEIGHT) {
    this.pm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), MAXP)
    this.pm.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.pm.count = 0; this.pm.frustumCulled = false
    for (let i = 0; i < MAXP; i++) { this.pc.push(new THREE.Color()); this.pm.setColorAt(i, this.pc[i]) }
    scene.add(this.pm)
    const dmat = new THREE.MeshBasicMaterial({ map: splatTex(), alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false })
    this.dm = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), dmat, MAXD); this.dm.count = 0; this.dm.frustumCulled = false
    for (let i = 0; i < MAXD; i++) this.dm.setColorAt(i, new THREE.Color())
    scene.add(this.dm)
    this.spos = new Float32Array(32 * 2 * 3)
    this.sg = new THREE.BufferGeometry(); this.sg.setAttribute('position', new THREE.BufferAttribute(this.spos, 3))
    const idx: number[] = []; for (let i = 0; i < 31; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
    this.sg.setIndex(idx)
    this.sm = new THREE.Mesh(this.sg, new THREE.MeshBasicMaterial({ color: PAL.ve, side: THREE.DoubleSide, depthTest: true }))
    this.sm.frustumCulled = false; this.sm.renderOrder = 5; scene.add(this.sm)
  }

  blood(at: THREE.Vector3, dir: THREE.Vector3, color: number, n: number, speed = 3.5) {
    for (let k = 0; k < n; k++) {
      if (this.pn >= this.maxParticles) break
      const i = this.pn++
      this.pp[i * 3] = at.x; this.pp[i * 3 + 1] = at.y; this.pp[i * 3 + 2] = at.z
      const sp = speed * (0.35 + Math.random())
      this.pv[i * 3] = dir.x * sp + (Math.random() - 0.5) * 2.2
      this.pv[i * 3 + 1] = dir.y * sp + Math.random() * 2.2
      this.pv[i * 3 + 2] = dir.z * sp + (Math.random() - 0.5) * 2.2
      this.pl[i] = 1.6
      this.pc[i].setHex(color).multiplyScalar(0.85 + Math.random() * 0.3)
      this.pm.setColorAt(i, this.pc[i])
    }
  }

  decal(p: THREE.Vector3, n: THREE.Vector3, color: number, size: number) {
    const i = this.di++ % this.maxDecals
    this.q.setFromUnitVectors(this.z, n)
    this.sq.setFromAxisAngle(this.z, Math.random() * 6.28)
    this.q.multiply(this.sq)
    this.v3.copy(p).addScaledVector(n, 0.004 + (i % 7) * 0.0006)
    this.m4.compose(this.v3, this.q, this.s3.set(size, size, 1))
    this.dm.setMatrixAt(i, this.m4); this.dm.setColorAt(i, this.sc.setHex(color))
    this.dm.count = Math.min(this.maxDecals, Math.max(this.dm.count, i + 1))
    this.dm.instanceMatrix.needsUpdate = true; this.dm.instanceColor!.needsUpdate = true
  }

  /** spray toward surfaces behind the target to stain the white world */
  splash(at: THREE.Vector3, dir: THREE.Vector3, color: number, count: number) {
    for (let k = 0; k < count; k++) {
      const d = this.sd.copy(dir).add(this.sp.set((Math.random() - 0.5) * 1.4, (Math.random() - 0.3) * 1.2, (Math.random() - 0.5) * 1.4)).normalize()
      if (surfaceHit(at, d, this.hit)) this.decal(this.hit.p, this.hit.n, color, 0.12 + Math.random() * 0.35)
    }
  }

  smearPush(a: THREE.Vector3, b: THREE.Vector3, t: number) {
    if (this.trail.length >= 32) { const o = this.trail.shift()!; o.a.copy(a); o.b.copy(b); o.t = t; this.trail.push(o) }
    else this.trail.push({ a: a.clone(), b: b.clone(), t })
  }

  addDebris(o: THREE.Object3D, v: THREE.Vector3, w: THREE.Vector3) { this.debris.push({ o, v, w, life: 5 }) }

  update(dt: number, now: number) {
    // particles
    for (let i = 0; i < this.pn; i++) {
      const j = i * 3
      this.pv[j + 1] -= 9.8 * dt
      const ox = this.pp[j], oy = this.pp[j + 1], oz = this.pp[j + 2]
      this.pp[j] += this.pv[j] * dt; this.pp[j + 1] += this.pv[j + 1] * dt; this.pp[j + 2] += this.pv[j + 2] * dt
      this.pl[i] -= dt
      const x = this.pp[j], y = this.pp[j + 1]
      const landed = y < 0.002 || y > this.height || Math.abs(x) > this.halfW
      if (landed || this.pl[i] <= 0) {
        if (landed && Math.random() < 0.35) {
          const n = y < 0.01 ? this.up : y > this.height ? this.dn : this.wn.set(-Math.sign(x), 0, 0)
          const p = this.sn.set(Math.max(-this.halfW, Math.min(this.halfW, ox)), Math.max(0, Math.min(this.height, oy)), oz)
          if (n.y > 0) p.y = 0; if (n.x !== 0) p.x = -n.x * this.halfW
          this.decal(p, n, this.pc[i].getHex(), 0.03 + Math.random() * 0.07)
        }
        // swap-remove
        const last = --this.pn
        if (i !== last) {
          this.pp.copyWithin(j, last * 3, last * 3 + 3); this.pv.copyWithin(j, last * 3, last * 3 + 3)
          this.pl[i] = this.pl[last]; this.pc[i].copy(this.pc[last]); this.pm.setColorAt(i, this.pc[i])
        }
        i--; continue
      }
    }
    for (let i = 0; i < this.pn; i++) {
      const j = i * 3, s = 0.018
      this.m4.makeScale(s, s, s).setPosition(this.pp[j], this.pp[j + 1], this.pp[j + 2])
      this.pm.setMatrixAt(i, this.m4)
    }
    this.pm.count = this.pn; this.pm.instanceMatrix.needsUpdate = true
    if (this.pm.instanceColor) this.pm.instanceColor.needsUpdate = true

    // smear: solid crescent; old samples collapse toward the tip (taper), no fading
    const life = 0.11
    while (this.trail.length && now - this.trail[0].t > life) this.trail.shift()
    const n = this.trail.length
    for (let i = 0; i < 32; i++) {
      const e = this.trail[Math.min(i, n - 1)]
      if (!e || n < 2) { this.spos.fill(0, i * 6, i * 6 + 6); continue }
      const age = Math.min(1, (now - e.t) / life)
      const k = Math.min(1, age * 1.15)
      const ax = e.a.x + (e.b.x - e.a.x) * k, ay = e.a.y + (e.b.y - e.a.y) * k, az = e.a.z + (e.b.z - e.a.z) * k
      const o = i * 6; this.spos[o] = ax; this.spos[o + 1] = ay; this.spos[o + 2] = az; this.spos[o + 3] = e.b.x; this.spos[o + 4] = e.b.y; this.spos[o + 5] = e.b.z
    }
    ;(this.sg.attributes.position as THREE.BufferAttribute).needsUpdate = true
    this.sm.visible = n >= 2

    // debris
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i]
      d.v.y -= 9.8 * dt; d.o.position.addScaledVector(d.v, dt)
      d.o.rotation.x += d.w.x * dt; d.o.rotation.y += d.w.y * dt; d.o.rotation.z += d.w.z * dt
      if (d.o.position.y < 0.06) { d.o.position.y = 0.06; d.v.y *= -0.3; d.v.x *= 0.6; d.v.z *= 0.6; d.w.multiplyScalar(0.6) }
      if (Math.abs(d.o.position.x) > this.halfW - 0.1) { d.v.x *= -0.4; d.o.position.x = Math.sign(d.o.position.x) * (this.halfW - 0.1) }
      d.life -= dt
      if (d.life < 1) d.o.position.y -= dt * 0.15 // sink into the floor, no fade
      if (d.life <= 0) { this.scene.remove(d.o); this.debris.splice(i, 1) }
    }
  }
}
