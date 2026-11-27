// Màu motes: hard-edged orange cubes fly from a kill to the voxel in hand. Pooled, no allocation per frame.
import * as THREE from 'three'
import { PAL } from '../render/palette'
const N = 24
export class Motes {
  private pool: { m: THREE.Mesh; v: THREE.Vector3; t: number; on: boolean }[] = []
  collected = 0
  private tgt = new THREE.Vector3()
  constructor(scene: THREE.Scene, private anchor: THREE.Object3D, private onArrive: () => void) {
    const g = new THREE.BoxGeometry(0.035, 0.035, 0.035), mat = new THREE.MeshBasicMaterial({ color: PAL.ve })
    for (let i = 0; i < N; i++) {
      const m = new THREE.Mesh(g, mat); m.visible = false; scene.add(m)
      this.pool.push({ m, v: new THREE.Vector3(), t: 0, on: false })
    }
  }
  burst(at: THREE.Vector3, n: number) {
    for (const p of this.pool) {
      if (n <= 0) break
      if (p.on) continue
      n--; p.on = true; p.t = 0; p.m.visible = true; p.m.position.copy(at)
      p.v.set((Math.random() - 0.5) * 3, 1 + Math.random() * 2.5, (Math.random() - 0.5) * 3)
    }
  }
  update(dt: number) {
    this.anchor.getWorldPosition(this.tgt)
    for (const p of this.pool) {
      if (!p.on) continue
      p.t += dt
      const home = Math.min(1, Math.max(0, (p.t - 0.25) / 0.35)) // burst first, then homing
      p.v.multiplyScalar(Math.exp(-4 * dt))
      p.m.position.addScaledVector(p.v, dt * (1 - home))
      p.m.position.lerp(this.tgt, home * (1 - Math.exp(-9 * dt)))
      p.m.rotation.x += dt * 8; p.m.rotation.y += dt * 6
      if (p.t > 0.6 && p.m.position.distanceTo(this.tgt) < 0.12 || p.t > 1.4) {
        p.on = false; p.m.visible = false; this.collected++; this.onArrive()
      }
    }
  }
}
