import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { Weapon } from './weapon'
import { PROFILES } from './profiles'
import { FEEL } from './feel'
import { gainAt, newAim, stepAim } from './aim'

const W = 800, H = 400, dt = 1 / 60
/** flick `cm` sideways in `sec`, then hold; returns peak tip speed and how far the target travelled */
function flick(profile: keyof typeof PROFILES, cm: number, sec: number) {
  const cam = new THREE.PerspectiveCamera(84, W / H, 0.05, 50)
  const w = new Weapon(cam); w.viewPx.set(W, H); w.setProfile(PROFILES[profile])
  const ndc = cm * FEEL.pxPerCm / (W / 2), x0 = -ndc / 2
  for (let i = 0; i < 20; i++) w.update(dt, i * dt) // settle at rest
  w.finger.set(x0, 0); w.touching = true
  for (let i = 0; i < 10; i++) w.update(dt, 0) // raised, still
  const xStart = w.aim.x, frames = Math.round(sec / dt)
  let vmax = 0, yawMax = 0
  for (let i = 1; i <= frames + 20; i++) {
    w.finger.x = x0 + ndc * Math.min(1, i / frames)
    w.update(dt, 0); vmax = Math.max(vmax, w.tipSpeed); yawMax = Math.max(yawMax, Math.abs(w.mesh.rotation.y))
  }
  return { vmax, travel: w.aim.x - xStart, yawMax }
}

describe('touch feel (P16)', () => {
  it('gain grows with finger speed, 1.6 → 3.2', () => {
    expect(gainAt(0)).toBeCloseTo(1.6); expect(gainAt(200)).toBeCloseTo(3.2)
    expect(gainAt(30)).toBeGreaterThan(1.6); expect(gainAt(30)).toBeLessThan(3.2)
  })
  it('6 cm flick in 0.08 s: tip speed > 4 m/s with Khối and Dao', () => {
    expect(flick('khoi', 6, 0.08).vmax).toBeGreaterThan(4)
    expect(flick('nhe', 6, 0.08).vmax).toBeGreaterThan(4) // Dao-weight (inertia ≈ 1–2)
  })
  it('a short flick makes a long arc (no full-screen swipe needed)', () => {
    const f = flick('nhe', 6, 0.08)
    const old = 6 * FEEL.pxPerCm / (W / 2) * FEEL.anchor.x // the old 1:1 map: 0.34 m
    expect(f.travel).toBeGreaterThan(old * 1.8)          // ≥ 0.6 m: from left of centre to the right edge
    expect(f.yawMax).toBeGreaterThan(0.6)                 // and the weapon swings round the hand
  })
  it('slow drags move less per cm than fast ones; target stays in range', () => {
    const a = newAim(); stepAim(a, true, 0, 0, W, H, dt)
    for (let i = 1; i <= 60; i++) stepAim(a, true, i * 0.002, 0, W, H, dt) // 0.12 NDC over 1 s
    const slow = a.x
    const b = newAim(); stepAim(b, true, 0, 0, W, H, dt)
    stepAim(b, true, 0.12, 0, W, H, dt) // same 0.12 NDC in one frame
    expect(b.x).toBeGreaterThan(slow * 1.5)
    const c = newAim(); stepAim(c, true, 0, 0, W, H, dt)
    for (let i = 1; i <= 30; i++) stepAim(c, true, -i * 0.2, i * 0.2, W, H, dt)
    expect(c.x).toBeGreaterThanOrEqual(-FEEL.range.x); expect(c.y).toBeLessThanOrEqual(FEEL.range.yMax)
  })
})
