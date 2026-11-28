// Reusable procedural rooms for the rail levels (levels.md): office, stairwell, alley. White low-poly + grit + ink edges. No glow.
import * as THREE from 'three'
import { PAL } from '../render/palette'
import { gritTex } from './corridor'
import type { RoomId } from './ch1/types'
import { addVehicleRoom } from './rooms2'

export interface Room { doors: THREE.Vector3[]; halfW: number; height: number; zEnd: number; objects: Record<string, THREE.Vector3>; statics: THREE.Mesh[]; tick(t: number): void }
interface Theme { halfW: number; height: number; length: number; wall: number; floor: number; fog: [number, number]; doors: [number, number][] }
const THEMES: Partial<Record<RoomId, Theme>> = {
  office: { halfW: 3.2, height: 3, length: 40, wall: 232, floor: 196, fog: [12, 32], doors: [[-1, -8], [1, -12], [-1, -17], [1, -22], [-1, -27], [1, -31]] },
  stairwell: { halfW: 1.9, height: 3.4, length: 44, wall: 214, floor: 170, fog: [9, 24], doors: [[-1, -6], [1, -10], [-1, -16], [1, -22], [-1, -28], [1, -34]] },
  road: { halfW: 4.6, height: 9, length: 46, wall: 222, floor: 150, fog: [12, 34], doors: [[-1, -8], [1, -13], [-1, -19], [1, -25], [-1, -31], [1, -37]] },
  carpark: { halfW: 5, height: 3.4, length: 46, wall: 210, floor: 160, fog: [11, 30], doors: [[-1, -8], [1, -13], [-1, -19], [1, -25], [-1, -31], [1, -37]] },
  alley: { halfW: 2.6, height: 6, length: 44, wall: 204, floor: 164, fog: [10, 30], doors: [[-1, -7], [1, -12], [-1, -18], [1, -23], [-1, -29], [1, -35]] },
}
const staticTex = (seed: number) => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 24; const g = cv.getContext('2d')!
  const draw = (s: number) => { let r = s; for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) { r = (r * 16807) % 2147483647; const v = (r % 256) > 128 ? 238 : 40; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 1, 1) } }
  draw(seed)
  const t = new THREE.CanvasTexture(cv); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace
  return { t, redraw: (s: number) => { draw(s); t.needsUpdate = true } }
}
/** small canvas drawing helper: paper sheet 32×40 with `draw` in ink/orange */
export function paperTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d')!
  g.fillStyle = '#ECEBE6'; g.fillRect(0, 0, w, h); g.fillStyle = '#16161A'; g.strokeStyle = '#16161A'; draw(g)
  const t = new THREE.CanvasTexture(cv); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace
  return t
}
export const veArrowTex = () => paperTex(40, 28, (g) => { // VE mark: orange arrow signed VE
  g.fillStyle = '#E8590C'; g.fillRect(4, 11, 24, 3); g.fillRect(24, 7, 3, 11); g.fillRect(27, 9, 3, 7); g.fillRect(30, 11, 3, 3)
  g.fillStyle = '#16161A'; g.font = "700 7px 'Be Vietnam Pro', system-ui, sans-serif"; g.fillText('VE', 27, 24)
})
const frozenTex = () => paperTex(24, 24, (g) => { // L4: the same alley from a high angle, frozen; a small figure at the bottom, orange
  g.fillStyle = '#C9C8C2'; g.fillRect(0, 0, 24, 24); g.fillStyle = '#ECEBE6'; g.beginPath(); g.moveTo(8, 2); g.lineTo(16, 2); g.lineTo(21, 23); g.lineTo(3, 23); g.fill()
  g.fillStyle = '#E8590C'; g.fillRect(11, 17, 3, 5); g.fillStyle = '#16161A'; g.fillRect(11, 15, 3, 2); g.strokeRect(0.5, 0.5, 23, 23)
})
const sketchbookTex = () => paperTex(36, 36, (g) => { // 3×3 grid, orange middle, VE
  g.strokeRect(6.5, 4.5, 24, 24); g.beginPath(); for (const k of [14.5, 22.5]) { g.moveTo(k, 4.5); g.lineTo(k, 28.5); g.moveTo(6.5, k - 2); g.lineTo(30.5, k - 2) } g.stroke()
  g.fillStyle = '#E8590C'; g.fillRect(15, 13, 7, 7); g.fillStyle = '#16161A'; g.fillRect(8, 31, 20, 1); g.fillRect(8, 33, 12, 1)
})
const stickerTex = () => paperTex(16, 16, (g) => { g.fillStyle = '#E8590C'; g.fillRect(3, 3, 10, 10); g.fillStyle = '#16161A'; g.fillRect(6, 6, 2, 2); g.fillRect(9, 6, 2, 2); g.fillRect(6, 10, 5, 1) })

export function buildRoom(scene: THREE.Scene, id: RoomId): Room {
  const T = THEMES[id]!, { halfW, height, length } = T, zEnd = -length + 4, midZ = (4 + zEnd) / 2, len = 4 - zEnd
  const wallMat = new THREE.MeshLambertMaterial({ map: gritTex(64, T.wall, 14, 11, 12) }); wallMat.map!.repeat.set(len / 2.2, height / 2.2)
  const floorMat = new THREE.MeshLambertMaterial({ map: gritTex(32, T.floor, 24, 17) }); floorMat.map!.repeat.set(halfW * 2 / 0.7, len / 0.7)
  const ceilMat = new THREE.MeshLambertMaterial({ map: gritTex(32, 214, 10, 5) })
  const edgeMat = new THREE.LineBasicMaterial({ color: PAL.ink, transparent: true, opacity: 0.5 })
  const plane = (w: number, h: number, mat: THREE.Material, x: number, y: number, z: number, ry = 0, rx = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); scene.add(m); return m }
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: number | THREE.Material, edges = true) => {
    const g = new THREE.BoxGeometry(w, h, d), mat = typeof color === 'number' ? new THREE.MeshLambertMaterial({ color, flatShading: true }) : color
    const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); scene.add(m)
    if (edges) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat); e.position.copy(m.position); scene.add(e) }
    return m
  }
  const draw = (tex: THREE.Texture, w: number, h: number, side: number, y: number, z: number) => plane(w, h, new THREE.MeshBasicMaterial({ map: tex }), side * (halfW - 0.015), y, z, -side * Math.PI / 2)
  plane(halfW * 2, len, floorMat, 0, 0, midZ, 0, -Math.PI / 2)
  if (id !== 'alley' && id !== 'road') plane(halfW * 2, len, ceilMat, 0, height, midZ, 0, Math.PI / 2)
  plane(len, height, wallMat, -halfW, height / 2, midZ, Math.PI / 2); plane(len, height, wallMat, halfW, height / 2, midZ, -Math.PI / 2)
  plane(halfW * 2, height, wallMat, 0, height / 2, zEnd)
  const doors: THREE.Vector3[] = [], objects: Record<string, THREE.Vector3> = {}, statics: THREE.Mesh[] = []
  const paper2 = new THREE.MeshLambertMaterial({ color: PAL.paper2 }), stone = PAL.stone
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  if (id === 'office' || id === 'stairwell') for (let z = 0; z > zEnd + 2; z -= id === 'office' ? 5 : 4) box(0.9, 0.02, 0.5, 0, height - 0.01, z, lightMat)
  // dark door recesses = where enemies come out
  for (const [side, z] of T.doors) { box(0.04, 2.1, 1.0, side * (halfW - 0.02), 1.05, z, 0x2a2a2e); doors.push(new THREE.Vector3(side * (halfW - 0.3), 0, z)) }

  if (id === 'office') {
    // desks in two rows, glass partitions (thin pale boxes that break into Thuỷ tinh later)
    const glass = new THREE.MeshLambertMaterial({ color: 0xdfe6e8, transparent: true, opacity: 0.45 })
    for (let z = -5; z > -36; z -= 4.5) for (const side of [-1, 1]) {
      box(0.9, 0.75, 1.5, side * (halfW - 0.8), 0.375, z, paper2); box(0.5, 0.35, 0.05, side * (halfW - 0.8), 0.95, z - 0.2, PAL.ink)
      box(0.04, 1.4, 2.4, side * (halfW - 1.7), 0.7, z + 0.2, glass, false)
    }
    // VE's desk: a stack of six identical blank wristbands (XEL — 01…06); the taped sketchbook page on the monitor
    for (let k = 0; k < 6; k++) box(0.34, 0.025, 0.1, -halfW + 0.7, 0.8 + k * 0.03, -20.4, 0xfafaf7)
    box(1.1, 0.78, 1.6, -halfW + 0.7, 0.39, -21, paper2); box(0.6, 0.4, 0.06, -halfW + 0.7, 1.0, -21.4, PAL.ink)
    draw(sketchbookTex(), 0.28, 0.28, -1, 1.05, -21.35); objects.page = new THREE.Vector3(-halfW + 0.7, 1.05, -21)
    draw(veArrowTex(), 0.5, 0.35, 1, 1.7, -18)                // VE mark
  } else if (id === 'stairwell') {
    // flights of steps along one wall, handrail, pipes (Chì), window frames (Nhôm), floor numbers painted per landing
    for (let k = 0; k < 28; k++) box(1.0, 0.18 * (1 + (k % 6)), 0.5, -halfW + 0.5, 0.09 * (1 + (k % 6)), -1 - k * 1.3, 0xe2e1db)
    box(0.04, 0.04, len, halfW - 0.3, 1.0, midZ, stone, false)
    for (const z of [-9, -19, -26]) { box(0.14, height, 0.14, halfW - 0.2, height / 2, z, 0x8e8c86); objects[`pipe${-z}`] = new THREE.Vector3(halfW - 0.2, 1.2, z) }
    for (const z of [-13, -30]) { box(0.04, 1.2, 0.9, -halfW + 0.02, 1.9, z, 0xb8b7b1); objects[`frame${-z}`] = new THREE.Vector3(-halfW + 0.2, 1.9, z) }
    draw(veArrowTex(), 0.5, 0.35, -1, 1.3, -4); draw(veArrowTex(), 0.5, 0.35, -1, 1.3, -26)  // VE arrows down
    objects.landing7 = new THREE.Vector3(0, 1.0, -22)
    for (let n = 0; n < 5; n++) box(0.5, 0.8, 0.02, 0, height / 2, zEnd + 0.02, 0xdcdbd5, false)
  } else if (id === 'alley') {
    // shopfronts: TV repair (static screens + one frozen frame), welding shop, shutter with VE's sticker
    const walls = [-1, 1]
    for (const side of walls) for (let z = -3; z > zEnd + 1; z -= 6) box(0.5, height, 5.4, side * (halfW + 0.25), height / 2, z - 2, side < 0 ? 0xd6d5cf : 0xcfcec8)
    const tv = staticTex(7), tv2 = staticTex(19)
    statics.push(...[[-9.5, 1.2, tv.t], [-9.5, 0.6, tv2.t], [-8, 1.0, tv.t], [-11, 0.9, tv2.t]].map(([z, y, tex]) => draw(tex as THREE.Texture, 0.5, 0.4, -1, y as number, z as number)))
    draw(frozenTex(), 0.5, 0.4, -1, 1.65, -9.5)   // setup: someone watched this alley from above
    ;(statics as any).tex = [tv, tv2]
    box(0.12, 1.4, 3.6, -halfW + 0.07, 0.7, -9.8, 0x2a2a2e, false); objects.tv = new THREE.Vector3(-halfW + 0.2, 1, -9.5)
    box(0.5, 0.5, 0.5, halfW - 0.5, 0.25, -23, 0x8e8c86); objects.weld = new THREE.Vector3(halfW - 0.5, 0.7, -23)
    box(0.1, 2.2, 2.4, halfW - 0.06, 1.1, -15, 0xb8b7b1); draw(stickerTex(), 0.22, 0.22, 1, 1.0, -15)
    for (const z of [-6, -20, -33]) box(0.1, 0.5, 1.2, -halfW + 0.05, 3.0, z, 0x2a2a2e)
    draw(veArrowTex(), 0.5, 0.35, 1, 2.2, -27)    // VE mark
  }
  else if (id === 'road' || id === 'carpark') addVehicleRoom(id, { scene, box, draw, objects, halfW, height, zEnd, doors })
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8e8c86, 1.6), key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(0.6, 3, 1)
  scene.add(hemi, key); scene.background = new THREE.Color(PAL.paper); scene.fog = new THREE.Fog(PAL.paper, ...T.fog)
  let flick = 0
  const tex = (statics as any).tex as ReturnType<typeof staticTex>[] | undefined
  return { doors, halfW, height, zEnd, objects, statics, tick(t) { if (tex && t - flick > 0.12) { flick = t; tex.forEach((s, i) => s.redraw(Math.floor(t * 8) * 7 + i)) } } }
}
