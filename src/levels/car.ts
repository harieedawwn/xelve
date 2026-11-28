// White car meshes (one merged geometry per kind + ink edges): the car park, the covers, Đống's body and the thrown cars.
// Local frame: length along x (front = +x), y up, ground at y = 0.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { PAL } from '../render/palette'

export type CarKind = 'car' | 'van' | 'old'
const geoms = new Map<CarKind, { g: THREE.BufferGeometry; e: THREE.BufferGeometry }>()
const box = (w: number, h: number, d: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, d).translate(x, y, z)
const wheel = (x: number, z: number, r: number) => new THREE.CylinderGeometry(r, r, 0.26, 7).rotateX(Math.PI / 2).translate(x, r, z)

function build(kind: CarKind) {
  const parts: THREE.BufferGeometry[] = []
  if (kind === 'van') {
    parts.push(box(4.8, 1.9, 1.9, 0, 1.35, 0), box(0.9, 1.0, 1.84, 2.6, 0.9, 0))
    for (const x of [-1.6, 1.9]) for (const z of [-0.85, 0.85]) parts.push(wheel(x, z, 0.38))
  } else {
    const old = kind === 'old', L = old ? 4.0 : 4.2, cab = old ? 2.0 : 2.3
    parts.push(box(L, 0.7, 1.75, 0, 0.62, 0), box(cab, 0.58, 1.55, old ? -0.2 : -0.3, 1.26, 0))
    for (const x of [-L / 2 + 0.8, L / 2 - 0.8]) for (const z of [-0.8, 0.8]) parts.push(wheel(x, z, 0.33))
  }
  const g = mergeGeometries(parts.map(p => p.toNonIndexed()))!
  g.computeVertexNormals()
  const e = new THREE.EdgesGeometry(g, 25)
  parts.forEach(p => p.dispose())
  return { g, e }
}
const mats = new Map<number, THREE.Material>()
const mat = (c: number) => { let m = mats.get(c); if (!m) mats.set(c, m = new THREE.MeshLambertMaterial({ color: c, flatShading: true })); return m }
export const edgeMat = new THREE.LineBasicMaterial({ color: PAL.ink, transparent: true, opacity: 0.55 })

/** a car group (mesh + edges). colour defaults to the swallowed white; 'old' is the older silver model */
export function makeCar(kind: CarKind = 'car', color: number = PAL.paper) {
  let k = geoms.get(kind); if (!k) geoms.set(kind, k = build(kind))
  const grp = new THREE.Group()
  grp.add(new THREE.Mesh(k.g, mat(color)), new THREE.LineSegments(k.e, edgeMat))
  return grp
}
/** footprint length (m) along local x */
export const CAR_LEN: Record<CarKind, number> = { car: 4.2, van: 5.2, old: 4.0 }
