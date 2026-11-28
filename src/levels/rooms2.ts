// Rail rooms with cars: road (L6 Đường cái) and car park (L7 Bãi đỗ xe). Called from buildRoom; same white low-poly + ink edges.
import * as THREE from 'three'
import { PAL } from '../render/palette'
import { makeCar } from './car'
import { paperTex, veArrowTex } from './rooms'

type Box = (w: number, h: number, d: number, x: number, y: number, z: number, color: number | THREE.Material, edges?: boolean) => THREE.Mesh
interface Ctx { scene: THREE.Scene; box: Box; draw: (tex: THREE.Texture, w: number, h: number, side: number, y: number, z: number) => THREE.Mesh; objects: Record<string, THREE.Vector3>; halfW: number; height: number; zEnd: number; doors: THREE.Vector3[] }

const hoardTex = () => paperTex(40, 28, (g) => { // a pinned page: a hammer, orange head
  g.fillStyle = '#E8590C'; g.fillRect(8, 5, 18, 9); g.fillStyle = '#16161A'; g.fillRect(16, 14, 3, 11); g.strokeRect(7.5, 4.5, 19, 10)
})
const billTex = () => paperTex(48, 24, (g) => { // every billboard: the same stopped countdown
  g.fillStyle = '#16161A'; g.font = "900 14px 'Be Vietnam Pro', system-ui, sans-serif"; g.textAlign = 'center'; g.fillText('05:47', 24, 18)
})
const towerTex = () => paperTex(24, 36, (g) => { g.fillStyle = '#C9C8C2'; g.fillRect(9, 8, 6, 28); g.fillRect(11, 1, 2, 8); g.fillStyle = '#E8590C'; g.fillRect(11, 0, 2, 2) })
const page8Tex = () => paperTex(36, 36, (g) => { // 8×8 grid, orange cell in the corner
  g.strokeRect(5.5, 3.5, 24, 24); g.beginPath(); for (let k = 1; k < 8; k++) { g.moveTo(5.5 + k * 3, 3.5); g.lineTo(5.5 + k * 3, 27.5); g.moveTo(5.5, 3.5 + k * 3); g.lineTo(29.5, 3.5 + k * 3) } g.stroke()
  g.fillStyle = '#E8590C'; g.fillRect(6, 4, 3, 3)
})

export function addVehicleRoom(id: 'road' | 'carpark', c: Ctx) {
  const { box, draw, objects, halfW, zEnd } = c
  const add = (kind: 'car' | 'van' | 'old', x: number, z: number, ry: number) => { const g = makeCar(kind); g.position.set(x, 0, z); g.rotation.y = ry; c.scene.add(g); return g }
  if (id === 'road') {
    // parked cars along both kerbs, a crashed van across the road, street signs, a construction hoarding with a hammer page, tyres, a bus stop with the 8×8 page
    for (let z = -4; z > zEnd + 2; z -= 7.5) { add('car', -halfW + 1.3, z, Math.PI / 2); if (z < -10) add(z % 2 ? 'van' : 'car', halfW - 1.3, z - 3, Math.PI / 2) }
    add('van', 1.2, -27, 0.5)
    for (const z of [-8, -21, -35]) draw(billTex(), 2.4, 1.2, -1, 5.5, z)  // billboards: the same countdown, stopped
    draw(veArrowTex(), 0.5, 0.35, 1, 1.6, -12)
    for (const z of [-6, -16, -34]) { box(0.08, 3, 0.08, halfW - 0.3, 1.5, z, PAL.stone, false); box(0.7, 0.45, 0.04, halfW - 0.3, 2.9, z, 0xdcdbd5) }
    box(0.1, 2.4, 6, -halfW + 0.06, 1.2, -22, 0xb8b7b1); draw(hoardTex(), 0.5, 0.35, -1, 1.5, -21); objects.hoard = new THREE.Vector3(-halfW + 0.2, 1.5, -21)
    for (let k = 0; k < 4; k++) box(0.6, 0.18, 0.6, halfW - 0.9, 0.09 + k * 0.18, -29 - (k % 2) * 0.1, 0x16161a); objects.tyre = new THREE.Vector3(halfW - 0.9, 0.8, -29)
    box(1.8, 0.1, 0.9, -halfW + 0.9, 2.2, -40, PAL.stone); box(0.08, 2.2, 0.08, -halfW + 0.2, 1.1, -40.4, PAL.stone, false); draw(page8Tex(), 0.3, 0.3, -1, 1.3, -39.4); objects.page8 = new THREE.Vector3(-halfW + 0.2, 1.3, -39.4)
  } else {
    // pillars with painted numbers, bays, parked cars, a blocked ramp, a cooler box of dry ice
    for (let z = -3; z > zEnd + 1; z -= 6) for (const x of [-halfW + 1.2, halfW - 1.2]) { box(0.7, c.height, 0.7, x, c.height / 2, z, 0xc9c8c2); box(0.72, 0.5, 0.72, x, 0.25, z, 0x16161a, false) }
    for (let z = -2; z > zEnd + 2; z -= 3.2) for (const x of [-halfW + 2.4, halfW - 2.4]) box(0.06, 0.01, 2.6, x, 0.006, z, 0xdcdbd5, false)
    for (const z of [-5, -11, -17, -24, -32, -38]) { if (z % 2) add('car', -halfW + 1.9, z, Math.PI / 2 + 0.08); else add(z < -20 ? 'van' : 'car', halfW - 1.9, z, Math.PI / 2 - 0.05) }
    box(1.4, 0.7, 0.9, halfW - 2.3, 0.35, -21, 0xe2e1db); box(1.46, 0.08, 0.96, halfW - 2.3, 0.72, -21, PAL.ink, false); objects.cooler = new THREE.Vector3(halfW - 2.3, 0.9, -21)
    box(halfW * 2 - 3, 0.5, 0.3, 0, 0.25, zEnd + 1.5, 0xc9c8c2)
    draw(towerTex(), 0.7, 1.05, 1, 2.0, -34); draw(veArrowTex(), 0.5, 0.35, -1, 1.6, -14)  // Đài phát seen through a gap; VE mark
  }
}
