// Bãi đỗ xe, top deck (L8 boss arena): open concrete deck, parked white cars, 6 covers on an arc facing Đống,
// the broadcast tower beyond the car park (slow white pulse). Procedural only. Covers break permanently into rubble.
import * as THREE from 'three'
import { PAL } from '../render/palette'
import { gritTex } from './corridor'
import { makeCar, edgeMat } from './car'
import type { FX } from '../render/fx'

export const ARENA = { boss: new THREE.Vector3(0, 0, -16), radius: 11, spread: 55, halfW: 40, height: 60 }
export type CoverKind = 'pillar' | 'van' | 'booth' | 'barrier' | 'car'
const KINDS: CoverKind[] = ['pillar', 'van', 'booth', 'pillar', 'barrier', 'car']

export interface Cover { kind: CoverKind; feet: THREE.Vector3; group: THREE.Group; alive: boolean }

/** feet position of cover i on the arc (player stands here, facing the boss) */
export function coverFeet(i: number, out = new THREE.Vector3()) {
  const a = (-ARENA.spread + (2 * ARENA.spread * i) / 5) * Math.PI / 180
  return out.set(ARENA.boss.x + Math.sin(a) * ARENA.radius, 0, ARENA.boss.z + Math.cos(a) * ARENA.radius)
}

export function buildCarPark(scene: THREE.Scene) {
  const solid = (c: number) => new THREE.MeshLambertMaterial({ color: c, flatShading: true })
  const box = (w: number, h: number, d: number, c: number, parent: THREE.Object3D, x: number, y: number, z: number, edges = true) => {
    const g = new THREE.BoxGeometry(w, h, d), m = new THREE.Mesh(g, solid(c)); m.position.set(x, y, z); parent.add(m)
    if (edges) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat); m.add(e) }
    return m
  }
  // deck with painted bays (lines baked into the grit texture)
  const cv = document.createElement('canvas'); cv.width = cv.height = 64
  const g2 = cv.getContext('2d')!; const grit = gritTex(64, 182, 24, 31).image as HTMLCanvasElement
  g2.drawImage(grit, 0, 0); g2.fillStyle = '#ECEBE6'; g2.fillRect(0, 0, 2, 64); g2.fillRect(0, 62, 64, 2)
  const ft = new THREE.CanvasTexture(cv); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.magFilter = THREE.NearestFilter; ft.colorSpace = THREE.SRGBColorSpace; ft.repeat.set(80 / 2.6, 80 / 5.2)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshLambertMaterial({ map: ft })); floor.rotation.x = -Math.PI / 2; floor.position.z = -16; scene.add(floor)
  // parapet + lamp posts
  for (const [w, x, z, ry] of [[80, 0, -46, 0], [80, -34, -16, Math.PI / 2], [80, 34, -16, Math.PI / 2], [80, 0, 14, 0]] as const) { const p = box(w, 1.1, 0.3, PAL.paper2, scene, x, 0.55, z); p.rotation.y = ry }
  for (const x of [-22, -8, 8, 22]) { box(0.2, 6, 0.2, PAL.stone, scene, x, 3, -38, false); box(1.4, 0.12, 0.3, PAL.ink, scene, x + 0.6, 6, -38, false) }
  // parked cars in rows; a few slid out of their bays toward the centre
  const rnd = (i: number) => (Math.sin(i * 91.7) * 43758.5) % 1
  for (let i = 0; i < 16; i++) {
    const c = makeCar(i % 5 === 0 ? 'van' : 'car'), row = i < 8 ? -1 : 1, x = row * (20 + Math.abs(rnd(i)) * 6), z = -34 + (i % 8) * 6.5
    c.position.set(x, 0, z); c.rotation.y = Math.PI / 2 + rnd(i + 3) * 0.6; scene.add(c)
  }
  // Đài phát: tall thin white tower with a lattice of panels, slow white pulse (colour, not glow)
  const wc = document.createElement('canvas'); wc.width = 16; wc.height = 16
  const wg = wc.getContext('2d')!; wg.fillStyle = '#ffffff'; wg.fillRect(0, 0, 16, 16); wg.fillStyle = '#cfcdc6'; wg.fillRect(3, 4, 10, 7)
  const wt = new THREE.CanvasTexture(wc); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.magFilter = THREE.NearestFilter; wt.repeat.set(3, 24); wt.colorSpace = THREE.SRGBColorSpace
  const towerMat = new THREE.MeshBasicMaterial({ map: wt, color: 0xe4e3de })
  const tw = new THREE.Mesh(new THREE.BoxGeometry(7, 56, 7), towerMat); tw.position.set(4, 22, -78); scene.add(tw)
  box(2.4, 14, 2.4, PAL.paper, scene, 4, 57, -78); box(0.5, 9, 0.5, PAL.stone, scene, 4, 68.5, -78)
  // covers on the arc
  const covers: Cover[] = KINDS.map((kind, i) => {
    const feet = coverFeet(i), grp = new THREE.Group()
    const toBoss = new THREE.Vector3().subVectors(ARENA.boss, feet).setY(0).normalize()
    const side = new THREE.Vector3(toBoss.z, 0, -toBoss.x).multiplyScalar(i < 3 ? -1 : 1) // outward along the arc
    grp.position.copy(feet).addScaledVector(toBoss, 1.7).addScaledVector(side, 1.35)
    grp.rotation.y = Math.atan2(toBoss.x, toBoss.z)
    if (kind === 'pillar') box(0.9, 4.2, 0.9, PAL.paper2, grp, 0, 2.1, 0)
    else if (kind === 'booth') { box(1.5, 2.3, 1.3, PAL.paper, grp, 0, 1.15, 0); box(1.1, 0.7, 0.05, PAL.ink, grp, 0, 1.5, 0.66, false); box(1.8, 0.14, 1.6, PAL.stone, grp, 0, 2.37, 0) }
    else if (kind === 'barrier') for (const x of [-1.0, 0, 1.0]) box(0.95, 0.95, 0.5, PAL.paper2, grp, x, 0.48, 0)
    else { const c = makeCar(kind === 'van' ? 'van' : 'car'); c.rotation.y = Math.PI / 2; grp.add(c) }
    scene.add(grp)
    return { kind, feet, group: grp, alive: true }
  })
  /** a cover breaks for good: group gone, low rubble left, chunks fly */
  const destroy = (i: number, fx: FX) => {
    const c = covers[i]; if (!c.alive) return; c.alive = false; c.group.visible = false
    const r = new THREE.Group(); r.position.copy(c.group.position); r.rotation.copy(c.group.rotation); scene.add(r)
    for (let k = 0; k < 4; k++) box(0.5 + rnd(i * 7 + k) * 0.5, 0.3, 0.6, PAL.paper2, r, (k - 1.5) * 0.55, 0.15, rnd(k + i) * 0.4)
    for (let k = 0; k < 7; k++) {
      const m = box(0.25, 0.2, 0.25, k % 2 ? PAL.paper2 : PAL.stone, scene, c.group.position.x, 1 + k * 0.2, c.group.position.z, false)
      fx.addDebris(m, new THREE.Vector3((Math.random() - 0.5) * 8, 3 + Math.random() * 4, 2 + Math.random() * 4), new THREE.Vector3(Math.random() * 9, Math.random() * 9, Math.random() * 9))
    }
  }
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8e8c86, 1.5))
  const key = new THREE.DirectionalLight(0xffffff, 1.3); key.position.set(-4, 10, 6); scene.add(key)
  scene.background = new THREE.Color(PAL.paper); scene.fog = new THREE.Fog(PAL.paper, 30, 95)
  const tower = new THREE.Vector3(4, 40, -78)
  /** the tower breathes white: called each frame with real time */
  const pulse = (t: number) => { const k = 0.5 + 0.5 * Math.sin(t * 0.9); towerMat.color.setScalar(0.88 + 0.12 * k) }
  return { covers, destroy, tower, pulse }
}
