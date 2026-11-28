import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { boxOf, probe, resolveContact, depthInside, type Hit } from './contact'
import { Weapon } from './weapon'
import { PROFILES } from './profiles'

const hit = (): Hit => ({ point: new THREE.Vector3(), normal: new THREE.Vector3(), depth: 0, col: null as never })
function car(x = 0, y = 0, z = -0.9, rot = 0) {
  const g = new THREE.Group(), m = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 0.6)); g.add(m)
  g.position.set(x, y, z); g.rotation.y = rot; g.scale.set(1.3, 1, 1); g.updateMatrixWorld(true); return g
}

describe('hard-body contact (P16)', () => {
  it('a point inside a rotated, scaled box exits through the nearest face', () => {
    const c = boxOf(car(0, 0, -2, 0.4)), h = hit()
    const p = new THREE.Vector3(0, 0, -2).add(new THREE.Vector3(0, 0, 0.25).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.4))
    expect(probe(p, c, h)).toBe(true)
    expect(h.depth).toBeCloseTo(0.05, 3)
    expect(probe(new THREE.Vector3(0, 0, 0), c, h)).toBe(false)
  })
  it('the blade never stays inside a body while swinging through it', () => {
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(84, 2, 0.05, 50); scene.add(cam)
    const w = new Weapon(cam); w.viewPx.set(800, 400); w.setProfile(PROFILES.vua)
    const body = car(0, -0.1, -1.0); scene.add(body)
    const cols = [boxOf(body)]
    w.touching = true; w.finger.set(-0.8, 0.2)
    let touched = 0, worst = 0
    for (let i = 0; i < 90; i++) {
      w.finger.x = -0.8 + 1.6 * Math.min(1, i / 8) * (i < 45 ? 1 : 0); w.update(1 / 60, 0)
      if (resolveContact(w, cols, hit())) touched++
      worst = Math.max(worst, depthInside(w, cols))
    }
    expect(touched).toBeGreaterThan(0)
    expect(worst).toBeLessThan(0.01)
  })
})
