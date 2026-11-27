// Sảnh toà nhà (L5): wide white lobby, reception desk with a thermos, a radio and Ve's drawing of Chú Bảy taped up. Procedural only.
import * as THREE from 'three'
import { PAL } from '../render/palette'
import { gritTex } from './corridor'

export const LOBBY = { halfW: 5.5, zNear: 4, zFar: -9.5, height: 3.6 }

export function buildLobby(scene: THREE.Scene) {
  const { halfW, zNear, zFar, height } = LOBBY, len = zNear - zFar, midZ = (zNear + zFar) / 2
  const wallMat = new THREE.MeshLambertMaterial({ map: gritTex(64, 226, 14, 7, 8) }); wallMat.map!.repeat.set(len / 2.4, 1.5)
  const floorMat = new THREE.MeshLambertMaterial({ map: gritTex(32, 176, 26, 13) }); floorMat.map!.repeat.set(halfW * 2 / 0.8, len / 0.8)
  const ceilMat = new THREE.MeshLambertMaterial({ map: gritTex(32, 214, 10, 5) })
  const edgeMat = new THREE.LineBasicMaterial({ color: PAL.ink, transparent: true, opacity: 0.5 })
  const plane = (w: number, h: number, mat: THREE.Material, x: number, y: number, z: number, ry = 0, rx = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); scene.add(m); return m
  }
  plane(halfW * 2, len, floorMat, 0, 0, midZ, 0, -Math.PI / 2)
  plane(halfW * 2, len, ceilMat, 0, height, midZ, 0, Math.PI / 2)
  plane(len, height, wallMat, -halfW, height / 2, midZ, Math.PI / 2); plane(len, height, wallMat, halfW, height / 2, midZ, -Math.PI / 2)
  plane(halfW * 2, height, wallMat, 0, height / 2, zFar)
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: number, edges = true) => {
    const g = new THREE.BoxGeometry(w, h, d), m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color, flatShading: true })); m.position.set(x, y, z); scene.add(m)
    if (edges) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat); e.position.copy(m.position); scene.add(e) }
    return m
  }
  for (const x of [-4, -1.4, 1.4, 4]) box(0.5, height, 0.5, x, height / 2, zFar + 0.4, PAL.paper2)
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  for (const x of [-3.5, 0, 3.5]) for (const z of [-1, -5]) { const l = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 0.6), lightMat); l.position.set(x, height - 0.01, z); scene.add(l) }
  // reception desk behind the duel space
  box(5, 1.1, 0.8, 0, 0.55, zFar + 2.2, PAL.paper2); box(5.2, 0.06, 0.9, 0, 1.12, zFar + 2.2, PAL.stone)
  box(0.12, 0.3, 0.12, -1.6, 1.3, zFar + 2.2, PAL.ink)                        // thermos
  const radio = box(0.4, 0.26, 0.14, 1.5, 1.28, zFar + 2.2, PAL.stone); radio.name = 'radio'
  box(0.26, 0.12, 0.02, 1.5, 1.28, zFar + 2.12, PAL.ink, false)               // speaker slot
  // Ve's drawing of Chú Bảy: paper + a crude figure with a baton, taped on the wall behind the desk
  const cv = document.createElement('canvas'); cv.width = 32; cv.height = 40; const g = cv.getContext('2d')!
  g.fillStyle = '#ECEBE6'; g.fillRect(0, 0, 32, 40); g.fillStyle = '#16161A'
  g.fillRect(13, 6, 6, 6); g.fillRect(15, 12, 2, 14); g.fillRect(11, 26, 3, 9); g.fillRect(18, 26, 3, 9); g.fillRect(17, 14, 9, 2); g.fillStyle = '#E8590C'; g.fillRect(25, 6, 2, 10)
  const tex = new THREE.CanvasTexture(cv); tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace
  plane(0.64, 0.8, new THREE.MeshBasicMaterial({ map: tex }), -0.8, 1.9, zFar + 0.02)
  box(0.5, 0.05, 0.02, -0.8, 2.32, zFar + 0.03, PAL.stone, false)              // tape
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8e8c86, 1.6))
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(0.6, 3, 1); scene.add(key)
  scene.background = new THREE.Color(PAL.paper); scene.fog = new THREE.Fog(PAL.paper, 12, 30)
  return { radio: radio.position.clone() }
}
