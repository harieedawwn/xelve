// P21 app-icon concepts: real 3D (three.js) composited over hard 2D shapes. Dev-only page, driven by render.mjs.
// Each concept renders two layers at 1024 px: bg (paper/ink shapes) and fg (3D subject + blood pixels),
// so the chosen one maps straight onto Android adaptive icon layers. full = bg + fg.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { weaponMesh } from '../../src/weapon/mesh'
import type { Voxel } from '../../src/weapon/model'

const S = 1024
const C = { paper: '#ECEBE6', paper2: '#CFCDC6', ink: '#16161A', ve: '#E8590C', tim: '#4A0E6B', timLo: '#300848' }
type Ctx = CanvasRenderingContext2D
const can = (): [HTMLCanvasElement, Ctx] => { const c = document.createElement('canvas'); c.width = c.height = S; return [c, c.getContext('2d')!] }
const poly = (g: Ctx, col: string, pts: number[][]) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * S, y * S) : g.moveTo(x * S, y * S))); g.closePath(); g.fill() }
function rng(seed: number) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296) }

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
renderer.setSize(S, S, false); renderer.setClearColor(0x000000, 0); renderer.localClippingEnabled = true
renderer.outputColorSpace = THREE.SRGBColorSpace

function shoot(scene: THREE.Scene, cam: THREE.Camera): HTMLCanvasElement {
  renderer.render(scene, cam)
  const [c, g] = can(); g.drawImage(renderer.domElement, 0, 0); return c
}
function lights(scene: THREE.Scene, key: THREE.Vector3, amb = 0.55, k = 2.4) {
  scene.add(new THREE.AmbientLight(0xffffff, amb))
  const d = new THREE.DirectionalLight(0xffffff, k); d.position.copy(key); scene.add(d)
}
/** square blood pixels flung along a direction from a point; sizes shrink with distance (fractions of S) */
function blood(g: Ctx, seed: number, x: number, y: number, dx: number, dy: number, n: number, spread = 0.5, big = 0.05) {
  const r = rng(seed)
  for (let i = 0; i < n; i++) {
    const t = 0.04 + r() * 0.3, a = Math.atan2(dy, dx) + (r() - 0.5) * spread, sz = big * (1 - t * 2) * (0.55 + r() * 0.5)
    const px = x + Math.cos(a) * t, py = y + Math.sin(a) * t
    g.fillStyle = r() < 0.3 ? C.timLo : C.tim
    g.fillRect(Math.round(px * S - (sz * S) / 2), Math.round(py * S - (sz * S) / 2), Math.round(sz * S), Math.round(sz * S))
  }
}

// ---- 1 · Vũ khí: voxel cleaver (Voxel thô handle + Chì blade), hero 3/4, low camera, ink slab across paper
function cleaverVoxels(): { v: Voxel[]; grip: [number, number] } {
  const v: Voxel[] = []
  const add = (x: number, y: number, mat: string, depth: number) => v.push({ x, y, mat, depth, part: 'p' })
  for (let y = 0; y < 6; y++) for (let x = 3; x < 11; x++) if (!(x === 9 && y === 1)) add(x, y, 'chi', y === 5 ? 0.6 : 1)
  for (let x = -3; x < 3; x++) for (let y = 1; y < 3; y++) add(x, y, 'tho', 1.6)
  add(2, 0, 'chi', 1.4); add(2, 3, 'chi', 1.4) // bolster
  return { v, grip: [-1, 2] }
}
function concept1() {
  const [bg, b] = can()
  b.fillStyle = C.paper; b.fillRect(0, 0, S, S)
  poly(b, C.ink, [[0, 0.70], [1, 0.36], [1, 0.62], [0, 0.96]])
  poly(b, C.paper2, [[0, 0.66], [1, 0.32], [1, 0.335], [0, 0.675]]) // ruled hairline above the slab
  const scene = new THREE.Scene(); lights(scene, new THREE.Vector3(-3, 5, 6), 0.7, 2.2)
  const { v, grip } = cleaverVoxels(), w = weaponMesh(v, grip, 1, 0x16161a)
  w.position.set(-3.8, -2.4, 0); const piv = new THREE.Group(); piv.add(w); scene.add(piv)
  piv.rotation.set(0.3, -0.55, 0.62); piv.updateMatrixWorld(true)
  const ctr = new THREE.Box3().setFromObject(piv).getCenter(new THREE.Vector3()); piv.position.sub(ctr).add(new THREE.Vector3(0, 0.3, 0))
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100); cam.position.set(0, -3, 39); cam.lookAt(0, 0.2, 0)
  const [fg, f] = can(); f.drawImage(shoot(scene, cam), 0, 0)
  blood(f, 7, 0.60, 0.60, 0.8, 0.7, 16, 0.8, 0.045)
  return { bg, fg }
}

// ---- 2 · Voxel cam: one big bevelled orange voxel on the seam of an ink/paper split, ink shadow below
function concept2() {
  const [bg, b] = can()
  b.fillStyle = C.paper; b.fillRect(0, 0, S, S)
  poly(b, C.ink, [[0, 0], [1, 0], [1, 0.30], [0, 0.78]])
  poly(b, C.paper2, [[0, 0.80], [1, 0.32], [1, 0.335], [0, 0.815]]) // the slash: a paper-2 cut line just under the seam
  const scene = new THREE.Scene(); lights(scene, new THREE.Vector3(-5, 5.5, 2), 0.8, 2.3)
  const geo = new RoundedBoxGeometry(1, 1, 1, 1, 0.09)
  const box = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0xe8590c, flatShading: true }))
  const hull = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x16161a, side: THREE.BackSide })); hull.scale.setScalar(1.075)
  const cube = new THREE.Group(); cube.add(hull, box); cube.rotation.set(0.6, Math.PI / 4, 0); cube.position.y = 0.14; scene.add(cube)
  const cam = new THREE.OrthographicCamera(-1.7, 1.7, 1.7, -1.7, 0.1, 50); cam.position.set(0, 0, 10)
  const [fg, f] = can()
  poly(f, C.ink, [[0.33, 0.73], [0.55, 0.685], [0.70, 0.73], [0.48, 0.775]]) // hard ink shadow shape
  f.drawImage(shoot(scene, cam), 0, 0)
  return { bg, fg }
}

// ---- 3 · Bóng: charcoal low-poly head + shoulders, cut on a diagonal, purple inside, blood pixels, small voxel
const lathe = (pts: number[][], seg: number) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg)
function bongBody(clip: THREE.Plane[]): THREE.Group {
  const out = new THREE.MeshLambertMaterial({ color: 0x2c2c33, flatShading: true, clippingPlanes: clip })
  const ins = new THREE.MeshBasicMaterial({ color: 0x4a0e6b, side: THREE.BackSide, clippingPlanes: clip })
  const g = new THREE.Group()
  const part = (geo: THREE.BufferGeometry, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => {
    for (const m of [out, ins]) { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); k.scale.set(sx, sy, sz); g.add(k) }
  }
  // human bust from lathe profiles (radius, height), few segments = low-poly facets
  part(lathe([[0, 0.92], [0.2, 0.96], [0.36, 1.07], [0.46, 1.29], [0.5, 1.55], [0.45, 1.8], [0.3, 1.97], [0, 2.02]], 8), 0, 0, 0.05, 0.9, 1, 1.05) // head + jaw
  part(lathe([[0.22, 0.5], [0.19, 0.8], [0.17, 1.02]], 6), 0, 0, -0.02) // neck
  part(lathe([[0, -1.5], [0.7, -1.5], [0.82, -0.6], [0.98, 0.02], [0.96, 0.24], [0.74, 0.42], [0.42, 0.55], [0.22, 0.62], [0, 0.63]], 9), 0, 0, 0, 1, 1, 0.52) // shoulders, chest
  part(new THREE.IcosahedronGeometry(0.28, 0), -0.88, 0.08, 0, 0.9, 1.15, 0.95); part(new THREE.IcosahedronGeometry(0.28, 0), 0.88, 0.08, 0, 0.9, 1.15, 0.95) // deltoids
  return g
}
function concept3() {
  const [bg, b] = can()
  b.fillStyle = C.paper; b.fillRect(0, 0, S, S)
  poly(b, C.paper2, [[0, 0.9], [1, 0.78], [1, 1], [0, 1]])
  const scene = new THREE.Scene(); lights(scene, new THREE.Vector3(-4, 5, 5), 0.8, 1.8)
  const n = new THREE.Vector3(-0.42, 1, 0).normalize(), p0 = new THREE.Vector3(0, 1.42, 0), c = n.dot(p0) // cut rises to the right, through the head
  const upper = bongBody([new THREE.Plane(n.clone().negate(), c)]), lower = bongBody([new THREE.Plane(n.clone(), -c)])
  const along = new THREE.Vector3(1, 0.42, 0).normalize()
  upper.position.copy(along).multiplyScalar(0.22).add(n.clone().multiplyScalar(0.1)); upper.rotation.z = 0.06
  const fig = new THREE.Group(); fig.add(upper, lower); fig.rotation.y = -0.4; fig.position.set(-0.08, 0, 0); scene.add(fig)
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100); cam.position.set(0, 2.6, 5.0); cam.lookAt(0, 1.3, 0); cam.updateMatrixWorld()
  // the paper slash follows the projected cut line
  scene.updateMatrixWorld(true)
  const proj = (v: THREE.Vector3) => { const q = lower.localToWorld(v.clone()).project(cam); return [(q.x + 1) / 2, (1 - q.y) / 2] }
  const [ax, ay] = proj(p0.clone().addScaledVector(along, -1)), [bx, by] = proj(p0.clone().addScaledVector(along, 1))
  const L = (t: number) => [ax + (bx - ax) * t, ay + (by - ay) * t], A = L(-0.9), B = L(1.9), w = 0.007
  const [fg, f] = can(); f.drawImage(shoot(scene, cam), 0, 0)
  poly(f, C.paper, [[A[0], A[1] - w], [B[0], B[1] - w], [B[0], B[1] + w], [A[0], A[1] + w]]) // the slash line
  const e1 = L(0.85), e0 = L(0.15)
  blood(f, 11, e1[0], e1[1], 1, -0.35, 14, 0.9, 0.05); blood(f, 5, e0[0], e0[1], -1, 0.25, 8, 0.6, 0.04)
  // small orange voxel, top-left corner inside the safe zone (3 flat faces, ink edges)
  const x = 0.25, y = 0.43, r = 0.045
  const top = [[x, y - r], [x + r * 0.87, y - r / 2], [x, y], [x - r * 0.87, y - r / 2]]
  const lf = [[x - r * 0.87, y - r / 2], [x, y], [x, y + r], [x - r * 0.87, y + r / 2]]
  const rt = [[x, y], [x + r * 0.87, y - r / 2], [x + r * 0.87, y + r / 2], [x, y + r]]
  const o = 0.012
  poly(f, C.ink, [[x, y - r - o], [x + r * 0.87 + o, y - r / 2 - o / 2], [x + r * 0.87 + o, y + r / 2 + o / 2], [x, y + r + o], [x - r * 0.87 - o, y + r / 2 + o / 2], [x - r * 0.87 - o, y - r / 2 - o / 2]])
  poly(f, '#F07A33', top); poly(f, C.ve, lf); poly(f, '#B8430A', rt)
  return { bg, fg }
}

const CONCEPTS = [concept1, concept2, concept3]
function render(i: number) {
  const { bg, fg } = CONCEPTS[i - 1]()
  const [full, g] = can(); g.drawImage(bg, 0, 0); g.drawImage(fg, 0, 0)
  return { full: full.toDataURL('image/png'), bg: bg.toDataURL('image/png'), fg: fg.toDataURL('image/png') }
}
;(window as unknown as { __icon: typeof render }).__icon = render
document.title = 'ready'
