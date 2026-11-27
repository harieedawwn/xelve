// Corridor on floor 14: white, gritty, ink edges. Procedural textures only.
import * as THREE from 'three'
import { PAL } from './palette'

export const HALF_W = 1.5, HEIGHT = 3, Z_START = 3, Z_END = -36

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = false) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  const g = cv.getContext('2d')!; draw(g)
  const t = new THREE.CanvasTexture(cv)
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false
  t.colorSpace = THREE.SRGBColorSpace
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping }
  return t
}

function rnd(seed: number) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647 }

/** greyscale grit: base tone + speckle + a few stains/streaks (Ultrakill-ish low-res grime) */
export function gritTex(size: number, base: number, vari: number, seed: number, streaks = 0) {
  return canvasTex(size, size, (g) => {
    const r = rnd(seed)
    const img = g.createImageData(size, size)
    for (let i = 0; i < size * size; i++) {
      const v = base + (r() - 0.5) * vari + (r() < 0.04 ? -vari * 1.4 : 0)
      img.data[i * 4] = v; img.data[i * 4 + 1] = v - 1; img.data[i * 4 + 2] = v - 4; img.data[i * 4 + 3] = 255
    }
    g.putImageData(img, 0, 0)
    g.globalAlpha = 0.08
    for (let i = 0; i < streaks; i++) {
      g.fillStyle = '#000'; const x = Math.floor(r() * size)
      g.fillRect(x, Math.floor(r() * size * 0.3), 1 + Math.floor(r() * 2), Math.floor(size * (0.3 + r() * 0.7)))
    }
  }, true)
}

function doodleTex() {
  // Ve's 3-frame marker doodle: a stick figure swiping an orange blade. Teaches the swipe.
  return canvasTex(96, 32, (g) => {
    g.fillStyle = '#ECEBE6'; g.fillRect(0, 0, 96, 32)
    const px = (x: number, y: number, c: string) => { g.fillStyle = c; g.fillRect(x, y, 1, 1) }
    const line = (x0: number, y0: number, x1: number, y1: number, c: string) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
      for (let i = 0; i <= n; i++) px(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c)
    }
    for (let f = 0; f < 3; f++) {
      const ox = f * 32
      g.strokeStyle = '#16161A'; g.lineWidth = 1; g.strokeRect(ox + 1.5, 1.5, 29, 29)
      const ink = '#16161A', ve = '#E8590C'
      // figure
      line(ox + 12, 9, ox + 12, 19, ink); line(ox + 12, 19, ox + 9, 27, ink); line(ox + 12, 19, ox + 15, 27, ink)
      g.fillStyle = ink; g.fillRect(ox + 10, 5, 4, 4)
      const arm = [[18, 6], [22, 13], [18, 22]][f]
      line(ox + 12, 12, ox + arm[0] - 2, arm[1] + 1, ink)
      const tip = [[25, 2], [29, 13], [25, 27]][f]
      line(ox + arm[0] - 2, arm[1] + 1, ox + tip[0], tip[1], ve); line(ox + arm[0] - 1, arm[1] + 1, ox + tip[0] + 1, tip[1], ve)
      if (f === 2) { line(ox + 24, 4, ox + 28, 14, ink); line(ox + 26, 4, ox + 29, 10, ink) } // speed marks
    }
  })
}

function clockTex() {
  return canvasTex(32, 32, (g) => {
    g.fillStyle = '#ECEBE6'; g.beginPath(); g.arc(16, 16, 14, 0, 7); g.fill()
    g.strokeStyle = '#16161A'; g.lineWidth = 2; g.stroke()
    const hand = (ang: number, len: number, w: number) => {
      g.lineWidth = w; g.beginPath(); g.moveTo(16, 16)
      g.lineTo(16 + Math.sin(ang) * len, 16 - Math.cos(ang) * len); g.stroke()
    }
    hand((5 + 47 / 60) / 12 * Math.PI * 2, 7, 2) // 05:47
    hand(47 / 60 * Math.PI * 2, 11, 1)
  })
}

export function buildCorridor(scene: THREE.Scene) {
  const len = Z_START - Z_END, midZ = (Z_START + Z_END) / 2
  const wallMat = new THREE.MeshLambertMaterial({ map: gritTex(64, 228, 14, 3, 10) })
  wallMat.map!.repeat.set(len / 2.2, HEIGHT / 2.2)
  const floorMat = new THREE.MeshLambertMaterial({ map: gritTex(32, 190, 22, 9) })
  floorMat.map!.repeat.set(HALF_W * 2 / 0.6, len / 0.6)
  const ceilMat = new THREE.MeshLambertMaterial({ map: gritTex(32, 214, 10, 5) })
  ceilMat.map!.repeat.set(3, len / 1.2)
  const edgeMat = new THREE.LineBasicMaterial({ color: PAL.ink, transparent: true, opacity: 0.5 })

  const plane = (w: number, h: number, mat: THREE.Material, pos: THREE.Vector3, rot: THREE.Euler) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.copy(pos); m.rotation.copy(rot); scene.add(m); return m
  }
  plane(HALF_W * 2, len, floorMat, new THREE.Vector3(0, 0, midZ), new THREE.Euler(-Math.PI / 2, 0, 0))
  plane(HALF_W * 2, len, ceilMat, new THREE.Vector3(0, HEIGHT, midZ), new THREE.Euler(Math.PI / 2, 0, 0))
  plane(len, HEIGHT, wallMat, new THREE.Vector3(-HALF_W, HEIGHT / 2, midZ), new THREE.Euler(0, Math.PI / 2, 0))
  plane(len, HEIGHT, wallMat, new THREE.Vector3(HALF_W, HEIGHT / 2, midZ), new THREE.Euler(0, -Math.PI / 2, 0))
  plane(HALF_W * 2, HEIGHT, wallMat, new THREE.Vector3(0, HEIGHT / 2, Z_END), new THREE.Euler())

  const box = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, edges = true) => {
    const g = new THREE.BoxGeometry(w, h, d); const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); scene.add(m)
    if (edges) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat); e.position.copy(m.position); scene.add(e) }
    return m
  }
  // skirting + corner lines
  const trim = new THREE.MeshLambertMaterial({ color: PAL.stone })
  box(0.02, 0.1, len, -HALF_W + 0.01, 0.05, midZ, trim, false)
  box(0.02, 0.1, len, HALF_W - 0.01, 0.05, midZ, trim, false)
  // ceiling light panels: hard unlit shapes, no glow
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  for (let z = 0; z > Z_END + 2; z -= 4) box(0.9, 0.02, 0.5, 0, HEIGHT - 0.01, z, lightMat)
  // doors (dark recesses) — enemies come out of these
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2e })
  const frameMat = new THREE.MeshLambertMaterial({ color: PAL.paper2 })
  const doors: THREE.Vector3[] = []
  for (const [side, z] of [[-1, -9], [1, -11.5], [-1, -21], [1, -23], [1, -6], [-1, -15]] as const) {
    box(0.04, 2.1, 1.0, side * (HALF_W - 0.02), 1.05, z, doorMat)
    box(0.06, 2.2, 0.08, side * (HALF_W - 0.03), 1.1, z - 0.54, frameMat)
    box(0.06, 2.2, 0.08, side * (HALF_W - 0.03), 1.1, z + 0.54, frameMat)
    doors.push(new THREE.Vector3(side * (HALF_W - 0.3), 0, z))
  }
  // props: pillars, bins, a bench
  for (const z of [-4, -13, -18, -27]) { box(0.3, HEIGHT, 0.3, -HALF_W + 0.15, HEIGHT / 2, z, frameMat); box(0.3, HEIGHT, 0.3, HALF_W - 0.15, HEIGHT / 2, z, frameMat) }
  box(0.5, 0.45, 0.4, HALF_W - 0.4, 0.225, -16.5, new THREE.MeshLambertMaterial({ color: PAL.paper2 }))
  box(0.3, 0.5, 0.3, -HALF_W + 0.3, 0.25, -7.2, new THREE.MeshLambertMaterial({ color: PAL.stone }))
  // lift doors at the end
  box(1.1, 2.2, 0.05, 0, 1.1, Z_END + 0.03, new THREE.MeshLambertMaterial({ color: 0xb8b7b1 }))
  // Ve's doodle + stopped clock
  plane(0.96, 0.32, new THREE.MeshBasicMaterial({ map: doodleTex() }), new THREE.Vector3(-HALF_W + 0.01, 1.55, -4.6), new THREE.Euler(0, Math.PI / 2, 0))
  plane(0.32, 0.32, new THREE.MeshBasicMaterial({ map: clockTex(), transparent: true }), new THREE.Vector3(HALF_W - 0.01, 2.35, -1.6), new THREE.Euler(0, -Math.PI / 2, 0))

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8e8c86, 1.6))
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(0.6, 3, 1); scene.add(key)
  scene.background = new THREE.Color(PAL.paper)
  scene.fog = new THREE.Fog(PAL.paper, 14, 34)
  return { doors, doodle: new THREE.Vector3(-HALF_W, 1.55, -4.6) }
}

/** ray vs corridor box: returns surface point + normal (for blood decals) */
export function surfaceHit(o: THREE.Vector3, d: THREE.Vector3, out: { p: THREE.Vector3; n: THREE.Vector3 }) {
  let best = Infinity
  const test = (t: number, nx: number, ny: number, nz: number) => {
    if (t > 0.001 && t < best) { best = t; out.n.set(nx, ny, nz) }
  }
  if (d.y < 0) test(-o.y / d.y, 0, 1, 0)
  if (d.y > 0) test((HEIGHT - o.y) / d.y, 0, -1, 0)
  if (d.x < 0) test((-HALF_W - o.x) / d.x, 1, 0, 0)
  if (d.x > 0) test((HALF_W - o.x) / d.x, -1, 0, 0)
  if (!isFinite(best) || best > 6) return false
  out.p.copy(o).addScaledVector(d, best)
  return true
}
