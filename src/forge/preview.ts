// Live 3D preview beside the Lưới (own small WebGL canvas, low-res + pixelated like the game).
// "Thử": the weapon swings at a dummy in place; heavy designs lag behind the swing (swingSpring from inertia).
import * as THREE from 'three'
import { PAL } from '../render/palette'
import { swingSpring } from '../combat/damage'
import { weaponMesh } from '../weapon/mesh'
import type { Voxel } from '../weapon/model'
import type { Profile } from '../combat/profiles'

const RES = 0.5 // render scale

export class Preview {
  root = document.createElement('div')
  private canvas = document.createElement('canvas')
  private r: THREE.WebGLRenderer
  private scene = new THREE.Scene(); private cam = new THREE.PerspectiveCamera(32, 1, 0.01, 20)
  private holder = new THREE.Group(); private spin = new THREE.Group(); private weapon: THREE.Group | null = null
  private dummy = new THREE.Group(); private radius = 0.3
  private ang = 0; private angV = 0; private k = 400; private c = 30
  private swingT = -1; private dummyTilt = 0; private dummyV = 0; private hitDone = false; private freeze = 0
  private last = 0; private raf = 0
  onHit: (power: number, heavy: boolean) => void = () => {}

  constructor() {
    this.root.className = 'pv'; this.root.appendChild(this.canvas)
    this.r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false })
    this.r.setClearColor(PAL.paper)
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8e8c86, 1.6))
    const sun = new THREE.DirectionalLight(0xffffff, 1.8); sun.position.set(1.5, 2, 2.5); this.scene.add(sun)
    this.scene.add(this.holder); this.holder.add(this.spin)
    const ink = new THREE.MeshLambertMaterial({ color: PAL.ink, flatShading: true })
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.6, 0.2), ink); body.position.y = 0.3
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), ink); head.position.y = 0.75
    this.dummy.add(body, head); this.dummy.visible = false; this.scene.add(this.dummy)
    new ResizeObserver(() => this.size()).observe(this.root)
    const loop = (t: number) => { this.raf = requestAnimationFrame(loop); this.tick(Math.min(0.05, (t - (this.last || t)) / 1000)); this.last = t }
    this.raf = requestAnimationFrame(loop)
  }
  private size() {
    const w = Math.max(1, this.root.clientWidth), h = Math.max(1, this.root.clientHeight)
    this.r.setPixelRatio(1); this.r.setSize(Math.round(w * RES), Math.round(h * RES), false)
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px'
    this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); this.frame()
  }
  private frame() {
    const sw = this.swingT >= 0, R = sw ? this.radius * 2 + 0.3 : this.radius, cx = sw ? this.radius * 0.6 : 0
    const fov = (this.cam.fov * Math.PI) / 180, dist = (R / Math.sin(fov / 2)) * (this.cam.aspect < 1 ? 1 / this.cam.aspect : 1) * 1.05
    this.cam.position.set(cx, 0, dist); this.cam.lookAt(cx, 0, 0)
  }

  set(voxels: Voxel[], grip: [number, number], s: number, prof: Profile) {
    if (this.weapon) { this.spin.remove(this.weapon); this.weapon.traverse(o => (o as THREE.Mesh).geometry?.dispose()) }
    this.weapon = voxels.length ? weaponMesh(voxels, grip, s, PAL.ink) : null
    if (!this.weapon) return
    const box = new THREE.Box3().setFromObject(this.weapon), c = box.getCenter(new THREE.Vector3())
    this.radius = Math.max(0.05, box.getSize(new THREE.Vector3()).length() / 2)
    this.weaponCentre.copy(c)
    this.spin.add(this.weapon)
    const sp = swingSpring(prof.inertia); this.k = sp.k; this.c = sp.c; this.heavy = prof.charged
    this.place(); this.frame()
  }
  private weaponCentre = new THREE.Vector3(); private heavy = false; private hitAng = 0
  private place() {
    if (!this.weapon) return
    if (this.swingT >= 0) { this.weapon.position.set(0, 0, 0) } // pivot at the grip
    else this.weapon.position.copy(this.weaponCentre).multiplyScalar(-1)
  }

  /** Thử: one swing at the dummy */
  swing() {
    if (!this.weapon) return
    if (this.swingT < 0) { this.swingT = 0; this.ang = 1.9; this.angV = 0; this.spin.rotation.set(0, 0, 0); this.place(); this.frame() }
    else { this.swingT = 0; this.ang = 1.9; this.angV = 0 }
    this.hitDone = false; this.dummy.visible = true
    this.dummy.position.set(this.radius * 1.6, -0.45, -0.1)
    this.hitAng = Math.atan2(-0.05 + 0.25, this.radius * 1.9) - 0.6
  }

  private tick(dt: number) {
    if (this.freeze > 0) { this.freeze -= dt; this.r.render(this.scene, this.cam); return }
    if (this.swingT >= 0) {
      this.swingT += dt
      const target = this.swingT < 0.12 ? 1.9 : -1.5 // raised, then the slash target
      const steps = 4, h = dt / steps
      for (let i = 0; i < steps; i++) { const a = -this.k * (this.ang - target) - this.c * this.angV; this.angV += a * h; this.ang += this.angV * h }
      this.holder.position.set(-this.radius * 0.3, -0.25, 0)
      this.holder.rotation.set(0, -0.35, this.ang - Math.PI / 2 + 0.6)
      if (!this.hitDone && this.ang < this.hitAng) {
        this.hitDone = true; const power = Math.min(1.5, Math.abs(this.angV) / 18)
        this.dummyV -= 9 * power; this.freeze = 0.05 + (this.heavy ? 0.05 : 0); this.onHit(power, this.heavy)
      }
      if (this.swingT > 1.6) { this.swingT = -1; this.dummy.visible = false; this.place(); this.frame() }
    } else {
      this.holder.position.set(0, 0, 0)
      this.holder.rotation.set(0, 0, -0.9)
      this.spin.rotation.y += dt * 0.8
    }
    this.dummyV += (-60 * this.dummyTilt - 6 * this.dummyV) * dt; this.dummyTilt += this.dummyV * dt
    this.dummy.rotation.z = this.dummyTilt
    this.r.render(this.scene, this.cam)
  }
  dispose() { cancelAnimationFrame(this.raf); this.r.dispose() }
}
