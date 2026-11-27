// The drawn weapon in hand: voxel mesh from a 2D design, finger-follow spring, swing tracking.
import * as THREE from 'three'
import { Spring3, clamp } from '../camera/springs'
import { PAL } from '../render/palette'
import { swingSpring, speedCap, chargeTime } from './damage'
import { PROFILES, Profile } from './profiles'
import type { WeaponDesign } from '../weapon/model'
import { assemble, Assembled, Voxel } from '../weapon/model'
import { analyze, analyzeVoxels, connectivity, Stats } from '../weapon/analyze'
import { keyOf } from '../weapon/regions'
import type { Contact } from './effects'
import { weaponMesh } from '../weapon/mesh'
import { designProfile } from '../weapon/runtime'

const V = 0.04 // Khối voxel size (4 cm)
// A crude cleaver someone drew on the 5×5→ grid: o = Voxel thô (orange), c = Chì, . = empty. Row 0 = top.
const DESIGN = [
  '.ooo.',
  'oooo.',
  'oocc.',
  'oocc.',
  'oooo.',
  '.oo..',
  '.c...',
  '.c...',
  '.c...',
]
const GRIP: [number, number] = [1, 7]

function voxelGeometry() {
  const geos: THREE.BufferGeometry[] = []
  const col = new THREE.Color()
  DESIGN.forEach((row, ry) => [...row].forEach((ch, rx) => {
    if (ch === '.') return
    const g = new THREE.BoxGeometry(V, V, V).toNonIndexed()
    g.translate((rx - GRIP[0]) * V, (GRIP[1] - ry) * V, 0)
    col.setHex(ch === 'o' ? PAL.ve : PAL.chi).multiplyScalar(0.92 + ((rx * 7 + ry * 13) % 5) * 0.035)
    const n = g.attributes.position.count, c = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) col.toArray(c, i * 3)
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); geos.push(g)
  }))
  // merge
  let total = 0; for (const g of geos) total += g.attributes.position.count
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), clr = new Float32Array(total * 3)
  let o = 0
  for (const g of geos) {
    pos.set(g.attributes.position.array as Float32Array, o * 3); nor.set(g.attributes.normal.array as Float32Array, o * 3)
    clr.set(g.attributes.color.array as Float32Array, o * 3); o += g.attributes.position.count
  }
  const m = new THREE.BufferGeometry()
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  m.setAttribute('color', new THREE.BufferAttribute(clr, 3))
  return m
}

function outlineGeometry(src: THREE.BufferGeometry, w: number) {
  const g = src.clone(), p = g.attributes.position as THREE.BufferAttribute, n = g.attributes.normal
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * w, p.getY(i) + n.getY(i) * w, p.getZ(i) + n.getZ(i) * w)
  return g
}

export class Weapon {
  pivot = new THREE.Group()       // in camera space
  mesh: THREE.Group
  private blade: THREE.Object3D[] = []
  spring = new Spring3()           // k from inertia (damage.swingSpring)
  profile: Profile = PROFILES.nhe
  charge = 1                       // lực charge 0..1 (vừa/nặng only); refills in chargeTime(I)
  touching = false
  finger = new THREE.Vector2()     // NDC
  tipSpeed = 0
  slashDir = new THREE.Vector2()
  samplesLocal: THREE.Vector3[] = []
  prev: THREE.Vector3[] = []; cur: THREE.Vector3[] = []
  inner = new THREE.Vector3(); tip = new THREE.Vector3()
  private rest = new THREE.Vector3(0.21, -0.12, -0.42) // P15: higher and forward — hand + weapon in frame, not the arm
  private target = new THREE.Vector3()
  private lastTip = new THREE.Vector3(); private hasLast = false
  private rot = new THREE.Vector2()
  private tmpL = new THREE.Vector3()
  raise = 0
  /** Đỡ held: the weapon goes crosswise in front of the face (0..1 eased) */
  guarding = false; guard = 0
  private guardPose = new THREE.Vector3(-0.12, -0.07, -0.42)

  constructor(camera: THREE.Camera) {
    camera.add(this.pivot)
    const geo = voxelGeometry()
    this.mesh = new THREE.Group()
    const body = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }))
    const line = new THREE.Mesh(outlineGeometry(geo, 0.004), new THREE.MeshBasicMaterial({ color: PAL.ink, side: THREE.BackSide }))
    this.mesh.add(line, body); this.blade = [line, body]
    // hand: ink fist + a short wrist stub that leaves the frame at once (the player sees hand + weapon, not the arm)
    const ink = new THREE.MeshLambertMaterial({ color: 0x2a2a2f, flatShading: true })
    const fist = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.09, 0.08), ink); fist.position.set(0, 0, 0)
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.09, 6), ink)
    arm.position.set(0.01, -0.06, 0.035); arm.rotation.set(0.6, 0, -0.2)
    this.mesh.add(fist, arm)
    this.pivot.add(this.mesh)
    this.spring.x.copy(this.rest)
    this.setProfile(PROFILES.nhe)
    const top = (GRIP[1]) * V + 0.5 * V
    for (let i = 0; i < 4; i++) {
      this.samplesLocal.push(new THREE.Vector3(0.5 * V, (0.25 + 0.75 * i / 3) * top, 0))
      this.prev.push(new THREE.Vector3()); this.cur.push(new THREE.Vector3())
    }
  }

  /** per blade sample: what material/regions the sample touches (weapon.md#6: effects need the region to make contact) */
  contacts: Contact[][] = [[], [], [], []]
  private design: WeaponDesign | null = null; private asm: Assembled | null = null
  private neckBroken = false

  /** swap in a Xưởng design: new mesh, samples from grip to the farthest connected voxel, profile from analyze() */
  setDesign(d: WeaponDesign) {
    const st = analyze(d)
    if (!st.connected.length) return
    this.design = d; this.asm = assemble(d); this.neckBroken = false
    this.build(st)
  }

  private build(st: Stats) {
    const a = this.asm!, s = a.voxel
    for (const o of this.blade) this.mesh.remove(o)
    const g = weaponMesh(st.connected, a.grip, s, PAL.ink)
    this.blade = [...g.children]; for (const o of this.blade) this.mesh.add(o)
    let far = st.connected[0], best = -1
    for (const v of st.connected) { const dd = (v.x - a.grip[0]) ** 2 + (v.y - a.grip[1]) ** 2; if (dd > best) { best = dd; far = v } }
    const tx = (far.x - a.grip[0]) * s, ty = (a.grip[1] - far.y) * s + (best === 0 ? s : 0)
    for (let i = 0; i < 4; i++) {
      const sx = tx * (0.25 + 0.75 * i / 3), sy = ty * (0.25 + 0.75 * i / 3)
      this.samplesLocal[i].set(sx, sy, 0)
      // every voxel within ~2 cells of the sample, nearest first (a sample on empty space still touches the closest voxel)
      const near: { v: Voxel; d: number }[] = []
      for (const v of st.connected) near.push({ v, d: Math.hypot((v.x - a.grip[0]) * s - sx, (a.grip[1] - v.y) * s - sy) })
      near.sort((p, q) => p.d - q.d)
      this.contacts[i] = near.filter((n, j) => j === 0 || n.d <= 2 * s).map(n => ({ mat: n.v.mat, tags: st.tags.get(keyOf(n.v))?.tags ?? [] }))
    }
    this.current = st
    this.setProfile(designProfile(st))
  }
  current: Stats | null = null

  /** a heavy charged hit snaps the weakest neck once per level (weapon.md#4.5); the part beyond falls off. */
  breakNeck(): boolean {
    const st = this.current
    if (!st?.neck || this.neckBroken || !this.asm) return false
    this.neckBroken = true
    this.reshape(st.connected.filter(v => !st.neck!.keys.has(keyOf(v))))
    return true
  }
  /** glass chips one voxel off the contact point when it hits armour (restored after the level) */
  chip(k: number): boolean {
    const st = this.current, c = this.contacts[k]
    if (!st || !this.asm || st.connected.length < 2) return false
    const m = c.find(x => x.mat === 'thuytinh'); if (!m) return false
    const v = [...st.connected].filter(v => v.mat === 'thuytinh').sort((p, q) => (q.x - this.asm!.grip[0]) ** 2 + (q.y - this.asm!.grip[1]) ** 2 - (p.x - this.asm!.grip[0]) ** 2 - (p.y - this.asm!.grip[1]) ** 2)[0]
    if (!v) return false
    this.reshape(st.connected.filter(o => o !== v)); return true
  }
  private reshape(vs: Voxel[]) {
    const a = this.asm!, kept = connectivity({ ...a, voxels: vs }).connected
    if (kept.length) this.build(analyzeVoxels(a, kept, []))
  }
  /** end of level: broken necks regrow, chipped glass is back */
  restore() { if (this.design) this.setDesign(this.design) }

  setProfile(p: Profile) {
    this.profile = p
    const sp = swingSpring(p.inertia); this.spring.k = sp.k; this.spring.c = sp.c
    this.mesh.scale.setScalar(p.scale); this.charge = 1
  }
  /** swing ended / a hit landed: a charged weapon starts refilling from 0 */
  spend() { if (this.profile.charged) this.charge = 0 }

  update(dt: number, now: number) {
    if (this.profile.charged && this.charge < 1) this.charge = Math.min(1, this.charge + dt / chargeTime(this.profile.inertia, 1) / 4)
    this.raise += ((this.touching ? 1 : 0) - this.raise) * (1 - Math.exp(-14 * dt))
    const speedN = clamp(this.tipSpeed / 7, 0, 1)
    if (this.touching) this.target.set(this.finger.x * 0.36, this.finger.y * 0.21 - 0.03, -0.5 - speedN * 0.28)
    else this.target.copy(this.rest)
    this.guard += ((this.guarding ? 1 : 0) - this.guard) * (1 - Math.exp(-22 * dt))
    if (this.guard > 0.001) this.target.lerp(this.guardPose, this.guard)
    const p = this.spring.step(this.target, dt)
    const cap = speedCap(this.profile.inertia), sv = this.spring.v.length()
    if (sv > cap) this.spring.v.multiplyScalar(cap / sv)
    this.mesh.position.copy(p)
    // orientation: tip leans into the motion, tilts away from camera when raised
    const v = this.spring.v
    this.rot.x += ((-0.35 - this.raise * 0.75 - clamp(v.y, -4, 4) * 0.12) - this.rot.x) * (1 - Math.exp(-18 * dt))
    this.rot.y += ((-clamp(v.x, -5, 5) * 0.32 - (this.touching ? this.finger.x * 0.5 : 0.25)) - this.rot.y) * (1 - Math.exp(-18 * dt))
    this.mesh.rotation.set(this.rot.x * (1 - this.guard) - 0.15 * this.guard, 0, this.rot.y * (1 - this.guard) - 1.45 * this.guard)
    this.mesh.updateMatrixWorld(true)
    for (let i = 0; i < 4; i++) { this.prev[i].copy(this.cur[i]); this.cur[i].copy(this.samplesLocal[i]).applyMatrix4(this.mesh.matrixWorld) }
    this.inner.copy(this.cur[1]); this.tip.copy(this.cur[3])
    // speed measured in camera space so walking doesn't count as swinging
    const tl = this.tmpL.copy(this.samplesLocal[3]).applyMatrix4(this.mesh.matrix)
    if (this.hasLast && dt > 0) this.tipSpeed = tl.distanceTo(this.lastTip) / dt * 0.6 + this.tipSpeed * 0.4
    this.lastTip.copy(tl); this.hasLast = true
    if (v.lengthSq() > 0.01) this.slashDir.set(v.x, v.y).normalize()
    return now
  }
}
